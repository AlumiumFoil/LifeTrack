'use strict';

// ── Accessibility (matches pattern used across dashboard pages) ────────────────

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

async function loadAccessibilitySettings() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const res = await fetch('/api/users/me/accessibility', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    applyAccessibilitySettings(data.accessibility);
  } catch (err) {
    console.error('Accessibility settings load error:', err);
  }
}

function applyAccessibilitySettings(accessibility) {
  if (!accessibility) return;

  const themeMode  = accessibility.themeMode  || 'dark';
  const textSize   = accessibility.textSize   || 'normal';
  const highContrast =
    accessibility.highContrastEnabled === true  ||
    accessibility.highContrastEnabled === 1     ||
    accessibility.highContrastEnabled === '1';

  const isAccessibilityMode = themeMode === 'light' && textSize === 'large' && highContrast;

  document.body.setAttribute(
    'data-accessibility-mode',
    isAccessibilityMode ? 'accessibility' : 'default',
  );
}

// ── Career Resources ──────────────────────────────────────────────────────────

// Converts a backend-relative URL like "resources/resume.html" to a path that
// works from jobpreparation.html in pages/: "./resources/resume.html".
// Full external URLs (http/https) and already-prefixed paths are left unchanged.
function resolveResourceUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;          // external link
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
  return './' + url;                                   // bare relative path
}

