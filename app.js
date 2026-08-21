const supabaseConfig = window.ABSL_SUPABASE || {};
const hasSupabaseConfig = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
const supabaseClient =
  hasSupabaseConfig && window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;

const initialState = {
  role: "customer",
  selectedTicketId: "TCK-1001",
  tickets: [
    {
      id: "TCK-1001",
      number: "ABSL-2026-000001",
      title: "Barcode printer ribbon not feeding",
      customer: "Nimal Perera",
      company: "Lanka Fresh Mart",
      status: "new",
      priority: "High",
      location: "Colombo 03",
      callback: true,
      version: 1,
      assignedAgent: "Asha",
      assignedTechnician: "Ruwan",
      createdAt: "2026-08-21 09:20"
    },
    {
      id: "TCK-1002",
      number: "ABSL-2026-000002",
      title: "Scanner not connecting to POS",
      customer: "Dilani Silva",
      company: "Metro Pharmacy",
      status: "in_progress",
      priority: "Medium",
      location: "Kandy",
      callback: false,
      version: 3,
      assignedAgent: "Asha",
      assignedTechnician: "Sahan",
      createdAt: "2026-08-21 10:05"
    },
    {
      id: "TCK-1003",
      number: "ABSL-2026-000003",
      title: "Need new labels for weighing scale",
      customer: "Fathima Noor",
      company: "City Grocers",
      status: "resolved",
      priority: "Low",
      location: "",
      callback: false,
      version: 2,
      assignedAgent: "Milan",
      assignedTechnician: "Ruwan",
      createdAt: "2026-08-21 11:35"
    }
  ],
  comments: [
    {
      ticketId: "TCK-1001",
      author: "Nimal Perera",
      body: "The printer starts but the ribbon gets stuck after two labels.",
      createdAt: "09:23"
    },
    {
      ticketId: "TCK-1001",
      author: "Asha",
      body: "Thanks. Please keep the printer powered on. Technician assigned.",
      createdAt: "09:31"
    }
  ],
  inventory: [
    { id: "INV-1", sku: "RBN-110-74", name: "Wax ribbon 110mm x 74m", category: "Ribbon", qty: 24 },
    { id: "INV-2", sku: "LBL-50-25", name: "Label roll 50mm x 25mm", category: "Labels", qty: 8 },
    { id: "INV-3", sku: "HDR-ZD220", name: "Print head ZD220", category: "Printer Parts", qty: 2 }
  ],
  approvals: [
    { id: "APR-1", name: "Kasun Jayasuriya", email: "kasun@gmail.com", company: "New Retail Shop", status: "pending" },
    { id: "APR-2", name: "Maya Fernando", email: "maya@metro.lk", company: "Metro Pharmacy", status: "approved" }
  ],
  notifications: [
    { id: "NTF-1", subject: "Ticket created", channel: "email", status: "sent", attempts: 1 },
    { id: "NTF-2", subject: "Status changed", channel: "email", status: "retry", attempts: 2 },
    { id: "NTF-3", subject: "Technician assigned", channel: "email", status: "dead_letter", attempts: 5 }
  ]
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem("absl-helpdesk-demo");
  return saved ? JSON.parse(saved) : structuredClone(initialState);
}

function saveState() {
  localStorage.setItem("absl-helpdesk-demo", JSON.stringify(state));
}

function resetDemo() {
  state = structuredClone(initialState);
  saveState();
  render();
}

function statusLabel(status) {
  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
  return state.tickets.find((ticket) => ticket.id === state.selectedTicketId) || state.tickets[0];
}

function ticketComments(ticketId) {
  return state.comments.filter((comment) => comment.ticketId === ticketId);
}

function setRole(role) {
  state.role = role;
  saveState();
  render();
}

function openTicket(ticketId) {
  state.selectedTicketId = ticketId;
  saveState();
  render();
}

