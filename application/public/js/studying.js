'use strict';

/*
  Academic / Studying page
  Backend-connected version.

  Connected:
  - Assignment Tracker
  - Assignment summary stats
  - Add/Edit/Delete assignments
  - Top-right profile username/avatar
  - Accessibility settings

  Skipped for now:
  - Full course cards
  - Tasks / Study Sessions UI
*/

let assignments = [];
let currentAssignFilter = 'all';

const SESSION_SECS = 25 * 60;
let timerSecs = SESSION_SECS;
let timerTick = null;
let timerRunning = false;

// ── Auth / User Helpers ───────────────────────────────────────────────────────

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function setProfileFromStoredUser() {
  const storedUser = getStoredUser();
  const profileUsernameTop = document.getElementById('profileUsernameTop');

  if (profileUsernameTop) {
    profileUsernameTop.textContent = storedUser?.username || 'Profile';
  }
}

async function loadProfileHeader() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const response = await fetch('/api/users/me/dashboard', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not load profile header.');
    }

    const profile = data.dashboard?.profile || {};
    const profileUsernameTop = document.getElementById('profileUsernameTop');
    const profilePreview = document.getElementById('profilePreview');

    if (profileUsernameTop) {
      profileUsernameTop.textContent = profile.username || 'Profile';
    }

    if (profilePreview && profile.profileThumbnailUrl) {
      profilePreview.src = profile.profileThumbnailUrl;
    }
  } catch (error) {
    console.error('Profile header load error:', error.message || error);
  }
}

// ── Accessibility ─────────────────────────────────────────────────────────────