async function loadCareerResources() {
  const container = document.getElementById('careerResources');

  try {
    const res = await fetch('/api/career/resources');

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--muted)">Unable to load career resources.</p>';
      return;
    }

    const data = await res.json();
    // API returns { success, resources: [...] }
    const resources = data.resources || [];

    if (!resources.length) {
      container.innerHTML = '<p style="color:var(--muted)">Career resources are not available right now.</p>';
      return;
    }

    container.innerHTML = resources.map(r => {
      // API field is contentType; fall back to category as secondary label
      const pill = r.contentType || r.category || '';
      const href = resolveResourceUrl(r.url);
      const isExternal = href && /^https?:\/\//i.test(href);
      const viewBtn = href
        ? `<a class="btn secondary sm" href="${href}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>View Resource</a>`
        : '';

      return `
        <div class="card">
          ${pill ? `<div class="goal-card-meta"><span class="badge">${pill}</span></div>` : ''}
          <h2 class="card-title">${r.title || 'Untitled'}</h2>
          <p class="card-desc">${r.description || ''}</p>
          ${viewBtn}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Career resources error:', err);
    container.innerHTML = '<p style="color:var(--muted)">Unable to load career resources.</p>';
  }
}

// ── Career Goals ──────────────────────────────────────────────────────────────

// Escape user/API text before inserting as HTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Format a date string for display.
// Parses YYYY-MM-DD as local midnight (not UTC) to avoid timezone off-by-one issues.
function fmtDate(iso) {
  if (!iso) return '';
  const s = String(iso).slice(0, 10); // normalise to "YYYY-MM-DD"
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const GOAL_BADGE = {
  'In Progress': 'badge-in-progress',
  'Completed':   'badge-completed',
  'Not Started': 'badge-not-started',
};

function goalBadgeClass(status) {
  return GOAL_BADGE[status] || 'badge-not-started';
}

// ── Module state ──────────────────────────────────────────────────────────────

let allGoals       = [];   // full list from the last successful GET
let activeGoalTab  = 'all'; // current filter tab
let editingGoalId  = null;  // null = creating, number = editing

// ── Summary cards ─────────────────────────────────────────────────────────────

function updateGoalSummary() {
  const summary = document.getElementById('goals-summary');
  const tabBar  = document.getElementById('goals-tab-bar');
  if (summary) summary.style.display = allGoals.length ? '' : 'none';
  if (tabBar)  tabBar.style.display  = allGoals.length ? '' : 'none';

  const notStarted = allGoals.filter(g => g.status === 'Not Started').length;
  const inProgress = allGoals.filter(g => g.status === 'In Progress').length;
  const completed  = allGoals.filter(g => g.status === 'Completed').length;

  setText('cg-total',       allGoals.length);
  setText('cg-not-started', notStarted);
  setText('cg-in-progress', inProgress);
  setText('cg-completed',   completed);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Goal cards renderer ───────────────────────────────────────────────────────

function renderGoalCards() {
  const container = document.getElementById('careerGoals');
  const filtered  = activeGoalTab === 'all'
    ? allGoals
    : allGoals.filter(g => g.status === activeGoalTab);

  if (!filtered.length) {
    const msg = activeGoalTab === 'all'
      ? 'No career goals yet. Click <strong>+ New Career Goal</strong> to add one.'
      : `No goals with status <strong>${esc(activeGoalTab)}</strong>.`;
    container.innerHTML = `<p style="color:var(--muted)">${msg}</p>`;
    return;
  }

  container.innerHTML = filtered.map(g => {
    const id         = g.careerGoalId || g.id;
    const status     = g.status     || '';
    const targetRole = g.targetRole || '';
    const targetDate = fmtDate(g.targetDate);
    const desc       = g.description || '';

    return `
      <div class="card">
        <div class="goal-card-meta">
          ${status     ? `<span class="badge ${goalBadgeClass(status)}">${esc(status)}</span>` : ''}
          ${targetRole ? `<span class="small">${esc(targetRole)}</span>` : ''}
        </div>
        <h2 class="card-title">${esc(g.title || 'Untitled Goal')}</h2>
        ${desc       ? `<p class="card-desc">${esc(desc)}</p>` : ''}
        ${targetDate ? `<p class="small" style="margin-top:8px">Target: ${esc(targetDate)}</p>` : ''}
        <div class="goal-card-footer">
          <button class="btn secondary sm" onclick="openGoalModal(${id})">Edit</button>
          <button class="btn danger sm" onclick="deleteGoal(${id})">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Load goals from API ───────────────────────────────────────────────────────

async function loadCareerGoals() {
  const container = document.getElementById('careerGoals');
  const token     = getAccessToken();

  if (!token) {
    container.innerHTML = '<p style="color:var(--muted)">Log in to see your career goals here.</p>';
    return;
  }

  container.innerHTML = '<p style="color:var(--muted)">Loading career goals…</p>';

  try {
    const res = await fetch('/api/career/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      container.innerHTML = '<p style="color:var(--muted)">Your session has expired. Please log in again.</p>';
      return;
    }
    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--muted)">Unable to load career goals.</p>';
      return;
    }

    const data = await res.json();
    // API returns { success, goals: [...] }
    allGoals = data.goals || [];
    updateGoalSummary();
    renderGoalCards();

  } catch (err) {
    console.error('Career goals error:', err);
    container.innerHTML = '<p style="color:var(--muted)">Unable to load career goals.</p>';
  }
}

// ── Feedback message ──────────────────────────────────────────────────────────

function showGoalFeedback(text, type) {
  const el = document.getElementById('goals-feedback');
  if (!el) return;
  el.innerHTML = `<div class="status-message ${type}">${esc(text)}</div>`;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

// Open the modal for create (no arg) or edit (pass goal object)
function openGoalModal(goalIdOrObj) {
  const modal = document.getElementById('career-goal-modal');
  const msgEl = document.getElementById('cg-modal-msg');

  // Find the goal object if an ID was passed
  let goal = null;
  if (goalIdOrObj !== undefined) {
    goal = typeof goalIdOrObj === 'object'
      ? goalIdOrObj
      : allGoals.find(g => (g.careerGoalId || g.id) === goalIdOrObj) || null;
  }

  editingGoalId = goal ? (goal.careerGoalId || goal.id) : null;

  setText('cg-modal-title', goal ? 'Edit Career Goal' : 'New Career Goal');
  if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }

  // Pre-fill or clear fields
  setVal('cg-title',  goal ? (goal.title || '')       : '');
  setVal('cg-role',   goal ? (goal.targetRole || '')  : '');
  setVal('cg-status', goal ? (goal.status || 'Not Started') : 'Not Started');
  setVal('cg-date',   goal ? (goal.targetDate ? goal.targetDate.slice(0, 10) : '') : '');
  setVal('cg-desc',   goal ? (goal.description || '') : '');

  // Show delete button only when editing
  const delBtn = document.getElementById('cg-delete-btn');
  if (delBtn) delBtn.style.display = goal ? 'inline-block' : 'none';

  modal.classList.add('open');
}

