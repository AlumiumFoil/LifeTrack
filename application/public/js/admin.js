'use strict';

/*
  Admin Dashboard
  - Loads platform stats from /api/admin/stats
  - Loads users from /api/admin/users
  - Opens read-only user profile modal from /api/admin/users/:id
*/

document.addEventListener('DOMContentLoaded', () => {
  initializeAdminPage();
});

const API_BASE = '/api/admin';

let cachedUsers = [];

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch (error) {
    return null;
  }
}

function isAdminUser(user) {
  if (!user || !Array.isArray(user.roles)) return false;

  return user.roles.some((role) => {
    const normalizedRole = String(role).toLowerCase();
    return normalizedRole === 'admin' || normalizedRole === 'administrator';
  });
}

function getAuthHeaders() {
  const token = getAccessToken();

  return {
    Authorization: `Bearer ${token}`
  };
}

function showAdminMessage(message, type = 'error') {
  const messageEl = document.getElementById('adminMessage');
  if (!messageEl) return;

  messageEl.style.display = 'block';
  messageEl.className = `status-message ${type}`;
  messageEl.textContent = message;
}

function clearAdminMessage() {
  const messageEl = document.getElementById('adminMessage');
  if (!messageEl) return;

  messageEl.style.display = 'none';
  messageEl.className = 'status-message';
  messageEl.textContent = '';
}

async function adminFetch(url) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('No active login session found. Please log in as an administrator.');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error('The server returned an invalid response.');
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Admin request failed.');
  }

  return data;
}

function formatDate(dateValue) {
  if (!dateValue) return 'N/A';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return 'N/A';
  }

  return roles.join(', ');
}

