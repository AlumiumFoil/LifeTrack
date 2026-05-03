'use strict';

/* Goal Management – backend-connected */

let GOALS = [];
let STATS = {
  total: 0,
  inProgress: 0,
  completed: 0
};

let activeTab = 'all';
let editingId = null;

// ── Auth / headers ────────────────────────────────────────────────────────────

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getAuthHeaders(includeJson = false) {
  const token = getAccessToken();

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

// ── Profile header ────────────────────────────────────────────────────────────

async function loadProfileHeader() {
  const usernameEl = document.getElementById('profileUsernameTop');
  const avatarEl = document.getElementById('profilePreview');

  const storedUser = localStorage.getItem('user');

  if (storedUser && usernameEl) {
    try {
      const user = JSON.parse(storedUser);
      usernameEl.textContent =
        user.username ||
        user.name ||
        user.firstName ||
        'Profile';
    } catch {
      usernameEl.textContent = 'Profile';
    }
  }

  const token = getAccessToken();
  if (!token || !avatarEl) return;

  try {
    const response = await fetch('/api/users/me/dashboard', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not load profile preview.');
    }

    const profile = data.user || data.profile || data.dashboard || data;

    if (profile.username && usernameEl) {
      usernameEl.textContent = profile.username;
    }

    if (profile.profilePicture || profile.profileImage || profile.avatarUrl) {
      avatarEl.src =
        profile.profilePicture ||
        profile.profileImage ||
        profile.avatarUrl;
    }
  } catch (error) {
    console.error('Profile header load error:', error.message || error);
  }
}

// ── Accessibility settings ────────────────────────────────────────────────────

async function loadAccessibilitySettings() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const response = await fetch('/api/users/me/accessibility', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not load accessibility settings.');
    }

    applyAccessibilitySettings(data.accessibility);
  } catch (error) {
    console.error('Accessibility settings load error:', error.message || error);
  }
}

function applyAccessibilitySettings(accessibility) {
  if (!accessibility) return;

  const themeMode = accessibility.themeMode || 'dark';
  const textSize = accessibility.textSize || 'normal';
  const highContrastEnabled =
    accessibility.highContrastEnabled === true ||
    accessibility.highContrastEnabled === 1 ||
    accessibility.highContrastEnabled === '1';

  const isAccessibilityMode =
    themeMode === 'light' &&
    textSize === 'large' &&
    highContrastEnabled;

  document.body.setAttribute(
    'data-accessibility-mode',
    isAccessibilityMode ? 'accessibility' : 'default'
  );
}

// ── Display helpers ───────────────────────────────────────────────────────────

const BADGE_CLASS = {
  'in progress': 'badge-in-progress',
  completed: 'badge-completed',
  'not started': 'badge-not-started'
};

function badgeClass(status) {
  return BADGE_CLASS[normalizeStatus(status)] || 'badge-not-started';
}

function normalizeStatus(status) {
  return String(status || 'not started').toLowerCase();
}

function displayStatus(status) {
  const normalized = normalizeStatus(status);

  if (normalized === 'in progress') return 'In Progress';
  if (normalized === 'completed') return 'Completed';
  return 'Not Started';
}

function formatDate(iso) {
  if (!iso) return 'No target date';

  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;

  const date = new Date(Number(y), Number(m) - 1, Number(d));

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showGoalMessage(message, type = 'error') {
  const messageEl = document.getElementById('goal-message');
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `status-message ${type}`;
  messageEl.hidden = false;
}

function clearGoalMessage() {
  const messageEl = document.getElementById('goal-message');
  if (!messageEl) return;

  messageEl.textContent = '';
  messageEl.className = 'status-message';
  messageEl.hidden = true;
}

// ── API ───────────────────────────────────────────────────────────────────────

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Request failed.');
  }

  return data;
}

async function loadGoals() {
  const token = getAccessToken();

  if (!token) {
    renderLoadError('Please log in to view and manage your goals.');
    return;
  }

  try {
    const data = await apiRequest('/api/goals', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    GOALS = Array.isArray(data.goals) ? data.goals : [];
    STATS = data.stats || {
      total: GOALS.length,
      inProgress: GOALS.filter(g => normalizeStatus(g.status) === 'in progress').length,
      completed: GOALS.filter(g => normalizeStatus(g.status) === 'completed').length
    };

    updateSummary();
    renderGoals();
  } catch (error) {
    console.error('Goal load error:', error.message || error);
    renderLoadError(error.message || 'Could not load goals.');
  }
}

async function createGoal(payload) {
  await apiRequest('/api/goals', {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload)
  });
}

async function updateGoal(goalId, payload) {
  await apiRequest(`/api/goals/${goalId}`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload)
  });
}