async function loadAccessibilitySettings() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const response = await fetch('/api/users/me/accessibility', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
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

// ── Backend Calls ─────────────────────────────────────────────────────────────

async function loadAssignments(filter = 'all') {
  const token = getAccessToken();

  if (!token) {
    renderAssignmentError('No saved login found. Please log in again.');
    return;
  }

  const endpoint =
    filter === 'all'
      ? '/api/academic/assignments'
      : `/api/academic/assignments?status=${encodeURIComponent(filter)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not load assignments.');
    }

    assignments = data.assignments || [];
    renderSummaryCards(data.stats || {});
    renderAssignments();
  } catch (error) {
    console.error('Assignment load error:', error.message || error);
    renderAssignmentError('Please refresh the page or log in again.');
  }
}

async function saveAssignment(event) {
  event.preventDefault();

  const token = getAccessToken();
  const assignmentId = document.getElementById('assignmentId').value;

  const payload = {
    title: document.getElementById('assignmentTitle').value.trim(),
    description: document.getElementById('assignmentDescription').value.trim(),
    courseName: document.getElementById('assignmentCourse').value.trim(),
    status: document.getElementById('assignmentStatus').value,
    dueDate: document.getElementById('assignmentDueDate').value || null
  };

  if (!payload.title) {
    showModalMessage('Assignment title is required.', 'error');
    return;
  }

  const isEditing = Boolean(assignmentId);
  const endpoint = isEditing
    ? `/api/academic/assignments/${assignmentId}`
    : '/api/academic/assignments';

  try {
    const response = await fetch(endpoint, {
      method: isEditing ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not save assignment.');
    }

    closeAssignmentModal();
    await loadAssignments(currentAssignFilter);
  } catch (error) {
    showModalMessage(error.message || 'Could not save assignment.', 'error');
  }
}

async function deleteAssignment() {
  const token = getAccessToken();
  const assignmentId = document.getElementById('assignmentId').value;

  if (!assignmentId) return;

  const confirmed = confirm('Delete this assignment? This cannot be undone.');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/academic/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Could not delete assignment.');
    }

    closeAssignmentModal();
    await loadAssignments(currentAssignFilter);
  } catch (error) {
    showModalMessage(error.message || 'Could not delete assignment.', 'error');
  }
}

// ── Formatting Helpers ────────────────────────────────────────────────────────

function formatDate(dateString) {
  if (!dateString) return 'No due date';

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function frontendAssignmentStatus(status) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'graded') return 'Graded';
  if (normalized === 'completed') return 'Submitted';
  return 'Upcoming';
}

function assignBadge(status) {
  const displayStatus = frontendAssignmentStatus(status);

  const map = {
    Upcoming: 'badge-in-progress',
    Submitted: 'badge-paused',
    Graded: 'badge-completed'
  };

  return map[displayStatus] || 'badge-not-started';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function renderSummaryCards(stats) {
  const cards = document.querySelectorAll('.summary-card');
  if (cards.length < 4) return;

  const cardData = [
    { value: stats.total ?? 0, label: 'Total Assignments', className: 'accent' },
    { value: stats.dueThisWeek ?? 0, label: 'Due This Week', className: 'amber' },
    { value: stats.submitted ?? 0, label: 'Submitted', className: 'accent2' },
    { value: stats.graded ?? 0, label: 'Graded', className: 'accent' }
  ];

  cards.forEach((card, index) => {
    const item = cardData[index];

    card.innerHTML = `
      <div class="s-value ${item.className}">${escapeHtml(item.value)}</div>
      <div class="s-label">${escapeHtml(item.label)}</div>
    `;
  });
}

// ── Study Timer ───────────────────────────────────────────────────────────────

function fmtTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60
  ).padStart(2, '0')}`;
}

function updateTimerUI() {
  const display = document.getElementById('timer-display');
  const bar = document.getElementById('timer-bar');

  if (display) display.textContent = fmtTime(timerSecs);

  if (bar) {
    bar.style.width = `${((SESSION_SECS - timerSecs) / SESSION_SECS) * 100}%`;
  }
}

function startTimer() {
  const startBtn = document.getElementById('timer-start');

  if (timerRunning) {
    clearInterval(timerTick);
    timerTick = null;
    timerRunning = false;
    if (startBtn) startBtn.textContent = 'Resume';
    return;
  }

  timerRunning = true;
  if (startBtn) startBtn.textContent = 'Pause';

  timerTick = setInterval(() => {
    timerSecs--;
    updateTimerUI();

    if (timerSecs <= 0) {
      clearInterval(timerTick);
      timerTick = null;
      timerRunning = false;
      if (startBtn) startBtn.textContent = 'Start';

      const label = document.getElementById('timer-label');
      if (label) label.textContent = '✓ Session complete — take a 5-minute break!';
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerTick);
  timerTick = null;
  timerRunning = false;
  timerSecs = SESSION_SECS;

  const startBtn = document.getElementById('timer-start');
  if (startBtn) startBtn.textContent = 'Start';

  const label = document.getElementById('timer-label');
  if (label) label.textContent = 'Study timer ready';

  updateTimerUI();
}

function injectFocusTimer() {
  const summaryRow = document.querySelector('.summary-row');
  if (!summaryRow || document.getElementById('focus-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'focus-panel';
  panel.className = 'card';
  panel.style.cssText = 'margin-top:22px;margin-bottom:4px;';

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">Study Focus</div>
        <div class="small" id="timer-label">Study timer ready</div>
      </div>

      <div style="display:flex;align-items:center;gap:14px;">
        <div id="timer-display"
             style="font-size:2.2rem;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;">
          25:00
        </div>

        <div style="display:flex;gap:8px;">
          <button class="btn sm" id="timer-start">Start</button>
          <button class="btn secondary sm" id="timer-reset">Reset</button>
        </div>
      </div>
    </div>

    <div class="progress-wrap" style="margin-top:12px;">
      <div class="progress-track">
        <div class="progress-fill" id="timer-bar" style="width:0%"></div>
      </div>
    </div>
  `;

  summaryRow.insertAdjacentElement('afterend', panel);

  document.getElementById('timer-start').addEventListener('click', startTimer);
  document.getElementById('timer-reset').addEventListener('click', resetTimer);

  updateTimerUI();
}

// ── Course Cards Placeholder ─────────────────────────────────────────────────

function renderCoursesPlaceholder() {
  const courseGrid = document.getElementById('course-grid');
  if (!courseGrid) return;

  courseGrid.innerHTML = `
    <div class="card">
      <p class="small">
        Course cards will be connected later if/when backend support is expanded.
      </p>
    </div>
  `;
}

// ── Assignments ───────────────────────────────────────────────────────────────

async function filterAssign(btn, filter) {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.classList.remove('active');
  });

  btn.classList.add('active');
  currentAssignFilter = filter;

  await loadAssignments(currentAssignFilter);
}

function renderAssignments() {
  const list = document.getElementById('assign-list');
  if (!list) return;

  if (!assignments.length) {
    list.innerHTML = `
      <div class="assign-item">
        <div class="assign-info">
          <div class="assign-title">No assignments found</div>
          <div class="assign-meta">Use the Add Assignment button to create one.</div>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = assignments
    .map(assignment => {
      const displayStatus = frontendAssignmentStatus(assignment.status);

      return `
        <button class="assign-item assignment-clickable" type="button" data-assignment-id="${assignment.id}">
          <div class="assign-info">
            <div class="assign-title">${escapeHtml(assignment.title)}</div>
            <div class="assign-meta">
              ${escapeHtml(assignment.courseName || 'No course')}
              &nbsp;•&nbsp;
              Due: ${escapeHtml(formatDate(assignment.dueDate))}
              ${
                assignment.description
                  ? `&nbsp;•&nbsp; ${escapeHtml(assignment.description)}`
                  : ''
              }
            </div>
          </div>

          <span class="badge ${assignBadge(assignment.status)}">
            ${escapeHtml(displayStatus)}
          </span>
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('.assignment-clickable').forEach(item => {
    item.addEventListener('click', () => {
      const assignment = assignments.find(a => String(a.id) === String(item.dataset.assignmentId));
      openAssignmentModal(assignment);
    });
  });
}

function renderAssignmentError(message) {
  const list = document.getElementById('assign-list');
  if (!list) return;

  list.innerHTML = `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">Could not load assignments</div>
        <div class="assign-meta">${escapeHtml(message || 'Please refresh the page.')}</div>
      </div>
      <span class="badge badge-not-started">Error</span>
    </div>
  `;
}

// ── Assignment Modal ──────────────────────────────────────────────────────────

function injectAssignmentModal() {
  if (document.getElementById('assignmentModal')) return;

  const modal = document.createElement('div');
  modal.id = 'assignmentModal';
  modal.className = 'assignment-modal-overlay';
  modal.innerHTML = `
    <div class="assignment-modal">
      <div class="assignment-modal-header">
        <h2 id="assignmentModalTitle">Add Assignment</h2>
        <button id="closeAssignmentModalBtn" class="assignment-modal-close" type="button">×</button>
      </div>

      <form id="assignmentForm" class="assignment-form">
        <input id="assignmentId" type="hidden" />

        <label>
          Title
          <input id="assignmentTitle" type="text" maxlength="255" required />
        </label>

        <label>
          Course Name
          <input id="assignmentCourse" type="text" maxlength="150" placeholder="Example: CSC 648" />
        </label>

        <label>
          Due Date
          <input id="assignmentDueDate" type="date" />
        </label>

        <label>
          Status
          <select id="assignmentStatus">
            <option value="not started">Not Started</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed / Submitted</option>
            <option value="graded">Graded</option>
          </select>
        </label>

        <label>
          Description
          <textarea id="assignmentDescription" rows="4"></textarea>
        </label>

        <p id="assignmentModalMessage" class="assignment-modal-message"></p>

        <div class="assignment-modal-actions">
          <button id="deleteAssignmentBtn" class="btn secondary sm danger-btn" type="button">Delete</button>

          <div class="assignment-modal-actions-right">
            <button class="btn secondary sm" type="button" id="cancelAssignmentBtn">Cancel</button>
            <button class="btn sm" type="submit">Save Assignment</button>
          </div>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('assignmentForm').addEventListener('submit', saveAssignment);
  document.getElementById('closeAssignmentModalBtn').addEventListener('click', closeAssignmentModal);
  document.getElementById('cancelAssignmentBtn').addEventListener('click', closeAssignmentModal);
  document.getElementById('deleteAssignmentBtn').addEventListener('click', deleteAssignment);

  modal.addEventListener('click', event => {
    if (event.target === modal) closeAssignmentModal();
  });
}

function openAssignmentModal(assignment = null) {
  const modal = document.getElementById('assignmentModal');
  const title = document.getElementById('assignmentModalTitle');
  const deleteBtn = document.getElementById('deleteAssignmentBtn');

  clearModalMessage();

  document.getElementById('assignmentId').value = assignment?.id || '';
  document.getElementById('assignmentTitle').value = assignment?.title || '';
  document.getElementById('assignmentCourse').value = assignment?.courseName || '';
  document.getElementById('assignmentDueDate').value = assignment?.dueDate || '';
  document.getElementById('assignmentStatus').value = assignment?.status || 'not started';
  document.getElementById('assignmentDescription').value = assignment?.description || '';

  if (title) title.textContent = assignment ? 'Edit Assignment' : 'Add Assignment';
  if (deleteBtn) deleteBtn.style.display = assignment ? 'inline-flex' : 'none';

  modal.classList.add('open');
}

function closeAssignmentModal() {
  const modal = document.getElementById('assignmentModal');
  if (modal) modal.classList.remove('open');
}

function showModalMessage(message, type = 'error') {
  const modalMessage = document.getElementById('assignmentModalMessage');
  if (!modalMessage) return;

  modalMessage.textContent = message;
  modalMessage.className = `assignment-modal-message ${type}`;
}

function clearModalMessage() {
  const modalMessage = document.getElementById('assignmentModalMessage');
  if (!modalMessage) return;

  modalMessage.textContent = '';
  modalMessage.className = 'assignment-modal-message';
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  setProfileFromStoredUser();

  await loadAccessibilitySettings();
  await loadProfileHeader();

  injectFocusTimer();
  injectAssignmentModal();
  renderCoursesPlaceholder();

  const addAssignmentBtn = document.getElementById('addAssignmentBtn');
  if (addAssignmentBtn) {
    addAssignmentBtn.addEventListener('click', () => openAssignmentModal());
  }

  await loadAssignments(currentAssignFilter);
});