function statusBadge(status) {
  const normalizedStatus = String(status || 'unknown').toLowerCase();

  if (normalizedStatus === 'active') {
    return '<span class="badge badge-completed">Active</span>';
  }

  if (normalizedStatus === 'suspended') {
    return '<span class="badge badge-overdue">Suspended</span>';
  }

  if (normalizedStatus === 'inactive') {
    return '<span class="badge badge-not-started">Inactive</span>';
  }

  return `<span class="badge badge-not-started">${escapeHtml(status || 'Unknown')}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateAdminHeader() {
  const user = getSavedUser();
  const usernameEl = document.getElementById('adminUsername');
  const profilePreview = document.getElementById('profilePreview');

  if (usernameEl && user) {
    usernameEl.textContent = user.username || user.email || 'Admin';
  }

  const thumbnailUrl =
    user?.profile_thumbnail_url ||
    user?.profileThumbnailUrl ||
    user?.profile_image_url ||
    user?.profileImageUrl;

  if (profilePreview && thumbnailUrl) {
    profilePreview.src = thumbnailUrl;
  }
}

function updateStats(stats) {
  document.getElementById('statTotalUsers').textContent = stats.totalUsers ?? '--';
  document.getElementById('statActiveUsers').textContent = stats.activeUsers ?? '--';
  document.getElementById('statTotalGoals').textContent = stats.totalGoals ?? '--';
  document.getElementById('statTotalProjects').textContent = stats.totalProjects ?? '--';
  document.getElementById('statAvgGoals').textContent = stats.averageGoalsPerUser ?? '--';
}

async function loadStats() {
  const data = await adminFetch(`${API_BASE}/stats`);
  updateStats(data.stats || {});
}

function renderRecentUsers(users) {
  const tableBody = document.getElementById('recentUsersTableBody');
  if (!tableBody) return;

  const recentUsers = users.slice(0, 10);

  if (recentUsers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="admin-empty-state">No recent users found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = recentUsers.map((user) => `
    <tr>
      <td>
        <div class="admin-primary-text">${escapeHtml(user.username || 'N/A')}</div>
        <div class="admin-muted-text">${escapeHtml(user.fullName || '')}</div>
      </td>
      <td>${escapeHtml(user.email || 'N/A')}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>${statusBadge(user.accountStatus)}</td>
    </tr>
  `).join('');
}

function renderUsersTable(users) {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) return;

  if (users.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="admin-empty-state">No users found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = users.map((user) => `
    <tr>
      <td>
        <div class="admin-primary-text">${escapeHtml(user.username || 'N/A')}</div>
        <div class="admin-muted-text">${escapeHtml(user.fullName || '')}</div>
      </td>
      <td>${escapeHtml(user.email || 'N/A')}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>${statusBadge(user.accountStatus)}</td>
      <td>${escapeHtml(formatRoles(user.roles))}</td>
      <td>
        <div class="admin-table-actions">
          <button
            class="btn secondary sm"
            type="button"
            data-view-user-id="${escapeHtml(user.accountId)}"
          >
            View Profile
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getFilterQueryString() {
  const params = new URLSearchParams();

  const name = document.getElementById('filterName')?.value.trim();
  const email = document.getElementById('filterEmail')?.value.trim();
  const registrationDate = document.getElementById('filterRegistrationDate')?.value;
  const status = document.getElementById('filterStatus')?.value;

  if (name) params.set('name', name);
  if (email) params.set('email', email);
  if (registrationDate) params.set('registrationDate', registrationDate);
  if (status) params.set('status', status);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function loadUsers() {
  const queryString = getFilterQueryString();
  const data = await adminFetch(`${API_BASE}/users${queryString}`);

  cachedUsers = data.users || [];

  renderRecentUsers(cachedUsers);
  renderUsersTable(cachedUsers);
}

function openUserModal() {
  document.getElementById('userModalOverlay')?.classList.add('open');
}

function closeUserModal() {
  document.getElementById('userModalOverlay')?.classList.remove('open');
}

function renderUserDetails(user) {
  const modalBody = document.getElementById('userModalBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="admin-profile-row">
      <div class="admin-profile-label">Username</div>
      <div class="admin-profile-value">${escapeHtml(user.username || 'N/A')}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Full Name</div>
      <div class="admin-profile-value">${escapeHtml(user.fullName || 'N/A')}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Email</div>
      <div class="admin-profile-value">${escapeHtml(user.email || 'N/A')}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Status</div>
      <div class="admin-profile-value">${statusBadge(user.accountStatus)}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Registered</div>
      <div class="admin-profile-value">${formatDate(user.createdAt)}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">University</div>
      <div class="admin-profile-value">${escapeHtml(user.university || 'N/A')}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Major</div>
      <div class="admin-profile-value">${escapeHtml(user.major || 'N/A')}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Academic Year</div>
      <div class="admin-profile-value">${escapeHtml(user.academicYear || 'N/A')}</div>
    </div>

    <div class="admin-profile-row">
      <div class="admin-profile-label">Roles</div>
      <div class="admin-profile-value">${escapeHtml(formatRoles(user.roles))}</div>
    </div>
  `;
}

async function viewUserProfile(accountId) {
  const modalBody = document.getElementById('userModalBody');

  if (modalBody) {
    modalBody.textContent = 'Loading user details...';
  }

  openUserModal();

  try {
    const data = await adminFetch(`${API_BASE}/users/${accountId}`);
    renderUserDetails(data.user || {});
  } catch (error) {
    if (modalBody) {
      modalBody.innerHTML = `
        <p class="status-message error" style="display:block;">
          ${escapeHtml(error.message || 'Unable to load user details.')}
        </p>
      `;
    }
  }
}

function setupAdminEvents() {
  const filterForm = document.getElementById('adminFilterForm');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const usersTableBody = document.getElementById('usersTableBody');
  const closeModalBtn = document.getElementById('closeUserModalBtn');
  const modalOverlay = document.getElementById('userModalOverlay');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  filterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      clearAdminMessage();
      await loadUsers();
    } catch (error) {
      showAdminMessage(error.message || 'Unable to filter users.');
    }
  });

  clearFiltersBtn?.addEventListener('click', async () => {
    document.getElementById('filterName').value = '';
    document.getElementById('filterEmail').value = '';
    document.getElementById('filterRegistrationDate').value = '';
    document.getElementById('filterStatus').value = '';

    try {
      clearAdminMessage();
      await loadUsers();
    } catch (error) {
      showAdminMessage(error.message || 'Unable to reload users.');
    }
  });

  usersTableBody?.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view-user-id]');
    if (!viewButton) return;

    viewUserProfile(viewButton.dataset.viewUserId);
  });

  closeModalBtn?.addEventListener('click', closeUserModal);

  modalOverlay?.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      closeUserModal();
    }
  });

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = './auth.html';
  });
}

async function initializeAdminPage() {
  const savedUser = getSavedUser();

  updateAdminHeader();
  setupAdminEvents();

  if (!getAccessToken()) {
    showAdminMessage('Please log in as an administrator to view this page.');
    setTimeout(() => {
      window.location.href = './auth.html';
    }, 1200);
    return;
  }

  if (savedUser && !isAdminUser(savedUser)) {
    showAdminMessage('This page is only available to administrator accounts.');
    return;
  }

  try {
    clearAdminMessage();
    await Promise.all([
      loadStats(),
      loadUsers()
    ]);
  } catch (error) {
    showAdminMessage(error.message || 'Unable to load admin dashboard.');
  }
}
