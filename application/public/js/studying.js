'use strict';
/* Academic / Studying page – demo data only, no backend calls */

// ── Data ──────────────────────────────────────────────────────────────────────

const COURSES = [
  { code:'CSC 648',  name:'Software Engineering',         instructor:'Dr. Rahman',    grade:'A-', credits:3, status:'In Progress', progress:72 },
  { code:'CSC 510',  name:'Software Engineering Process', instructor:'Prof. Nguyen',  grade:'B+', credits:3, status:'In Progress', progress:65 },
  { code:'MATH 301', name:'Linear Algebra',               instructor:'Dr. Kapoor',    grade:'A',  credits:3, status:'In Progress', progress:80 },
  { code:'CSC 415',  name:'Operating Systems',            instructor:'Prof. Martinez',grade:'B',  credits:3, status:'In Progress', progress:58 },
  { code:'CSC 340',  name:'Programming Methodology',      instructor:'Dr. Chen',      grade:'A',  credits:3, status:'In Progress', progress:88 },
];

const ASSIGNMENTS = [
  { id:1, course:'CSC 648',  title:'Milestone 3 – Prototype Demo',  due:'Apr 11, 2026', status:'Upcoming',  type:'Project'                },
  { id:2, course:'CSC 510',  title:'Process Improvement Report',    due:'Apr 9,  2026', status:'Upcoming',  type:'Report'                 },
  { id:3, course:'MATH 301', title:'Problem Set 8',                 due:'Apr 10, 2026', status:'Upcoming',  type:'Homework'               },
  { id:4, course:'CSC 415',  title:'Thread Scheduling Lab',         due:'Apr 7,  2026', status:'Submitted', type:'Lab'                    },
  { id:5, course:'CSC 340',  title:'Design Patterns Quiz',          due:'Apr 3,  2026', status:'Graded',    type:'Quiz',   score:'94/100' },
  { id:6, course:'CSC 648',  title:'Milestone 2 – ER Diagram',     due:'Mar 21, 2026', status:'Graded',    type:'Project',score:'88/100' },
  { id:7, course:'MATH 301', title:'Midterm Exam',                  due:'Mar 18, 2026', status:'Graded',    type:'Exam',   score:'91/100' },
  { id:8, course:'CSC 510',  title:'Agile Sprint Retrospective',    due:'Mar 14, 2026', status:'Graded',    type:'Report', score:'96/100' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function gradeColor(g) {
  if (g.startsWith('A')) return '#4ade80';
  if (g.startsWith('B')) return '#4da3ff';
  if (g.startsWith('C')) return '#fbbf24';
  return '#f87171';
}

function assignBadge(status) {
  const map = { Upcoming:'badge-in-progress', Submitted:'badge-paused', Graded:'badge-completed' };
  return map[status] || 'badge-not-started';
}

// ── Study focus timer (injected into the page) ────────────────────────────────

const SESSION_SECS = 25 * 60; // standard 25-minute Pomodoro session
let timerSecs    = SESSION_SECS;
let timerTick    = null;
let timerRunning = false;
let focusedCode  = null; // course code currently being studied

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

function updateTimerUI() {
  const display = document.getElementById('timer-display');
  const bar     = document.getElementById('timer-bar');
  if (display) display.textContent = fmtTime(timerSecs);
  if (bar) bar.style.width = ((SESSION_SECS - timerSecs) / SESSION_SECS * 100) + '%';
}

function startTimer() {
  const startBtn = document.getElementById('timer-start');
  if (timerRunning) {
    // Pause the running timer
    clearInterval(timerTick);
    timerTick    = null;
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
      timerRunning = false;
      if (startBtn) startBtn.textContent = 'Start';
      const lbl = document.getElementById('timer-label');
      if (lbl) lbl.textContent = '✓ Session complete — take a 5-minute break!';
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerTick);
  timerTick    = null;
  timerRunning = false;
  timerSecs    = SESSION_SECS;
  const startBtn = document.getElementById('timer-start');
  if (startBtn) startBtn.textContent = 'Start';
  // Restore focus label
  const lbl = document.getElementById('timer-label');
  if (lbl) {
    const c = COURSES.find(c => c.code === focusedCode);
    lbl.textContent = c ? `Studying: ${c.code} – ${c.name}` : 'Click a course card to set your focus';
  }
  updateTimerUI();
}

function setFocus(code) {
  focusedCode = code;
  const course = COURSES.find(c => c.code === code);
  const lbl = document.getElementById('timer-label');
  if (lbl && course) lbl.textContent = `Studying: ${course.code} – ${course.name}`;
  // Re-render so the focused card shows the active state
  renderCourses();
}

// Inject a study focus panel between the summary row and the courses section
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
        <div class="small" id="timer-label">Click a course card to set your focus</div>
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
  // Normalise the initial display text (template literal leaves leading whitespace)
  updateTimerUI();
}

// ── Courses grid ──────────────────────────────────────────────────────────────

function renderCourses() {
  document.getElementById('course-grid').innerHTML = COURSES.map(c => {
    const focused = c.code === focusedCode;
    return `
      <div class="course-card"
           data-focus="${c.code}"
           style="cursor:pointer;transition:border-color 0.2s;${focused ? 'border-color:var(--accent);' : ''}">
        <div class="course-card-header">
          <div>
            <div class="course-code">${c.code}</div>
            <div class="course-name">${c.name}</div>
          </div>
          <div class="course-grade" style="color:${gradeColor(c.grade)}">${c.grade}</div>
        </div>
        <div class="course-meta">${c.instructor} &nbsp;•&nbsp; ${c.credits} credits</div>
        <div class="progress-wrap">
          <div class="progress-track">
            <div class="progress-fill" style="width:${c.progress}%"></div>
          </div>
          <div class="progress-label">
            <span>Completion</span><span>${c.progress}%</span>
          </div>
        </div>
        <div class="course-footer">
          <span class="badge ${focused ? 'badge-completed' : 'badge-in-progress'}">
            ${focused ? '▶ Focused' : c.status}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ── Assignment tracker ────────────────────────────────────────────────────────

let assignFilter = 'all';

// Called from HTML inline onclick on the tab buttons
function filterAssign(btn, filter) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  assignFilter = filter;
  renderAssignments();
}

function renderAssignments() {
  const list = ASSIGNMENTS.filter(a => assignFilter === 'all' || a.status === assignFilter);

  document.getElementById('assign-list').innerHTML = list.map(a => `
    <div class="assign-item">
      <div class="assign-info">
        <div class="assign-title">${a.title}</div>
        <div class="assign-meta">
          ${a.course} &nbsp;•&nbsp; ${a.type} &nbsp;•&nbsp; Due: ${a.due}
          ${a.score ? ' &nbsp;•&nbsp; Score: ' + a.score : ''}
        </div>
      </div>
      <span class="badge ${assignBadge(a.status)}">${a.status}</span>
    </div>
  `).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  injectFocusTimer();

  // Course card click sets the active focus course; uses delegation so
  // re-renders don't break the listener
  document.getElementById('course-grid').addEventListener('click', e => {
    const card = e.target.closest('[data-focus]');
    if (card) setFocus(card.dataset.focus);
  });

  renderCourses();
  renderAssignments();
});