function updateTicketStatus(ticketId, status) {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  ticket.status = status;
  ticket.version += 1;
  state.notifications.unshift({
    id: `NTF-${Date.now()}`,
    subject: `Ticket ${ticket.number} changed to ${statusLabel(status)}`,
    channel: "email",
    status: "pending",
    attempts: 0
  });
  saveState();
  render();
}

function approveUser(approvalId, status) {
  const approval = state.approvals.find((item) => item.id === approvalId);
  if (!approval) return;
  approval.status = status;
  saveState();
  render();
}

function retryNotification(id) {
  const notification = state.notifications.find((item) => item.id === id);
  if (!notification) return;
  notification.status = "pending";
  saveState();
  render();
}

function useInventory(itemId) {
  const item = state.inventory.find((part) => part.id === itemId);
  if (!item || item.qty <= 0) return;
  item.qty -= 1;
  const ticket = selectedTicket();
  state.comments.push({
    ticketId: ticket.id,
    author: "Technician",
    body: `Used 1 item: ${item.name}. Remaining stock: ${item.qty}.`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  saveState();
  render();
}

async function getLoggedInProfile() {
  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return null;
  }

  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    alert("Please login first.");
    return null;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, company_id, approval_status")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    alert("Profile not found. Please register first.");
    return null;
  }

  if (profile.approval_status !== "approved") {
    alert("Your account is waiting for admin approval.");
    return null;
  }

  return profile;
}