async function deleteGoal(goalId) {
  await apiRequest(`/api/goals/${goalId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function updateSummary() {
  const notStarted = GOALS.filter(
    g => normalizeStatus(g.status) === 'not started'
  ).length;

  document.getElementById('stat-total').textContent = STATS.total ?? GOALS.length;
  document.getElementById('stat-inprogress').textContent = STATS.inProgress ?? 0;
  document.getElementById('stat-completed').textContent = STATS.completed ?? 0;
  document.getElementById('stat-not-started').textContent = notStarted;
}

// ── Goal grid ─────────────────────────────────────────────────────────────────

function renderLoadError(message) {
  const grid = document.getElementById('goals-grid');

  if (!grid) return;

  grid.innerHTML = `
    <div class="card goals-empty-card">
      <h2 class="card-title">Goals unavailable</h2>
      <p class="card-desc">${escapeHtml(message)}</p>
    </div>
  `;

  document.getElementById('stat-total').textContent = '0';
  document.getElementById('stat-inprogress').textContent = '0';
  document.getElementById('stat-completed').textContent = '0';
  document.getElementById('stat-not-started').textContent = '0';
}

function renderGoals() {
  const grid = document.getElementById('goals-grid');
  if (!grid) return;

  const search = document.getElementById('search-input').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;

  const visible = GOALS.filter(goal => {
    const status = normalizeStatus(goal.status);
    const title = String(goal.title || '').toLowerCase();
    const description = String(goal.description || '').toLowerCase();
    const notes = String(goal.notes || '').toLowerCase();

    if (activeTab !== 'all' && status !== activeTab) return false;
    if (statusFilter !== 'all' && status !== statusFilter) return false;

    if (
      search &&
      !title.includes(search) &&
      !description.includes(search) &&
      !notes.includes(search)
    ) {
      return false;
    }

    return true;
  });

  if (!visible.length) {
    grid.innerHTML = `
      <div class="card goals-empty-card">
        <h2 class="card-title">No goals found</h2>
        <p class="card-desc">Try adjusting your filters or create a new goal.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = visible.map(goal => `
    <article class="card goal-card">
      <div class="goal-card-meta">
        <span class="badge ${badgeClass(goal.status)}">${displayStatus(goal.status)}</span>
        <span class="small">Target: ${formatDate(goal.targetDate)}</span>
      </div>

      <h2 class="card-title">${escapeHtml(goal.title)}</h2>

      <p class="card-desc">
        ${escapeHtml(goal.description || 'No description added yet.')}
      </p>

      ${
        goal.notes
          ? `<p class="goal-notes"><strong>Notes:</strong> ${escapeHtml(goal.notes)}</p>`
          : ''
      }

      <div class="goal-card-footer">
        <span class="small">Updated: ${goal.updatedAt ? formatDate(String(goal.updatedAt).slice(0, 10)) : 'N/A'}</span>
        <button class="btn secondary sm" data-edit="${goal.id}">Edit</button>
      </div>
    </article>
  `).join('');
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function setActiveTab(button, tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  button.classList.add('active');
  activeTab = tab;
  renderGoals();
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(goal = null) {
  editingId = goal ? goal.id : null;

  clearGoalMessage();

  document.getElementById('modal-title').textContent = goal ? 'Edit Goal' : 'New Goal';
  document.getElementById('goal-title').value = goal ? goal.title || '' : '';
  document.getElementById('goal-status').value = goal ? normalizeStatus(goal.status) : 'not started';
  document.getElementById('goal-date').value = goal ? goal.targetDate || '' : '';
  document.getElementById('goal-desc').value = goal ? goal.description || '' : '';
  document.getElementById('goal-notes').value = goal ? goal.notes || '' : '';

  const deleteBtn = document.getElementById('delete-goal-btn');
  if (deleteBtn) {
    deleteBtn.hidden = !goal;
  }

  document.getElementById('goal-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('goal-modal').classList.remove('open');
  editingId = null;
  clearGoalMessage();
}

function buildGoalPayload() {
  const title = document.getElementById('goal-title').value.trim();
  const status = document.getElementById('goal-status').value;
  const targetDate = document.getElementById('goal-date').value;
  const description = document.getElementById('goal-desc').value.trim();
  const notes = document.getElementById('goal-notes').value.trim();

  return {
    title,
    status,
    targetDate: targetDate || null,
    description: description || null,
    notes: notes || null
  };
}

async function saveGoal() {
  const saveBtn = document.getElementById('save-goal-btn');
  const payload = buildGoalPayload();

  if (!payload.title) {
    showGoalMessage('Please enter a goal name.');
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = editingId ? 'Saving...' : 'Creating...';

    if (editingId !== null) {
      await updateGoal(editingId, payload);
    } else {
      await createGoal(payload);
    }

    closeModal();
    await loadGoals();
  } catch (error) {
    console.error('Save goal error:', error.message || error);
    showGoalMessage(error.message || 'Could not save goal.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Goal';
  }
}

async function handleDeleteGoal() {
  if (editingId === null) return;

  const confirmed = confirm('Delete this goal? This cannot be undone.');
  if (!confirmed) return;

  const deleteBtn = document.getElementById('delete-goal-btn');

  try {
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    await deleteGoal(editingId);

    closeModal();
    await loadGoals();
  } catch (error) {
    console.error('Delete goal error:', error.message || error);
    showGoalMessage(error.message || 'Could not delete goal.');
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Delete Goal';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadAccessibilitySettings(),
    loadProfileHeader()
  ]);

  document.getElementById('new-goal-btn').addEventListener('click', () => {
    openModal();
  });

  document.getElementById('search-input').addEventListener('input', renderGoals);
  document.getElementById('status-filter').addEventListener('change', renderGoals);

  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      setActiveTab(button, button.dataset.tab);
    });
  });

  document.getElementById('goals-grid').addEventListener('click', event => {
    const editBtn = event.target.closest('[data-edit]');
    if (!editBtn) return;

    const goal = GOALS.find(item => item.id === Number(editBtn.dataset.edit));
    if (goal) openModal(goal);
  });

  document.getElementById('goal-modal').addEventListener('click', function (event) {
    if (event.target === this) closeModal();
  });

  document.getElementById('cancel-goal-btn').addEventListener('click', closeModal);
  document.getElementById('save-goal-btn').addEventListener('click', saveGoal);
  document.getElementById('delete-goal-btn').addEventListener('click', handleDeleteGoal);

  await loadGoals();
});
