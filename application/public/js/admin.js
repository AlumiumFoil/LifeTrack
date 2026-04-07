let USERS = [
  { id: 1, username: 'alex',      email: 'ahernandez75@sfsu.edu',   role: 'student', status: 'active'    },
  { id: 2, username: 'john',      email: 'jnaraja@sfsu.edu',        role: 'student', status: 'active'    },
  { id: 3, username: 'khaterina', email: 'ksengchareune@sfsu.edu',  role: 'admin',   status: 'active'    },
  { id: 4, username: 'mohit',     email: 'mkumar3@sfsu.edu',        role: 'student', status: 'active'    },
  { id: 5, username: 'will',      email: 'wbrust@sfsu.edu',         role: 'student', status: 'active'    },
  { id: 6, username: 'lasiru',    email: 'lweerasuriya@sfsu.edu',   role: 'student', status: 'active'    },
  { id: 7, username: 'test_user', email: 'testuser@sfsu.edu',       role: 'student', status: 'suspended' },
];

let RESOURCES = [
  { id: 1, title: 'SFSU Tutoring Center Hours',        category: 'Academic', status: 'approved', author: 'lasiru'    },
  { id: 2, title: 'Free Online Python Course',         category: 'Academic', status: 'approved', author: 'alex'      },
  { id: 3, title: 'Campus Mental Health Workshops',    category: 'Wellness', status: 'pending',  author: 'khaterina' },
  { id: 4, title: 'Resume Writing Tips for Engineers', category: 'Career',   status: 'pending',  author: 'john'      },
  { id: 5, title: 'SF Public Library Access Guide',    category: 'General',  status: 'approved', author: 'will'      },
  { id: 6, title: 'Student Discount Software List',    category: 'Tech',     status: 'pending',  author: 'mohit'     },
];

/* ── Helpers ── */

function roleBadge(role) {
  return role === 'admin'
    ? '<span class="badge badge-paused">Admin</span>'
    : '<span class="badge badge-not-started">Student</span>';
}

function statusBadge(status) {
  if (status === 'active')    return '<span class="badge badge-completed">Active</span>';
  if (status === 'suspended') return '<span class="badge badge-overdue">Suspended</span>';
  if (status === 'approved')  return '<span class="badge badge-completed">Approved</span>';
  if (status === 'pending')   return '<span class="badge badge-in-progress">Pending</span>';
  return '<span class="badge badge-not-started">' + status + '</span>';
}

function updateSummary() {
  document.getElementById('stat-total-users').textContent  = USERS.length;
  document.getElementById('stat-active-users').textContent = USERS.filter(u => u.status === 'active').length;
  document.getElementById('stat-resources').textContent    = RESOURCES.length;
  document.getElementById('stat-pending').textContent      = RESOURCES.filter(r => r.status === 'pending').length;
}

/* ── User Management ── */

function renderUsers() {
  const el = document.getElementById('user-list');

  if (USERS.length === 0) {
    el.innerHTML = '<p style="color:var(--muted); padding:12px 0;">No users found.</p>';
    return;
  }

  el.innerHTML = USERS.map(u => `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">${u.username}</div>
        <div class="assign-meta">${u.email}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${roleBadge(u.role)}
        ${statusBadge(u.status)}
      </div>
      <div class="admin-actions">
        <button class="btn secondary sm" onclick="toggleUser(${u.id})">
          ${u.status === 'active' ? 'Disable' : 'Enable'}
        </button>
        <button class="btn danger sm" onclick="deleteUser(${u.id})">Delete</button>
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
  if (!confirm(`Delete user "${u.username}"? This cannot be undone.\n\n(Demo only — no data is persisted)`)) return;
  USERS = USERS.filter(x => x.id !== id);
  renderUsers();
  updateSummary();
}

/* ── Content Moderation ── */

function renderResources() {
  const el = document.getElementById('resource-list');

  if (RESOURCES.length === 0) {
    el.innerHTML = '<p style="color:var(--muted); padding:12px 0;">No resources found.</p>';
    return;
  }

  el.innerHTML = RESOURCES.map(r => `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">${r.title}</div>
        <div class="assign-meta">${r.category} &nbsp;•&nbsp; Submitted by: ${r.author}</div>
      </div>
      ${statusBadge(r.status)}
      <div class="admin-actions">
        ${r.status === 'pending'
          ? `<button class="btn sm" onclick="approveResource(${r.id})">Approve</button>`
          : `<button class="btn secondary sm" disabled style="opacity:0.45; cursor:default;">Approved</button>`
        }
        <button class="btn danger sm" onclick="removeResource(${r.id})">Remove</button>
      </div>
    </div>
  `).join('');
}

function approveResource(id) {
  const r = RESOURCES.find(x => x.id === id);
  if (!r) return;
  r.status = 'approved';
  renderResources();
  updateSummary();
}

function removeResource(id) {
  const r = RESOURCES.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`Remove "${r.title}"?\n\n(Demo only — no data is persisted)`)) return;
  RESOURCES = RESOURCES.filter(x => x.id !== id);
  renderResources();
  updateSummary();
}

/* ── Init ── */

renderUsers();
renderResources();
updateSummary();
