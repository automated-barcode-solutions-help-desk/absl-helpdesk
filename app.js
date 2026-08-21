const supabaseConfig = window.ABSL_SUPABASE || {};
const hasSupabaseConfig = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
const supabaseClient =
  hasSupabaseConfig && window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;

let currentUser = null;
let currentProfile = null;
let ticketChannel = null;

const publicRoutes = ["login", "register"];
const dashboardRoutes = ["customer", "agent", "technician", "admin"];
const storageKey = "absl-helpdesk-state";
const legacyStorageKey = "absl-helpdesk-demo";

const initialState = {
  role: "customer",
  selectedTicketId: "",
  company: {
    id: "ABSL-COMPANY",
    name: "Automated Barcode Solutions Pvt Ltd",
    domain: "automatedbarcode.net",
    accountLimit: 10
  },
  tickets: [],
  comments: [],
  inventory: [],
  technicians: [],
  approvals: [],
  notifications: []
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
  if (!saved) return structuredClone(initialState);

  try {
    return { ...structuredClone(initialState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function localId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[char];
  });
}

function normalizePriority(priority) {
  const value = String(priority || "medium").toLowerCase();
  if (value === "high") return "High";
  if (value === "low") return "Low";
  return "Medium";
}

function technicianNameById(technicianId) {
  if (!technicianId || technicianId === "Unassigned") return "Unassigned";
  const technician = state.technicians.find((item) => item.id === technicianId);
  return technician?.name || technicianId;
}

function ticketTechnicianName(ticket) {
  return technicianNameById(ticket?.assignedTechnicianId || ticket?.assignedTechnician);
}

async function createRecord(table, values, options = {}) {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from(table)
    .insert(values)
    .select(options.select || "*")
    .single();

  if (error) {
    alert(error.message);
    return null;
  }

  return data;
}

async function updateRecord(table, id, values) {
  if (!supabaseClient || !isUuid(id)) return true;

  const { error } = await supabaseClient.from(table).update(values).eq("id", id);

  if (error) {
    alert(error.message);
    return false;
  }

  return true;
}

async function removeRecord(table, id) {
  if (!supabaseClient || !isUuid(id)) return true;

  const { error } = await supabaseClient.from(table).delete().eq("id", id);

  if (error) {
    alert(error.message);
    return false;
  }

  return true;
}

function removeLocalRecord(collectionName, id) {
  state[collectionName] = state[collectionName].filter((item) => item.id !== id);
}

function statusLabel(status) {
  return String(status || "new")
    .replace("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusBadge(status) {
  const map = {
    new: "badge-new",
    in_progress: "badge-progress",
    resolved: "badge-resolved",
    closed: "badge-closed"
  };
  return `<span class="badge ${map[status] || "badge-muted"}">${statusLabel(status)}</span>`;
}

function selectedTicket() {
  return state.tickets.find((ticket) => ticket.id === state.selectedTicketId) || state.tickets[0] || null;
}

function ticketComments(ticketId) {
  return state.comments.filter((comment) => comment.ticketId === ticketId);
}

function currentCompany() {
  if (!state.company) {
    state.company = structuredClone(initialState.company);
  }
  if (!state.company.domain) {
    state.company.domain = initialState.company.domain;
  }
  return state.company;
}

function currentRoute() {
  const pageName = window.location.pathname.split("/").pop().replace(".html", "");
  if (publicRoutes.includes(pageName) || dashboardRoutes.includes(pageName)) {
    return pageName;
  }

  const route = window.location.hash.replace(/^#\/?/, "");
  return route || null;
}

function userRole() {
  return currentProfile?.role || state.role || "customer";
}

function dashboardRouteForRole(role = userRole()) {
  return dashboardRoutes.includes(role) ? role : "customer";
}

function allowedDashboardRoutes() {
  if (!currentUser) return [];
  const role = dashboardRouteForRole();
  return role === "admin" ? dashboardRoutes : [role];
}

function canAccessRoute(route) {
  if (publicRoutes.includes(route)) return true;
  if (!dashboardRoutes.includes(route) || !currentUser) return false;
  return allowedDashboardRoutes().includes(route);
}

function navigateTo(route) {
  if (currentRoute() === route) {
    render();
    return;
  }
  window.location.href = `${route}.html`;
}

function routeLabel(route) {
  const labels = {
    login: "Login",
    register: "Register",
    customer: "Customer Portal",
    agent: "Agent Queue",
    technician: "Technician Jobs",
    admin: "Admin Console"
  };
  return labels[route] || "Page";
}

function pageHeading(title, description) {
  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">ABSL Helpdesk</p>
        <h2>${title}</h2>
        <p class="muted">${description}</p>
      </div>
    </section>
  `;
}

async function loadCurrentUser() {
  if (!supabaseClient) return null;

  const { data } = await supabaseClient.auth.getUser();
  currentUser = data.user;

  if (!currentUser) {
    currentProfile = null;
    return null;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  return currentUser;
}

async function getLoggedInProfile() {
  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return null;
  }

  if (!currentUser || !currentProfile) {
    await loadCurrentUser();
  }

  if (!currentUser) {
    alert("Please login first.");
    return null;
  }

  if (!currentProfile) {
    alert("Profile not found. Please register first.");
    return null;
  }

  if (currentProfile.approval_status !== "approved") {
    alert("Your account is waiting for admin approval.");
    return null;
  }

  return currentProfile;
}

async function signUpUser(event) {
  event.preventDefault();
  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return;
  }

  const form = new FormData(event.target);
  const email = form.get("email");
  const password = form.get("password");
  const fullName = form.get("fullName");
  const companyName = form.get("companyName");

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName
      }
    }
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Registration created. Please verify your email.");
  event.target.reset();
  navigateTo("login");
}

async function signInUser(event) {
  event.preventDefault();
  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return;
  }

  const form = new FormData(event.target);
  const email = form.get("email");
  const password = form.get("password");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  await loadCurrentUser();
  subscribeToTicketUpdates();
  await loadRealSupportData({ shouldRender: false });
  state.role = dashboardRouteForRole();
  saveState();
  alert("Login successful.");
  navigateTo(state.role);
}

async function signOutUser() {
  if (!supabaseClient) return;
  if (ticketChannel) {
    supabaseClient.removeChannel(ticketChannel);
    ticketChannel = null;
  }
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  navigateTo("login");
}

function setRole(role) {
  state.role = role;
  saveState();
  navigateTo(role);
}

function openTicket(ticketId) {
  state.selectedTicketId = ticketId;
  saveState();
  render();
}

async function changeRealTicketStatus(ticketId, newStatus, expectedVersion) {
  if (!supabaseClient) return false;

  const { error } = await supabaseClient.rpc("change_ticket_status", {
    p_ticket_id: ticketId,
    p_new_status: newStatus,
    p_expected_version: expectedVersion
  });

  if (error) {
    alert(error.message);
    return false;
  }

  return true;
}

async function updateTicketStatus(ticketId, status) {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  if (supabaseClient && isUuid(ticket.id)) {
    const ok = await changeRealTicketStatus(ticket.id, status, ticket.version);
    if (!ok) return;
  }

  ticket.status = status;
  ticket.version += 1;
  state.notifications.unshift({
    id: localId("NTF"),
    subject: `Ticket ${ticket.number} changed to ${statusLabel(status)}`,
    channel: "email",
    status: "pending",
    attempts: 0
  });
  saveState();
  render();
}

async function updateApproval(profileId, status) {
  const updated = await updateRecord("profiles", profileId, { approval_status: status });
  if (!updated) return false;

  alert(`User ${status}.`);
  return true;
}

async function approveUser(approvalId, status) {
  const updated = await updateApproval(approvalId, status);
  if (!updated) return;

  if (supabaseClient && isUuid(approvalId)) {
    const { error } = await supabaseClient
      .from("approval_requests")
      .update({
        status,
        reviewed_by: currentProfile?.id || null,
        reviewed_at: new Date().toISOString()
      })
      .eq("profile_id", approvalId);

    if (error) {
      alert(error.message);
      return;
    }
  }

  const approval = state.approvals.find((item) => item.id === approvalId);
  if (approval) approval.status = status;

  saveState();
  render();
}

async function retryNotification(id) {
  const notification = state.notifications.find((item) => item.id === id);
  if (!notification) return;

  if (supabaseClient && isUuid(id)) {
    const updated = await updateRecord("notifications", id, {
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      error_message: null
    });
    if (!updated) return;
  }

  notification.status = "pending";
  saveState();
  render();
}

async function assignTechnician(ticketId, technicianId) {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  const technicianName = technicianNameById(technicianId);

  if (supabaseClient && isUuid(ticketId) && isUuid(technicianId)) {
    const { error } = await supabaseClient
      .from("tickets")
      .update({ assigned_technician_id: technicianId })
      .eq("id", ticketId);

    if (error) {
      alert(error.message);
      return;
    }
  }

  ticket.assignedTechnician = technicianName;
  ticket.assignedTechnicianId = technicianId || "";
  state.comments.push({
    id: localId("CMT"),
    ticketId: ticket.id,
    author: "Agent",
    body: `Technician assigned: ${technicianName}.`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  saveState();
  render();
  alert("Technician assigned.");
}

async function consumeRealInventory(ticketId, inventoryItemId, quantity) {
  if (!supabaseClient) return false;

  const { error } = await supabaseClient.rpc("consume_inventory", {
    p_ticket_id: ticketId,
    p_inventory_item_id: inventoryItemId,
    p_quantity: quantity
  });

  if (error) {
    alert(error.message);
    return false;
  }

  alert("Inventory used successfully.");
  return true;
}

async function useInventory(itemId) {
  const item = state.inventory.find((part) => part.id === itemId);
  if (!item || item.qty <= 0) return;

  const ticket = selectedTicket();
  if (!ticket) return;

  if (supabaseClient && isUuid(ticket.id) && isUuid(itemId)) {
    const ok = await consumeRealInventory(ticket.id, itemId, 1);
    if (!ok) return;
  }

  item.qty -= 1;
  state.comments.push({
    id: localId("CMT"),
    ticketId: ticket.id,
    author: "Technician",
    body: `Used 1 item: ${item.name}. Remaining stock: ${item.qty}.`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  saveState();
  render();
}

async function createRealTicket(ticket) {
  const profile = await getLoggedInProfile();
  if (!profile) return null;

  const data = await createRecord("tickets", {
    company_id: profile.company_id,
    created_by: profile.id,
    title: ticket.title,
    description: ticket.description || ticket.title,
    priority: normalizePriority(ticket.priority).toLowerCase(),
    location_name: ticket.location,
    wants_callback: ticket.callback
  });

  if (!data) return null;
  alert(`Ticket created: ${data.ticket_number}`);
  return data;
}

async function uploadAttachment(ticketId, file, bucketName, fileType) {
  if (!file || file.size === 0) return null;

  const profile = await getLoggedInProfile();
  if (!profile) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${ticketId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucketName)
    .upload(filePath, file);

  if (uploadError) {
    alert(uploadError.message);
    return null;
  }

  const { error: dbError } = await supabaseClient.from("ticket_attachments").insert({
    ticket_id: ticketId,
    uploaded_by: profile.id,
    bucket_name: bucketName,
    file_path: filePath,
    file_type: fileType
  });

  if (dbError) {
    alert(dbError.message);
    return null;
  }

  return filePath;
}

async function createTicket(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const photoFile = data.get("photo");
  const voiceFile = data.get("voice");
  const nextNumber = String(state.tickets.length + 1).padStart(6, "0");
  const ticket = {
    id: localId("TCK"),
    number: `ABSL-${new Date().getFullYear()}-${nextNumber}`,
    title: data.get("title"),
    customer: data.get("customer"),
    company: data.get("company"),
    status: "new",
    priority: normalizePriority(data.get("priority")),
    location: data.get("location"),
    callback: data.get("callback") === "on",
    version: 1,
    assignedAgent: "Unassigned",
    assignedTechnician: "Unassigned",
    assignedTechnicianId: "",
    createdAt: new Date().toLocaleString()
  };

  if (supabaseClient) {
    const realTicket = await createRealTicket(ticket);
    if (!realTicket) return;

    ticket.id = realTicket.id;
    ticket.number = realTicket.ticket_number;

    if (photoFile && photoFile.size > 0) {
      await uploadAttachment(realTicket.id, photoFile, "ticket-photos", "photo");
    }

    if (voiceFile && voiceFile.size > 0) {
      await uploadAttachment(realTicket.id, voiceFile, "ticket-voice-notes", "voice");
    }
  }

  state.tickets.unshift(ticket);
  state.selectedTicketId = ticket.id;
  state.notifications.unshift({
    id: localId("NTF"),
    subject: `New ticket ${ticket.number}`,
    channel: "email",
    status: "pending",
    attempts: 0
  });
  saveState();
  event.target.reset();
  render();
}

async function updateTicketDetails(event, ticketId) {
  event.preventDefault();
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  const data = new FormData(event.target);
  const values = {
    title: String(data.get("title") || "").trim(),
    priority: normalizePriority(data.get("priority")),
    location: String(data.get("location") || "").trim(),
    callback: data.get("callback") === "on"
  };

  if (!values.title) {
    alert("Ticket title is required.");
    return;
  }

  const updated = await updateRecord("tickets", ticketId, {
    title: values.title,
    priority: normalizePriority(values.priority).toLowerCase(),
    location_name: values.location,
    wants_callback: values.callback
  });

  if (!updated) return;

  Object.assign(ticket, values);
  ticket.version += 1;
  saveState();
  render();
  alert("Ticket updated.");
}

async function deleteTicket(ticketId) {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  const confirmed = window.confirm(`Delete ticket ${ticket.number}? This cannot be undone.`);
  if (!confirmed) return;

  const removed = await removeRecord("tickets", ticketId);
  if (!removed) return;

  removeLocalRecord("tickets", ticketId);
  state.comments = state.comments.filter((comment) => comment.ticketId !== ticketId);
  state.selectedTicketId = state.tickets[0]?.id || "";
  saveState();
  render();
}

async function addRealComment(ticketId, body) {
  if (!supabaseClient || !isUuid(ticketId)) return true;

  const profile = await getLoggedInProfile();
  if (!profile) return false;

  const { error } = await supabaseClient.from("ticket_comments").insert({
    ticket_id: ticketId,
    author_id: profile.id,
    body
  });

  if (error) {
    alert(error.message);
    return false;
  }

  return true;
}

async function addComment(event, ticketId) {
  event.preventDefault();
  const data = new FormData(event.target);
  const body = data.get("comment");
  if (!body.trim()) return;

  const saved = await addRealComment(ticketId, body);
  if (!saved) return;

  state.comments.push({
    id: localId("CMT"),
    ticketId,
    author: statusAuthor(),
    body,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  saveState();
  event.target.reset();
  render();
}

async function deleteComment(commentId) {
  const comment = state.comments.find((item) => item.id === commentId);
  if (!comment) return;

  const confirmed = window.confirm("Delete this comment?");
  if (!confirmed) return;

  const removed = await removeRecord("ticket_comments", commentId);
  if (!removed) return;

  removeLocalRecord("comments", commentId);
  saveState();
  render();
}

async function loadRealTickets(options = {}) {
  const shouldRender = options?.shouldRender !== false;

  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  state.tickets = data.map((ticket) => ({
    id: ticket.id,
    number: ticket.ticket_number,
    title: ticket.title,
    customer: "Customer",
    company: "Company",
    status: ticket.status,
    priority: normalizePriority(ticket.priority),
    location: ticket.location_name || "",
    callback: ticket.wants_callback,
    version: ticket.version,
    assignedAgent: ticket.assigned_agent_id || "Unassigned",
    assignedTechnician: technicianNameById(ticket.assigned_technician_id),
    assignedTechnicianId: ticket.assigned_technician_id || "",
    createdAt: ticket.created_at
  }));

  if (state.tickets.length > 0) {
    state.selectedTicketId = state.tickets[0].id;
  }

  saveState();
  if (shouldRender) render();
}

async function loadRealComments() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("ticket_comments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  state.comments = (data || []).map((comment) => ({
    id: comment.id,
    ticketId: comment.ticket_id,
    author: comment.author_id === currentProfile?.id ? "You" : "Team member",
    body: comment.body,
    createdAt: new Date(comment.created_at).toLocaleString()
  }));
}

async function loadRealTechnicians() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "technician")
    .eq("approval_status", "approved")
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  state.technicians = (data || []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || profile.email
  }));
}

async function loadRealInventory() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("inventory_items")
    .select("id, sku, name, category, quantity_on_hand, reorder_level")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  state.inventory = (data || []).map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    qty: item.quantity_on_hand,
    reorderLevel: item.reorder_level
  }));
}

async function loadRealApprovals() {
  if (!supabaseClient || userRole() !== "admin") return;

  const { data, error } = await supabaseClient
    .from("approval_requests")
    .select("profile_id, company_name, requested_email, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  state.approvals = (data || []).map((request) => ({
    id: request.profile_id,
    name: request.requested_email,
    email: request.requested_email,
    company: request.company_name,
    status: request.status
  }));
}

async function loadRealNotifications() {
  if (!supabaseClient || userRole() !== "admin") return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("id, channel, subject, status, attempts, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return;
  }

  state.notifications = (data || []).map((notification) => ({
    id: notification.id,
    subject: notification.subject,
    channel: notification.channel,
    status: notification.status,
    attempts: notification.attempts
  }));
}

async function loadRealSupportData(options = {}) {
  const shouldRender = options?.shouldRender !== false;

  if (!supabaseClient) {
    if (shouldRender) alert("Supabase is not configured.");
    return;
  }

  await loadRealTickets({ shouldRender: false });
  await Promise.all([
    loadRealComments(),
    loadRealTechnicians(),
    loadRealInventory(),
    loadRealApprovals(),
    loadRealNotifications()
  ]);

  saveState();
  if (shouldRender) render();
}

function subscribeToTicketUpdates() {
  if (!supabaseClient) return;

  if (ticketChannel) {
    supabaseClient.removeChannel(ticketChannel);
  }

  ticketChannel = supabaseClient
    .channel("ticket-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tickets" },
      async () => {
        await loadRealSupportData({ shouldRender: false });
        render();
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ticket_comments" },
      async () => {
        await loadRealSupportData({ shouldRender: false });
        render();
      }
    )
    .subscribe();
}

async function updateCompanyLimit(companyId, newLimit) {
  if (!Number.isInteger(newLimit) || newLimit < 1) {
    alert("Enter a valid account limit.");
    return false;
  }

  const updated = await updateRecord("companies", companyId, { account_limit: newLimit });
  if (!updated) return false;

  alert("Company account limit updated.");
  return true;
}

async function handleCompanyLimitUpdate() {
  const company = currentCompany();
  const input = document.querySelector("#companyLimitInput");
  const newLimit = Number.parseInt(input.value, 10);
  const updated = await updateCompanyLimit(company.id, newLimit);

  if (!updated) return;

  company.accountLimit = newLimit;
  saveState();
  render();
}

function statusAuthor() {
  const names = {
    customer: "Customer",
    agent: "Agent",
    technician: "Technician",
    admin: "Admin"
  };
  return names[state.role];
}

function stats() {
  return {
    open: state.tickets.filter((ticket) => ticket.status !== "closed").length,
    pendingApproval: state.approvals.filter((approval) => approval.status === "pending").length,
    lowStock: state.inventory.filter((item) => item.qty <= 5).length
  };
}

function renderStats() {
  const data = stats();
  return `
    <section class="dashboard-grid">
      <article class="stat-card"><span class="muted">Open tickets</span><strong>${data.open}</strong></article>
      <article class="stat-card"><span class="muted">Pending approvals</span><strong>${data.pendingApproval}</strong></article>
      <article class="stat-card"><span class="muted">Low stock items</span><strong>${data.lowStock}</strong></article>
    </section>
  `;
}

function renderTicketList(tickets = state.tickets) {
  if (!tickets.length) {
    return `<div class="empty-state">No tickets found.</div>`;
  }

  const canDeleteTicket = ["agent", "admin"].includes(state.role);

  return `
    <div class="ticket-list">
      ${tickets
        .map((ticket) => {
          const safeId = escapeHtml(ticket.id);
          const safeTitle = escapeHtml(ticket.title);
          const safeNumber = escapeHtml(ticket.number);
          const safePriority = escapeHtml(normalizePriority(ticket.priority));
          const safeCompany = escapeHtml(ticket.company || "Company");
          const safeLocation = escapeHtml(ticket.location || "No location provided");

          return `
          <article class="ticket-card">
            <div>
              <h3>${safeTitle}</h3>
              <div class="ticket-meta">
                <span class="badge badge-muted">${safeNumber}</span>
                ${statusBadge(ticket.status)}
                <span class="badge badge-muted">${safePriority}</span>
                ${ticket.callback ? `<span class="badge badge-ok">Callback</span>` : ""}
              </div>
              <p class="small muted">${safeCompany} - ${safeLocation}</p>
            </div>
            <div class="ticket-card-actions">
              <button class="secondary-button" type="button" data-open-ticket="${safeId}">Open</button>
              ${
                canDeleteTicket
                  ? `<button class="danger-button" type="button" data-delete-ticket="${safeId}">Delete</button>`
                  : ""
              }
            </div>
          </article>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderTicketDetail(ticket) {
  if (!ticket) {
    return `<section class="panel"><div class="empty-state">No ticket selected.</div></section>`;
  }

  const comments = ticketComments(ticket.id);
  const canDeleteContent = ["agent", "admin"].includes(state.role);
  const safeTicketId = escapeHtml(ticket.id);
  const safeTitle = escapeHtml(ticket.title);
  const safeNumber = escapeHtml(ticket.number);
  const safeLocation = escapeHtml(ticket.location || "");
  const safeCustomer = escapeHtml(ticket.customer || "Customer");
  const safeCompany = escapeHtml(ticket.company || "Company");
  const priority = normalizePriority(ticket.priority);
  const selectedTechnicianId =
    ticket.assignedTechnicianId || state.technicians.find((item) => item.name === ticket.assignedTechnician)?.id || "";
  const safeAssignedTechnician = escapeHtml(ticketTechnicianName(ticket));

  return `
    <section class="detail-grid">
      <article class="panel">
        <div class="panel-title">
          <div>
            <h2>${safeTitle}</h2>
            <p class="muted">${safeNumber} - version ${ticket.version}</p>
          </div>
          ${statusBadge(ticket.status)}
        </div>

        <form class="form-grid update-ticket-form" data-ticket-update-form="${safeTicketId}">
          <div class="field">
            <label for="edit-title-${safeTicketId}">Update problem</label>
            <input id="edit-title-${safeTicketId}" name="title" value="${safeTitle}" required />
          </div>
          <div class="field">
            <label for="edit-priority-${safeTicketId}">Priority</label>
            <select id="edit-priority-${safeTicketId}" name="priority">
              <option ${priority === "High" ? "selected" : ""}>High</option>
              <option ${priority === "Medium" ? "selected" : ""}>Medium</option>
              <option ${priority === "Low" ? "selected" : ""}>Low</option>
            </select>
          </div>
          <div class="field">
            <label for="edit-location-${safeTicketId}">Location</label>
            <input id="edit-location-${safeTicketId}" name="location" value="${safeLocation}" />
          </div>
          <label class="field inline-check">
            <span>Needs callback</span>
            <input type="checkbox" name="callback" ${ticket.callback ? "checked" : ""} />
          </label>
          <div class="action-row">
            <button class="primary-button" type="submit">Update Ticket</button>
            ${
              canDeleteContent
                ? `<button class="danger-button" type="button" data-delete-ticket="${safeTicketId}">Delete Ticket</button>`
                : ""
            }
          </div>
        </form>

        <hr />

        <div class="dashboard-grid">
          <div><strong>Customer</strong><p class="muted">${safeCustomer}</p></div>
          <div><strong>Company</strong><p class="muted">${safeCompany}</p></div>
          <div><strong>Location</strong><p class="muted">${safeLocation || "Not provided"}</p></div>
        </div>

        <div class="action-row">
          <button class="secondary-button" type="button" data-map-ticket="${safeTicketId}">Location</button>
          <span class="badge badge-muted">Photos and voice notes are stored with the ticket</span>
          ${ticket.callback ? `<span class="badge badge-ok">Callback requested</span>` : ""}
        </div>

        <hr />

        <h3>Comment Thread</h3>
        <div>
          ${
            comments.length
              ? comments
            .map(
              (comment) => {
                const safeCommentId = escapeHtml(comment.id);
                return `
              <div class="comment">
                <div class="comment-header">
                  <strong>${escapeHtml(comment.author)}</strong>
                  ${
                    canDeleteContent && comment.id
                      ? `<button class="danger-button compact-button" type="button" data-delete-comment="${safeCommentId}">Delete</button>`
                      : ""
                  }
                </div>
                <p>${escapeHtml(comment.body)}</p>
                <span class="small muted">${escapeHtml(comment.createdAt)}</span>
              </div>
            `;
              }
            )
            .join("")
              : `<div class="empty-state">No comments yet.</div>`
          }
        </div>

        <form class="action-row" data-comment-form="${safeTicketId}">
          <input name="comment" aria-label="Comment" placeholder="Write a reply..." />
          <button class="primary-button" type="submit">Send</button>
        </form>
      </article>

      <aside class="panel">
        <h3>Status</h3>
        <p class="muted small">Use the expected version in Supabase to prevent two agents overwriting each other.</p>
        <div class="action-row">
          <button class="secondary-button" type="button" data-status="new" data-ticket="${safeTicketId}">New</button>
          <button class="secondary-button" type="button" data-status="in_progress" data-ticket="${safeTicketId}">In Progress</button>
          <button class="secondary-button" type="button" data-status="resolved" data-ticket="${safeTicketId}">Resolved</button>
          <button class="secondary-button" type="button" data-status="closed" data-ticket="${safeTicketId}">Closed</button>
        </div>

        <hr />

        <h3>Technician</h3>
        <div class="field">
          <label for="technician-${safeTicketId}">Assign technician</label>
          <select id="technician-${safeTicketId}" data-technician-select="${safeTicketId}">
            <option value="">Unassigned</option>
            ${state.technicians
              .map(
                (technician) => `
                  <option value="${escapeHtml(technician.id)}" ${
                    technician.id === selectedTechnicianId ? "selected" : ""
                  }>${escapeHtml(technician.name)}</option>
                `
              )
              .join("")}
          </select>
          ${
            state.technicians.length
              ? ""
              : `<p class="small muted">No approved technician profiles found yet.</p>`
          }
        </div>
        <button class="primary-button" type="button" data-assign-technician="${safeTicketId}" ${
          state.technicians.length ? "" : "disabled"
        }>Assign</button>

        <hr />

        <h3>Timeline</h3>
        <ul class="timeline">
          <li>Created by ${safeCustomer}</li>
          <li>Assigned agent: ${escapeHtml(ticket.assignedAgent)}</li>
          <li>Assigned technician: ${safeAssignedTechnician}</li>
          <li>Current status: ${statusLabel(ticket.status)}</li>
        </ul>
      </aside>
    </section>
  `;
}

function loginPage(message = "") {
  return `
    <section class="auth-page">
      <form class="panel auth-card" id="loginForm">
        <p class="auth-kicker">Secure helpdesk access</p>
        <h2>Login</h2>
        ${message ? `<div class="notice">${message}</div>` : ""}
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input name="password" type="password" required />
        </div>
        <button class="primary-button" type="submit">Login</button>
        <p class="auth-switch">New customer? <a href="register.html">Create an account</a></p>
      </form>
    </section>
  `;
}

function registerPage() {
  const company = currentCompany();

  return `
    <section class="auth-page">
      <form class="panel auth-card" id="registerForm">
        <p class="auth-kicker">Customer onboarding</p>
        <h2>Register</h2>
        <p class="muted">Company emails ending with @${company.domain} are auto-approved. Personal emails go to admin review.</p>
        <div class="field">
          <label>Full name</label>
          <input name="fullName" required />
        </div>
        <div class="field">
          <label>Company name</label>
          <input name="companyName" required />
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input name="password" type="password" minlength="6" required />
        </div>
        <button class="primary-button" type="submit">Create Account</button>
        <p class="auth-switch">Already registered? <a href="login.html">Login here</a></p>
      </form>
    </section>
  `;
}

function pendingApprovalPage() {
  return `
    <section class="auth-page">
      <article class="panel auth-card">
        <p class="auth-kicker">Account pending</p>
        <h2>Waiting for admin approval</h2>
        <p class="muted">Your account exists, but an ABSL admin must approve it before you can open the dashboard.</p>
        <button class="secondary-button" type="button" id="signOutBtn">Sign Out</button>
      </article>
    </section>
  `;
}

function customerView() {
  const customerName = currentProfile?.full_name || currentUser?.email || "";

  return `
    <section class="hero-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>Create New Ticket</h2>
          <span class="badge badge-muted">Photo + voice ready</span>
        </div>
        <form id="newTicketForm">
          <div class="form-grid">
            <div class="field">
              <label for="customer">Customer name</label>
              <input id="customer" name="customer" value="${escapeHtml(customerName)}" placeholder="Your name" required />
            </div>
            <div class="field">
              <label for="company">Company</label>
              <input id="company" name="company" placeholder="Customer company name" required />
            </div>
          </div>
          <div class="field">
            <label for="title">Problem</label>
            <input id="title" name="title" placeholder="Example: scanner not reading barcodes" required />
          </div>
          <div class="field">
            <label for="photo">Photo</label>
            <input id="photo" name="photo" type="file" accept="image/png,image/jpeg" />
          </div>
          <div class="field">
            <label for="voice">Voice note</label>
            <input id="voice" name="voice" type="file" accept="audio/*" />
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="priority">Priority</label>
              <select id="priority" name="priority">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div class="field">
              <label for="location">Location</label>
              <input id="location" name="location" placeholder="Customer site location" />
            </div>
          </div>
          <label class="field">
            <span>Need phone callback?</span>
            <input type="checkbox" name="callback" />
          </label>
          <div class="action-row">
            <button class="primary-button" type="submit">Submit Ticket</button>
          </div>
        </form>
      </div>
      <div class="panel">
        <h2>My Tickets</h2>
        ${renderTicketList(state.tickets)}
      </div>
    </section>
    <br />
    ${renderTicketDetail(selectedTicket())}
  `;
}

function agentView() {
  return `
    ${renderStats()}
    <br />
    <section class="hero-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>Agent Ticket Queue</h2>
          <button class="secondary-button" type="button" id="loadRealTicketsBtn">Refresh Tickets</button>
        </div>
        ${renderTicketList(state.tickets)}
      </div>
      <div class="panel">
        <h2>Agent Rules</h2>
        <p class="muted">Open tickets, review attachments, comment to customer, update status, or assign technician.</p>
        <div class="notice">Conflict protection is handled in the database with ticket version checks.</div>
      </div>
    </section>
    <br />
    ${renderTicketDetail(selectedTicket())}
  `;
}

function technicianView() {
  const assigned = state.tickets.filter(
    (ticket) => ticket.assignedTechnicianId || ticket.assignedTechnician !== "Unassigned"
  );
  return `
    ${renderStats()}
    <br />
    <section class="hero-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>Technician Jobs</h2>
          <span class="badge badge-muted">Assignment + reassignment</span>
        </div>
        ${renderTicketList(assigned)}
      </div>
      <div class="panel">
        <h2>Parts Inventory</h2>
        ${
          state.inventory.length
            ? state.inventory
                .map(
                  (item) => `
            <div class="inventory-row">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <p class="small muted">${escapeHtml(item.sku)} - ${escapeHtml(item.category)} - Stock: ${item.qty}</p>
              </div>
              <button class="primary-button" type="button" data-use-part="${escapeHtml(item.id)}" ${
                    item.qty <= 0 ? "disabled" : ""
                  }>Work</button>
            </div>
          `
                )
                .join("")
            : `<div class="empty-state">No inventory items found. Add inventory in Supabase before using parts.</div>`
        }
      </div>
    </section>
    <br />
    ${renderTicketDetail(selectedTicket())}
  `;
}

function adminView() {
  const company = currentCompany();

  return `
    ${renderStats()}
    <br />
    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-title">
          <h2>User Approvals</h2>
          <span class="badge badge-muted">Personal email review</span>
        </div>
        ${
          state.approvals.length
            ? state.approvals
                .map(
                  (approval) => `
            <div class="inventory-row">
              <div>
                <strong>${escapeHtml(approval.name)}</strong>
                <p class="small muted">${escapeHtml(approval.email)} - ${escapeHtml(approval.company)}</p>
                <span class="badge ${approval.status === "approved" ? "badge-ok" : "badge-muted"}">${approval.status}</span>
              </div>
              <div class="action-row">
                <button class="primary-button" type="button" data-approve="${escapeHtml(approval.id)}">Approve</button>
                <button class="danger-button" type="button" data-reject="${escapeHtml(approval.id)}">Reject</button>
              </div>
            </div>
          `
                )
                .join("")
            : `<div class="empty-state">No approval requests are waiting.</div>`
        }
      </article>

      <article class="panel">
        <h2>Company Limit</h2>
        <p class="muted">When a company reaches the account limit, admin can increase or reject the request.</p>
        <div class="notice">${company.name} current customer limit: ${company.accountLimit} users.</div>
        <div class="field">
          <label for="companyLimitInput">New account limit</label>
          <input id="companyLimitInput" type="number" min="1" value="${company.accountLimit}" />
        </div>
        <div class="action-row">
          <button class="primary-button" type="button" id="updateCompanyLimitBtn">Update Limit</button>
        </div>
      </article>

      <article class="panel">
        <h2>Notifications</h2>
        ${
          state.notifications.length
            ? state.notifications
                .map(
                  (notification) => `
            <div class="inventory-row">
              <div>
                <strong>${escapeHtml(notification.subject)}</strong>
                <p class="small muted">${escapeHtml(notification.channel)} - attempts: ${notification.attempts}</p>
                <span class="badge ${notification.status === "dead_letter" ? "badge-danger" : "badge-muted"}">${notification.status}</span>
              </div>
              <button class="secondary-button" type="button" data-retry="${escapeHtml(notification.id)}">Retry</button>
            </div>
          `
                )
                .join("")
            : `<div class="empty-state">No notifications are queued.</div>`
        }
      </article>
    </section>
    <br />
    <section class="panel">
      <div class="panel-title">
        <h2>Inventory CSV Cleanup</h2>
        <span class="badge badge-muted">Migration ready</span>
      </div>
      <p class="muted">Use the script in scripts/import_inventory_csv.js to clean old spreadsheet data before loading it into Supabase.</p>
    </section>
  `;
}

function render() {
  const app = document.querySelector("#app");
  const badge = document.querySelector("#connectionBadge");
  badge.textContent = supabaseClient ? "Connected" : "Supabase not connected";
  badge.className = supabaseClient ? "badge badge-ok" : "badge badge-muted";

  const views = {
    customer: {
      title: "Customer Portal",
      description: "Create support tickets, attach photos or voice notes, request callback support, and follow updates.",
      render: customerView
    },
    agent: {
      title: "Agent Queue",
      description: "Review incoming tickets, reply to customers, assign technicians, and update ticket progress.",
      render: agentView
    },
    technician: {
      title: "Technician Jobs",
      description: "Open assigned field jobs, consume inventory with the Work button, and keep job notes up to date.",
      render: technicianView
    },
    admin: {
      title: "Admin Console",
      description: "Approve users, manage company account limits, monitor notifications, and keep the platform healthy.",
      render: adminView
    }
  };

  const route = currentRoute() || (currentUser ? dashboardRouteForRole() : "login");
  updateNavigation(route);

  if (!currentRoute()) {
    navigateTo(route);
    return;
  }

  if (currentUser && publicRoutes.includes(route)) {
    navigateTo(dashboardRouteForRole());
    return;
  }

  if (route === "login") {
    app.innerHTML = loginPage();
    bindEvents();
    return;
  }

  if (route === "register") {
    app.innerHTML = registerPage();
    bindEvents();
    return;
  }

  if (!dashboardRoutes.includes(route)) {
    app.innerHTML = loginPage("This page was not found. Please login to continue.");
    bindEvents();
    return;
  }

  if (!currentUser) {
    app.innerHTML = loginPage(`Please login before opening the ${routeLabel(route)}.`);
    bindEvents();
    return;
  }

  if (currentProfile?.approval_status && currentProfile.approval_status !== "approved") {
    app.innerHTML = pendingApprovalPage();
    bindEvents();
    return;
  }

  if (!canAccessRoute(route)) {
    navigateTo(dashboardRouteForRole());
    return;
  }

  state.role = route;
  saveState();
  app.innerHTML = pageHeading(views[route].title, views[route].description) + views[route].render();
  bindEvents();
}

function updateNavigation(route) {
  const appNav = document.querySelector("#appNav");
  const publicLinks = document.querySelectorAll(".public-link");
  const signOutBtnGlobal = document.querySelector("#signOutBtnGlobal");
  const allowedRoutes = allowedDashboardRoutes();
  const isLoggedIn = Boolean(currentUser);

  if (appNav) appNav.hidden = !isLoggedIn;
  if (signOutBtnGlobal) signOutBtnGlobal.hidden = !isLoggedIn;
  publicLinks.forEach((link) => {
    link.hidden = isLoggedIn;
  });

  document.querySelectorAll("[data-route]").forEach((link) => {
    const linkRoute = link.dataset.route;
    link.hidden = isLoggedIn && !allowedRoutes.includes(linkRoute);
    link.classList.toggle("is-active", linkRoute === route);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.onclick = () => setRole(link.dataset.route);
  });

  document.querySelectorAll("[data-open-ticket]").forEach((button) => {
    button.onclick = () => openTicket(button.dataset.openTicket);
  });

  document.querySelectorAll("[data-ticket-update-form]").forEach((form) => {
    form.onsubmit = (event) => updateTicketDetails(event, form.dataset.ticketUpdateForm);
  });

  document.querySelectorAll("[data-delete-ticket]").forEach((button) => {
    button.onclick = () => deleteTicket(button.dataset.deleteTicket);
  });

  document.querySelectorAll("[data-delete-comment]").forEach((button) => {
    button.onclick = () => deleteComment(button.dataset.deleteComment);
  });

  document.querySelectorAll("[data-status]").forEach((button) => {
    button.onclick = () => updateTicketStatus(button.dataset.ticket, button.dataset.status);
  });

  document.querySelectorAll("[data-use-part]").forEach((button) => {
    button.onclick = () => useInventory(button.dataset.usePart);
  });

  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.onclick = () => approveUser(button.dataset.approve, "approved");
  });

  document.querySelectorAll("[data-reject]").forEach((button) => {
    button.onclick = () => approveUser(button.dataset.reject, "rejected");
  });

  document.querySelectorAll("[data-retry]").forEach((button) => {
    button.onclick = () => retryNotification(button.dataset.retry);
  });

  document.querySelectorAll("[data-assign-technician]").forEach((button) => {
    button.onclick = () => {
      const ticketId = button.dataset.assignTechnician;
      const select = document.querySelector(`[data-technician-select="${ticketId}"]`);
      assignTechnician(ticketId, select ? select.value : "");
    };
  });

  document.querySelectorAll("[data-map]").forEach((button) => {
    button.onclick = () => {
      const location = button.dataset.map;
      if (!location) {
        alert("No location was provided for this ticket.");
        return;
      }
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
    };
  });

  document.querySelectorAll("[data-map-ticket]").forEach((button) => {
    button.onclick = () => {
      const ticket = state.tickets.find((item) => item.id === button.dataset.mapTicket);
      if (!ticket?.location) {
        alert("No location was provided for this ticket.");
        return;
      }
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.location)}`, "_blank");
    };
  });

  document.querySelectorAll("[data-comment-form]").forEach((form) => {
    form.onsubmit = (event) => addComment(event, form.dataset.commentForm);
  });

  const loginForm = document.querySelector("#loginForm");
  if (loginForm) loginForm.onsubmit = signInUser;

  const registerForm = document.querySelector("#registerForm");
  if (registerForm) registerForm.onsubmit = signUpUser;

  const signOutBtn = document.querySelector("#signOutBtn");
  if (signOutBtn) signOutBtn.onclick = signOutUser;

  const signOutBtnGlobal = document.querySelector("#signOutBtnGlobal");
  if (signOutBtnGlobal) signOutBtnGlobal.onclick = signOutUser;

  const newTicketForm = document.querySelector("#newTicketForm");
  if (newTicketForm) newTicketForm.onsubmit = createTicket;

  const loadRealTicketsBtn = document.querySelector("#loadRealTicketsBtn");
  if (loadRealTicketsBtn) loadRealTicketsBtn.onclick = loadRealSupportData;

  const updateCompanyLimitBtn = document.querySelector("#updateCompanyLimitBtn");
  if (updateCompanyLimitBtn) updateCompanyLimitBtn.onclick = handleCompanyLimitUpdate;
}

window.addEventListener("hashchange", render);

loadCurrentUser().then(async () => {
  if (currentUser) {
    subscribeToTicketUpdates();
    await loadRealSupportData({ shouldRender: false });
  }
  render();
});
