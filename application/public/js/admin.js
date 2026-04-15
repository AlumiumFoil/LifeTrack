'use strict';
/* Admin Dashboard – demo data only, no backend calls */

// ── Data ──────────────────────────────────────────────────────────────────────

let USERS = [
  { id:1, username:'alex',      email:'ahernandez75@sfsu.edu',  role:'student', status:'active'    },
  { id:2, username:'john',      email:'jnaraja@sfsu.edu',       role:'student', status:'active'    },
  { id:3, username:'khaterina', email:'ksengchareune@sfsu.edu', role:'admin',   status:'active'    },
  { id:4, username:'mohit',     email:'mkumar3@sfsu.edu',       role:'student', status:'active'    },
  { id:5, username:'will',      email:'wbrust@sfsu.edu',        role:'student', status:'active'    },
  { id:6, username:'lasiru',    email:'lweerasuriya@sfsu.edu',  role:'student', status:'active'    },
  { id:7, username:'test_user', email:'testuser@sfsu.edu',      role:'student', status:'suspended' },
];

// Renamed from RESOURCES to CONTENT to avoid confusion with wellness resources
let CONTENT = [
  { id:1, title:'SFSU Tutoring Center Hours',        category:'Academic', status:'approved', author:'lasiru'    },
  { id:2, title:'Free Online Python Course',         category:'Academic', status:'approved', author:'alex'      },
  { id:3, title:'Campus Mental Health Workshops',    category:'Wellness', status:'pending',  author:'khaterina' },
  { id:4, title:'Resume Writing Tips for Engineers', category:'Career',   status:'pending',  author:'john'      },
  { id:5, title:'SF Public Library Access Guide',    category:'General',  status:'approved', author:'will'      },
  { id:6, title:'Student Discount Software List',    category:'Tech',     status:'pending',  author:'mohit'     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadge(role) {
  return role === 'admin'
    ? '<span class="badge badge-paused">Admin</span>'
    : '<span class="badge badge-not-started">Student</span>';
}

function statusBadge(status) {
  const map = {
    active:   '<span class="badge badge-completed">Active</span>',
    suspended:'<span class="badge badge-overdue">Suspended</span>',
    approved: '<span class="badge badge-completed">Approved</span>',
    pending:  '<span class="badge badge-in-progress">Pending</span>',
  };
  return map[status] || `<span class="badge badge-not-started">${status}</span>`;
}

// ── Summary cards — called after every mutation ───────────────────────────────

function updateSummary() {
  document.getElementById('stat-total-users').textContent  = USERS.length;
  document.getElementById('stat-active-users').textContent = USERS.filter(u => u.status === 'active').length;
  document.getElementById('stat-resources').textContent    = CONTENT.length;
  document.getElementById('stat-pending').textContent      = CONTENT.filter(r => r.status === 'pending').length;
}

// ── User management ───────────────────────────────────────────────────────────

function renderUsers() {
  const el = document.getElementById('user-list');
  if (!USERS.length) {
    el.innerHTML = '<p style="color:var(--muted);padding:12px 0">No users found.</p>';
    return;
  }

  // data-* attributes drive event delegation; no inline onclick needed
  el.innerHTML = USERS.map(u => `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">${u.username}</div>
        <div class="assign-meta">${u.email}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${roleBadge(u.role)}
        ${statusBadge(u.status)}
      </div>
      <div class="admin-actions">
        <button class="btn secondary sm" data-toggle="${u.id}">
          ${u.status === 'active' ? 'Disable' : 'Enable'}
        </button>
        <button class="btn danger sm" data-delete="${u.id}">Delete</button>
      </div>
    </div>
  `).join('');
}

function toggleUser(id) {
  const u = USERS.find(x => x.id === id);
  if (!u) return;
  u.status = u.status === 'active' ? 'suspended' : 'active';
  renderUsers();
  updateSummary();
}

function deleteUser(id) {
  const u = USERS.find(x => x.id === id);
  if (!u) return;
  if (!confirm(`Delete user "${u.username}"?\n\n(Demo only — no data is persisted)`)) return;
  USERS = USERS.filter(x => x.id !== id);
  renderUsers();
  updateSummary();
}

// ── Content moderation ────────────────────────────────────────────────────────

function renderContent() {
  const el = document.getElementById('resource-list');
  if (!CONTENT.length) {
    el.innerHTML = '<p style="color:var(--muted);padding:12px 0">No resources found.</p>';
    return;
  }

  el.innerHTML = CONTENT.map(r => `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">${r.title}</div>
        <div class="assign-meta">${r.category} &nbsp;•&nbsp; Submitted by: ${r.author}</div>
      </div>
      ${statusBadge(r.status)}
      <div class="admin-actions">
        ${r.status === 'pending'
          ? `<button class="btn sm" data-approve="${r.id}">Approve</button>`
          : `<button class="btn secondary sm" disabled style="opacity:0.45;cursor:default;">Approved</button>`
        }
        <button class="btn danger sm" data-remove="${r.id}">Remove</button>
      </div>
    </div>
  `).join('');
}

function approveContent(id) {
  const r = CONTENT.find(x => x.id === id);
  if (!r) return;
  r.status = 'approved';
  renderContent();
  updateSummary();
}

function removeContent(id) {
  const r = CONTENT.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`Remove "${r.title}"?\n\n(Demo only — no data is persisted)`)) return;
  CONTENT = CONTENT.filter(x => x.id !== id);
  renderContent();
  updateSummary();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // User list — single delegated listener handles Disable/Enable and Delete
  document.getElementById('user-list').addEventListener('click', e => {
    const toggleBtn = e.target.closest('[data-toggle]');
    const deleteBtn = e.target.closest('[data-delete]');
    if (toggleBtn) toggleUser(+toggleBtn.dataset.toggle);
    if (deleteBtn) deleteUser(+deleteBtn.dataset.delete);
  });

  // Resource list — single delegated listener handles Approve and Remove
  document.getElementById('resource-list').addEventListener('click', e => {
    const approveBtn = e.target.closest('[data-approve]');
    const removeBtn  = e.target.closest('[data-remove]');
    if (approveBtn) approveContent(+approveBtn.dataset.approve);
    if (removeBtn)  removeContent(+removeBtn.dataset.remove);
  });

  renderUsers();
  renderContent();
  updateSummary();
});
