alter table public.approval_requests
add column if not exists requested_role public.user_role not null default 'customer';

create unique index if not exists approval_requests_profile_id_key
on public.approval_requests(profile_id);

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.profiles
      where id = auth.uid()
        and approval_status = 'approved'
    ),
    'customer'::public.user_role
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_domain text;
  matched_company_id uuid;
  requested_company_name text;
  requested_role public.user_role;
  approval public.approval_status;
begin
  email_domain := lower(split_part(new.email, '@', 2));
  requested_company_name := nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), '');
  requested_company_name := coalesce(requested_company_name, 'Customer Company');

  requested_role := case lower(coalesce(new.raw_user_meta_data->>'requested_role', 'customer'))
    when 'agent' then 'agent'::public.user_role
    when 'technician' then 'technician'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'customer'::public.user_role
  end;

  select company_id into matched_company_id
  from public.company_domains
  where domain = email_domain
    and auto_approve = true
  limit 1;

  if matched_company_id is null then
    insert into public.companies(name)
    values (requested_company_name)
    on conflict (name) do nothing;

    select id into matched_company_id
    from public.companies
    where name = requested_company_name
    limit 1;
  end if;

  if requested_role = 'customer' then
    approval := 'approved';
  elsif email_domain = 'automatedbarcode.net' and requested_role in ('agent', 'technician') then
    approval := 'approved';
  else
    approval := 'pending';
  end if;

  insert into public.profiles (
    id,
    company_id,
    full_name,
    email,
    role,
    approval_status
  )
  values (
    new.id,
    matched_company_id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    new.email,
    requested_role,
    approval
  )
  on conflict (id) do update
  set company_id = excluded.company_id,
      full_name = excluded.full_name,
      email = excluded.email,
      role = excluded.role,
      approval_status = excluded.approval_status,
      updated_at = now();

  if approval = 'pending' then
    insert into public.approval_requests(profile_id, company_name, requested_email, requested_role)
    values (new.id, requested_company_name, new.email, requested_role)
    on conflict (profile_id) do update
    set company_name = excluded.company_name,
        requested_email = excluded.requested_email,
        requested_role = excluded.requested_role,
        status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and public.current_role() <> 'admin' then
    if new.role is distinct from old.role
      or new.approval_status is distinct from old.approval_status
      or new.company_id is distinct from old.company_id then
      raise exception 'Only an admin can change account role, approval, or company.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();