async function createRealTicket(ticket) {
  const profile = await getLoggedInProfile();

  if (!profile) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("tickets")
    .insert({
      company_id: profile.company_id,
      created_by: profile.id,
      title: ticket.title,
      description: ticket.description || ticket.title,
      priority: ticket.priority.toLowerCase(),
      location_name: ticket.location,
      wants_callback: ticket.callback
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return null;
  }

  alert(`Ticket created: ${data.ticket_number}`);
  return data;
}

async function uploadAttachment(ticketId, file, bucketName, fileType) {
  if (!file || file.size === 0) {
    return null;
  }

  const profile = await getLoggedInProfile();

  if (!profile) {
    return null;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${ticketId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucketName)
    .upload(filePath, file);

  if (uploadError) {
    alert(uploadError.message);
    return null;
  }

  const { error: dbError } = await supabaseClient
    .from("ticket_attachments")
    .insert({
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
  const voiceFile = data.get("voice");
  const nextNumber = String(state.tickets.length + 1).padStart(6, "0");
  const ticket = {
    id: `TCK-${Date.now()}`,
    number: `ABSL-2026-${nextNumber}`,
    title: data.get("title"),
    customer: data.get("customer"),
    company: data.get("company"),
    status: "new",
    priority: data.get("priority"),
    location: data.get("location"),
    callback: data.get("callback") === "on",
    version: 1,
    assignedAgent: "Unassigned",
    assignedTechnician: "Unassigned",
    createdAt: new Date().toLocaleString()
  };

  if (supabaseClient) {
    const realTicket = await createRealTicket(ticket);

    if (!realTicket) {
      return;
    }

    ticket.id = realTicket.id;
    ticket.number = realTicket.ticket_number;

    if (voiceFile && voiceFile.size > 0) {
      await uploadAttachment(realTicket.id, voiceFile, "ticket-voice-notes", "voice");
    }
  }

  state.tickets.unshift(ticket);
  state.selectedTicketId = ticket.id;
  state.notifications.unshift({
    id: `NTF-${Date.now()}`,
    subject: `New ticket ${ticket.number}`,
    channel: "email",
    status: "pending",
    attempts: 0
  });
  saveState();
  event.target.reset();
  render();
}

function addComment(event, ticketId) {
  event.preventDefault();
  const data = new FormData(event.target);
  const body = data.get("comment");
  if (!body.trim()) return;
  state.comments.push({
    ticketId,
    author: statusAuthor(),
    body,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  saveState();
  event.target.reset();
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

  return `
    <div class="ticket-list">
      ${tickets
        .map(
          (ticket) => `
          <article class="ticket-card">
            <div>
              <h3>${ticket.title}</h3>
              <div class="ticket-meta">
                <span class="badge badge-muted">${ticket.number}</span>
                ${statusBadge(ticket.status)}
                <span class="badge badge-muted">${ticket.priority}</span>
                ${ticket.callback ? `<span class="badge badge-ok">Callback</span>` : ""}
              </div>
              <p class="small muted">${ticket.company} - ${ticket.location || "No location provided"}</p>
            </div>
            <button class="secondary-button" type="button" data-open-ticket="${ticket.id}">Open</button>
          </article>
        `
        )
        .join("")}
    </div>
  `;
}

function renderTicketDetail(ticket) {
  const comments = ticketComments(ticket.id);
  return `
    <section class="detail-grid">
      <article class="panel">
        <div class="panel-title">
          <div>
            <h2>${ticket.title}</h2>
            <p class="muted">${ticket.number} - version ${ticket.version}</p>
          </div>
          ${statusBadge(ticket.status)}
        </div>

        <div class="dashboard-grid">
          <div><strong>Customer</strong><p class="muted">${ticket.customer}</p></div>
          <div><strong>Company</strong><p class="muted">${ticket.company}</p></div>
          <div><strong>Location</strong><p class="muted">${ticket.location || "Not provided"}</p></div>
        </div>

        <div class="action-row">
          <button class="secondary-button" type="button" data-map="${ticket.location}">Location</button>
          <button class="secondary-button" type="button">Photo</button>
          <button class="secondary-button" type="button">Voice note</button>
          <button class="secondary-button" type="button">Callback</button>
        </div>

        <hr />

        <h3>Comment Thread</h3>
        <div>
          ${comments
            .map(
              (comment) => `
              <div class="comment">
                <strong>${comment.author}</strong>
                <p>${comment.body}</p>
                <span class="small muted">${comment.createdAt}</span>
              </div>
            `
            )
            .join("")}
        </div>

        <form class="action-row" data-comment-form="${ticket.id}">
          <input name="comment" aria-label="Comment" placeholder="Write a reply..." />
          <button class="primary-button" type="submit">Send</button>
        </form>
      </article>

      <aside class="panel">
        <h3>Status</h3>
        <p class="muted small">Use the expected version in Supabase to prevent two agents overwriting each other.</p>
        <div class="action-row">
          <button class="secondary-button" type="button" data-status="new" data-ticket="${ticket.id}">New</button>
          <button class="secondary-button" type="button" data-status="in_progress" data-ticket="${ticket.id}">In Progress</button>
          <button class="secondary-button" type="button" data-status="resolved" data-ticket="${ticket.id}">Resolved</button>
          <button class="secondary-button" type="button" data-status="closed" data-ticket="${ticket.id}">Closed</button>
        </div>

        <hr />

        <h3>Timeline</h3>
        <ul class="timeline">
          <li>Created by ${ticket.customer}</li>
          <li>Assigned agent: ${ticket.assignedAgent}</li>
          <li>Assigned technician: ${ticket.assignedTechnician}</li>
          <li>Current status: ${statusLabel(ticket.status)}</li>
        </ul>
      </aside>
    </section>
  `;
}

function customerView() {
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
              <input id="customer" name="customer" value="Nimal Perera" required />
            </div>
            <div class="field">
              <label for="company">Company</label>
              <input id="company" name="company" value="Lanka Fresh Mart" required />
            </div>
          </div>
          <div class="field">
            <label for="title">Problem</label>
            <input id="title" name="title" placeholder="Example: scanner not reading barcodes" required />
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
            <button class="secondary-button" type="button">Attach Photo</button>
            <button class="secondary-button" type="button">Record Voice</button>
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
          <span class="badge badge-muted">Realtime list</span>
        </div>
        ${renderTicketList(state.tickets)}
      </div>
      <div class="panel">
        <h2>Agent Rules</h2>
        <p class="muted">Open tickets, review attachments, comment to customer, update status, or assign technician.</p>
        <div class="notice">
          Conflict protection is handled in the database with ticket version checks.
        </div>
      </div>
    </section>
    <br />
    ${renderTicketDetail(selectedTicket())}
  `;
}

function technicianView() {
  const assigned = state.tickets.filter((ticket) => ticket.assignedTechnician !== "Unassigned");
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
        ${state.inventory
          .map(
            (item) => `
            <div class="inventory-row">
              <div>
                <strong>${item.name}</strong>
                <p class="small muted">${item.sku} - ${item.category} - Stock: ${item.qty}</p>
              </div>
              <button class="primary-button" type="button" data-use-part="${item.id}" ${item.qty <= 0 ? "disabled" : ""}>Work</button>
            </div>
          `
          )
          .join("")}
      </div>
    </section>
    <br />
    ${renderTicketDetail(selectedTicket())}
  `;
}

function adminView() {
  return `
    ${renderStats()}
    <br />
    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-title">
          <h2>User Approvals</h2>
          <span class="badge badge-muted">Personal email review</span>
        </div>
        ${state.approvals
          .map(
            (approval) => `
            <div class="inventory-row">
              <div>
                <strong>${approval.name}</strong>
                <p class="small muted">${approval.email} - ${approval.company}</p>
                <span class="badge ${approval.status === "approved" ? "badge-ok" : "badge-muted"}">${approval.status}</span>
              </div>
              <div class="action-row">
                <button class="primary-button" type="button" data-approve="${approval.id}">Approve</button>
                <button class="danger-button" type="button" data-reject="${approval.id}">Reject</button>
              </div>
            </div>
          `
          )
          .join("")}
      </article>

      <article class="panel">
        <h2>Company Limit</h2>
        <p class="muted">When a company reaches the account limit, admin can increase or reject the request.</p>
        <div class="notice">
          Automated Barcode Solutions Pvt Ltd default customer limit: 10 users per company.
        </div>
        <div class="action-row">
          <button class="primary-button" type="button">Increase Limit</button>
          <button class="secondary-button" type="button">View Companies</button>
        </div>
      </article>

      <article class="panel">
        <h2>Notifications</h2>
        ${state.notifications
          .map(
            (notification) => `
            <div class="inventory-row">
              <div>
                <strong>${notification.subject}</strong>
                <p class="small muted">${notification.channel} - attempts: ${notification.attempts}</p>
                <span class="badge ${notification.status === "dead_letter" ? "badge-danger" : "badge-muted"}">${notification.status}</span>
              </div>
              <button class="secondary-button" type="button" data-retry="${notification.id}">Retry</button>
            </div>
          `
          )
          .join("")}
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
  badge.textContent = supabaseClient ? "Supabase configured" : "Demo mode";
  badge.className = supabaseClient ? "badge badge-ok" : "badge badge-muted";

  document.querySelectorAll("[data-role]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.role === state.role);
  });

  const views = {
    customer: customerView,
    agent: agentView,
    technician: technicianView,
    admin: adminView
  };
  app.innerHTML = views[state.role]();
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.onclick = () => setRole(button.dataset.role);
  });

  document.querySelectorAll("[data-open-ticket]").forEach((button) => {
    button.onclick = () => openTicket(button.dataset.openTicket);
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

  document.querySelectorAll("[data-comment-form]").forEach((form) => {
    form.onsubmit = (event) => addComment(event, form.dataset.commentForm);
  });

  const newTicketForm = document.querySelector("#newTicketForm");
  if (newTicketForm) {
    newTicketForm.onsubmit = createTicket;
  }
}

document.querySelector("#resetDemoBtn").addEventListener("click", resetDemo);
render();