function closeGoalModal() {
  document.getElementById('career-goal-modal').classList.remove('open');
  editingGoalId = null;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ── Save (create or update) ───────────────────────────────────────────────────

async function saveGoal() {
  const token = getAccessToken();
  if (!token) { showModalMsg('Please log in to save goals.', 'error'); return; }

  const title      = document.getElementById('cg-title').value.trim();
  const targetRole = document.getElementById('cg-role').value.trim();
  const status     = document.getElementById('cg-status').value;
  const targetDate = document.getElementById('cg-date').value;
  const description = document.getElementById('cg-desc').value.trim();

  // Client-side validation
  if (!title) {
    showModalMsg('Goal title is required.', 'error');
    return;
  }
  if (title.length > 255) {
    showModalMsg('Title must be 255 characters or fewer.', 'error');
    return;
  }
  if (targetRole.length > 150) {
    showModalMsg('Target role must be 150 characters or fewer.', 'error');
    return;
  }
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    showModalMsg('Target date must be in YYYY-MM-DD format.', 'error');
    return;
  }

  const body = { title, description, targetRole, status, targetDate: targetDate || null };
  const isEditing = editingGoalId !== null;
  const url    = isEditing ? `/api/career/goals/${editingGoalId}` : '/api/career/goals';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) { showModalMsg('Session expired. Please log in again.', 'error'); return; }
    if (!res.ok) { showModalMsg(data.error || 'Unable to save goal. Please try again.', 'error'); return; }

    closeGoalModal();
    showGoalFeedback(isEditing ? 'Goal updated successfully.' : 'Career goal added!', 'success');
    await loadCareerGoals();

  } catch (err) {
    console.error('Save goal error:', err);
    showModalMsg('Unable to reach the server. Please try again.', 'error');
  }
}

function showModalMsg(text, type) {
  const el = document.getElementById('cg-modal-msg');
  if (!el) return;
  el.textContent  = text;
  el.className    = `status-message ${type}`;
  el.style.display = 'block';
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteGoal(goalId) {
  if (!confirm('Delete this career goal? This cannot be undone.')) return;

  const token = getAccessToken();
  if (!token) { showGoalFeedback('Please log in to delete goals.', 'error'); return; }

  try {
    const res = await fetch(`/api/career/goals/${goalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) { showGoalFeedback('Session expired. Please log in again.', 'error'); return; }
    if (!res.ok) { showGoalFeedback('Unable to delete goal. Please try again.', 'error'); return; }

    // Close modal if open (delete can be triggered from inside the modal too)
    closeGoalModal();
    showGoalFeedback('Career goal deleted.', 'success');
    await loadCareerGoals();

  } catch (err) {
    console.error('Delete goal error:', err);
    showGoalFeedback('Unable to reach the server. Please try again.', 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccessibilitySettings();
  loadCareerResources();
  loadCareerGoals();

  // Open modal for a new goal
  document.getElementById('new-goal-btn').addEventListener('click', () => openGoalModal());

  // Modal save / cancel / delete
  document.getElementById('cg-save-btn').addEventListener('click', saveGoal);
  document.getElementById('cg-cancel-btn').addEventListener('click', closeGoalModal);
  document.getElementById('cg-delete-btn').addEventListener('click', () => {
    if (editingGoalId !== null) deleteGoal(editingGoalId);
  });

  // Close modal on backdrop click
  document.getElementById('career-goal-modal').addEventListener('click', function (e) {
    if (e.target === this) closeGoalModal();
  });

  // Tab filtering
  document.getElementById('goals-tab-bar').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('#goals-tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGoalTab = btn.dataset.tab;
    renderGoalCards();
  });
});
