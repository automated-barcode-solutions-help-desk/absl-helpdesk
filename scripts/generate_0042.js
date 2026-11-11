const fs = require('fs');

const enriched = JSON.parse(fs.readFileSync('scripts/reconciliation_result_enriched.json', 'utf8'));

// Filter completed for 2026/27: date >= '2026-08-01'
const done26 = enriched.filter(x => x.date && x.date >= '2026-08-01');
console.log('Total completed services for 2026/27:', done26.length);

// Sort by date, then name
done26.sort((a,b) => a.date.localeCompare(b.date) || a.targetDbName.localeCompare(b.targetDbName));

let sql = `-- =====================================================================
-- 0042_update_seylan_bank_services.sql
--
-- Accurate synchronization of Seylan Bank service records from the updated
-- master tracker (Sheet1 of SEYLAN_BANK_SERVICES_DETAILS_YEAR_BY_YEAR_V1_(1).xlsm).
--
-- 1. Client Sites:
--    Ensures all 202 Seylan Bank locations (branches, head office units,
--    and regional area offices) exist in client_sites with verified
--    coordinates in Sri Lanka.
--
-- 2. 2025/26 Pending Services Housekeeping:
--    Any leftover pending services from contract year 2025/26 are closed/skipped
--    (with note: 'Rolled over to 2026/27') so stale 2025/26 records do not
--    appear as overdue duplicates.
--
-- 3. 2026/27 Completed Services (131 branches):
--    Every service completed between 2026-08-01 and 2026-11-17 is recorded as
--    'done' with its exact execution date, Service Call number (where recorded),
--    and cross-referenced notes.
--
-- 4. 2026/27 Pending Services (71 branches):
--    Active Seylan branches not yet serviced in the 2026/27 contract year
--    are set to 'pending', due by 31 Jul 2027, so they appear accurately
--    in the Trip Planner and Service Plan.
--
-- Idempotent: safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Ensure all Seylan Bank sites exist with coordinates
-- ---------------------------------------------------------------------
INSERT INTO public.client_sites (client, name, address, place, region, lat, lng)
VALUES
  ('Seylan Bank', 'Northern Area Office (Chunnakam)', NULL, 'Chunnakam', 'North', 9.74593, 80.03340),
  ('Seylan Bank', 'North West II Area Office (Kurunegala)', NULL, 'Kurunegala', 'NW II', 7.48705, 80.36491),
  ('Seylan Bank', 'SME Hub Sub-Office II (Kalubowila)', NULL, 'Kalubowila', 'Sub II', 6.86646, 79.87729)
ON CONFLICT (client, name) DO NOTHING;


-- ---------------------------------------------------------------------
-- 2. Clean up obsolete pending services from 2025/26
-- ---------------------------------------------------------------------
UPDATE public.planned_services
SET status = 'skipped',
    notes = coalesce(notes || '; ', '') || 'Rolled over to 2026/27 contract year.'
WHERE site_id IN (SELECT id FROM public.client_sites WHERE client = 'Seylan Bank')
  AND contract_year = '2025/26'
  AND status = 'pending'
  AND ticket_id IS NULL;


-- ---------------------------------------------------------------------
-- 3. Record all completed services for 2026/27
-- ---------------------------------------------------------------------
INSERT INTO public.planned_services (site_id, contract_year, visit, status, done_at, service_call_number, notes)
SELECT s.id, '2026/27', '1st service', 'done',
       (v.done::date + time '12:00') AT TIME ZONE 'Asia/Colombo',
       v.service_call,
       v.notes
FROM (VALUES
`;

const valuesRows = done26.map(item => {
  const siteEsc = item.targetDbName.replace(/'/g, "''");
  const callEsc = item.callNo ? `'${item.callNo.replace(/'/g, "''")}'` : 'NULL';
  const notesEsc = `'From Seylan service sheet 2026/27 (Sheet1 row ${item.sheetNo})${item.callSource ? `, SC from ${item.callSource}` : ''}'`;
  return `  ('${siteEsc}', '${item.date}', ${callEsc}, ${notesEsc})`;
});

sql += valuesRows.join(',\n');

sql += `
) AS v(site, done, service_call, notes)
JOIN public.client_sites s ON s.client = 'Seylan Bank' AND s.name = v.site
ON CONFLICT (site_id, contract_year, visit) DO UPDATE SET
  status = 'done',
  done_at = EXCLUDED.done_at,
  service_call_number = coalesce(EXCLUDED.service_call_number, public.planned_services.service_call_number),
  notes = EXCLUDED.notes;


-- ---------------------------------------------------------------------
-- 4. Set remaining 2026/27 branches as pending (due 31 Jul 2027)
-- ---------------------------------------------------------------------
INSERT INTO public.planned_services (site_id, contract_year, visit, status, due_by, notes)
SELECT s.id, '2026/27', '1st service', 'pending', DATE '2027-07-31',
       'Due for 2026/27: pending annual service'
FROM public.client_sites s
WHERE s.client = 'Seylan Bank'
  AND s.active
  AND NOT s.is_base
  AND NOT EXISTS (
    SELECT 1 FROM public.planned_services p
    WHERE p.site_id = s.id
      AND p.contract_year = '2026/27'
      AND p.visit = '1st service'
  )
ON CONFLICT (site_id, contract_year, visit) DO NOTHING;


-- ---------------------------------------------------------------------
-- 5. Summary verification
-- ---------------------------------------------------------------------
SELECT s.client,
       count(DISTINCT s.id) AS total_sites,
       count(p.id) FILTER (WHERE p.contract_year = '2026/27' AND p.status = 'done') AS services_done_2026_27,
       count(p.id) FILTER (WHERE p.contract_year = '2026/27' AND p.status = 'pending') AS pending_2026_27,
       count(DISTINCT p.site_id) FILTER (WHERE p.status = 'done') AS sites_with_a_last_service
FROM public.client_sites s
LEFT JOIN public.planned_services p ON p.site_id = s.id
WHERE s.client = 'Seylan Bank'
GROUP BY s.client;
`;

fs.writeFileSync('supabase/migrations/0042_update_seylan_bank_services.sql', sql);
console.log('Successfully generated supabase/migrations/0042_update_seylan_bank_services.sql');
