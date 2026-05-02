'use strict';

/*
  Academic / Studying page
  Backend-connected version.

  Currently connected:
  - Assignment Tracker
  - Assignment summary stats

  Skipped for now:
  - Full course cards
    Reason: backend currently derives courses from assignments only.
    Future: reconnect when backend adds full course support
    such as instructor, credits, grade, course progress, etc.

  - Tasks / Study Sessions UI
    Reason: backend supports these, but studying.html does not currently
    have UI sections for them.
    Future: add sections/forms if the team decides to expose them here.
*/

// ── State ─────────────────────────────────────────────────────────────────────

let assignments = [];
let currentAssignFilter = 'all';

const SESSION_SECS = 25 * 60;
let timerSecs = SESSION_SECS;
let timerTick = null;
let timerRunning = false;
let focusedCourse = null;

// ── Auth / Accessibility ──────────────────────────────────────────────────────

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

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
    window.location.href = './auth.html';
    //console.warn('No access token found. User may need to log in.');
    //renderAssignmentError();
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
    renderAssignmentError();
  }
}

// ── Formatting Helpers ────────────────────────────────────────────────────────

function formatDate(dateString) {
  if (!dateString) return 'No due date';

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

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
  if (normalized === 'in progress' || normalized === 'not started') {
    return 'Upcoming';
  }

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
    {
      value: stats.total ?? 0,
      label: 'Total Assignments',
      className: 'accent'
    },
    {
      value: stats.dueThisWeek ?? 0,
      label: 'Due This Week',
      className: 'amber'
    },
    {
      value: stats.submitted ?? 0,
      label: 'Submitted',
      className: 'accent2'
    },
    {
      value: stats.graded ?? 0,
      label: 'Graded',
      className: 'accent'
    }
  ];

  cards.forEach((card, index) => {
    const item = cardData[index];
    if (!item) return;

    card.innerHTML = `
      <div class="s-value ${item.className}">${escapeHtml(item.value)}</div>
      <div class="s-label">${escapeHtml(item.label)}</div>
    `;
  });
}

// ── Study Focus Timer ─────────────────────────────────────────────────────────

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
    const percent = ((SESSION_SECS - timerSecs) / SESSION_SECS) * 100;
    bar.style.width = `${percent}%`;
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
      if (label) {
        label.textContent = '✓ Session complete — take a 5-minute break!';
      }
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
  if (label) {
    label.textContent = focusedCourse
      ? `Studying: ${focusedCourse}`
      : 'Study timer ready';
  }

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

// ── Course Cards ──────────────────────────────────────────────────────────────

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

// ── Assignment Tracker ────────────────────────────────────────────────────────

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
          <div class="assign-meta">Assignments will appear here once they are added.</div>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = assignments
    .map(assignment => {
      const displayStatus = frontendAssignmentStatus(assignment.status);

      return `
        <div class="assign-item">
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
        </div>
      `;
    })
    .join('');
}

function renderAssignmentError() {
  const list = document.getElementById('assign-list');
  if (!list) return;

  list.innerHTML = `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">Could not load assignments</div>
        <div class="assign-meta">Please refresh the page or log in again.</div>
      </div>
      <span class="badge badge-not-started">Error</span>
    </div>
  `;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccessibilitySettings();

  injectFocusTimer();
  renderCoursesPlaceholder();

  await loadAssignments(currentAssignFilter);
});