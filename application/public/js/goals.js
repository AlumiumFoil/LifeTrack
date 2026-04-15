'use strict';
/* Goal Management – demo data only, no backend calls */

// ── Data ──────────────────────────────────────────────────────────────────────

let nextGoalId = 7;

let GOALS = [
  { id:1, title:'Complete Research Paper',  category:'Academic', status:'In Progress', date:'2026-04-15', progress:65,  desc:'Write and submit the 10-page research paper for ENGR 301.'         },
  { id:2, title:'Run 5K Without Stopping',  category:'Health',   status:'In Progress', date:'2026-04-20', progress:45,  desc:'Train consistently to run a 5K in under 35 minutes.'               },
  { id:3, title:'Apply to 3 Internships',   category:'Career',   status:'Completed',   date:'2026-03-31', progress:100, desc:'Tailor résumé and submit to three target companies.'               },
  { id:4, title:'Finish Linear Algebra',    category:'Academic', status:'Completed',   date:'2026-03-25', progress:100, desc:'Complete all modules and pass the final exam with a B or higher.'  },
  { id:5, title:'Read 2 Books This Month',  category:'Personal', status:'Not Started', date:'2026-04-30', progress:0,   desc:'Choose and complete two books from the reading list.'              },
  { id:6, title:'Update Portfolio Website', category:'Career',   status:'Overdue',     date:'2026-04-01', progress:30,  desc:'Redesign portfolio and add latest projects from this semester.'    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const BADGE_CLASS = {
  'In Progress': 'badge-in-progress',
  'Completed':   'badge-completed',
  'Not Started': 'badge-not-started',
  'Overdue':     'badge-overdue',
  'Paused':      'badge-paused',
};

function badgeClass(status) {
  return BADGE_CLASS[status] || 'badge-not-started';
}

function formatDate(iso) {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = iso.split('-');
  return `${M[+m - 1]} ${+d}, ${y}`;
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function updateSummary() {
  const now  = Date.now();
  const week = 7 * 864e5; // 7 days in ms
  document.getElementById('stat-total').textContent      = GOALS.length;
  document.getElementById('stat-inprogress').textContent = GOALS.filter(g => g.status === 'In Progress').length;
  document.getElementById('stat-completed').textContent  = GOALS.filter(g => g.status === 'Completed').length;
  // Count goals whose target date falls within the next 7 days
  document.getElementById('stat-week').textContent = GOALS.filter(g => {
    const t = new Date(g.date).getTime();
    return t >= now && t <= now + week;
  }).length;
}

// ── Goal grid ─────────────────────────────────────────────────────────────────

let activeTab = 'all';

function renderGoals() {
  const search  = document.getElementById('search-input').value.toLowerCase();
  const statusF = document.getElementById('status-filter').value;
  const catF    = document.getElementById('cat-filter').value;

  const visible = GOALS.filter(g => {
    if (activeTab !== 'all' && g.status   !== activeTab) return false;
    if (statusF  !== 'all' && g.status   !== statusF)    return false;
    if (catF     !== 'all' && g.category !== catF)       return false;
    if (search && !g.title.toLowerCase().includes(search) &&
                  !g.desc.toLowerCase().includes(search)) return false;
    return true;
  });

  const grid = document.getElementById('goals-grid');

  if (!visible.length) {
    grid.innerHTML = '<p style="color:var(--muted);padding:12px 0">No goals match your filters.</p>';
    return;
  }

  grid.innerHTML = visible.map(g => `
    <div class="card">
      <div class="goal-card-meta">
        <span class="badge ${badgeClass(g.status)}">${g.status}</span>
        <span class="small">${g.category}</span>
      </div>
      <h2 class="card-title">${g.title}</h2>
      <p class="card-desc">${g.desc}</p>
      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill" style="width:${g.progress}%"></div>
        </div>
        <div class="progress-label">
          <span>Progress</span><span>${g.progress}%</span>
        </div>
      </div>
      <div class="goal-card-footer">
        <span class="small">Target: ${formatDate(g.date)}</span>
        <button class="btn secondary sm" data-edit="${g.id}">Edit</button>
      </div>
    </div>
  `).join('');
}

// ── Tab switching — called from HTML inline onclick ────────────────────────────

function setTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeTab = tab;
  renderGoals();
}

// ── Modal ─────────────────────────────────────────────────────────────────────

let editingId = null; // null = creating a new goal, number = editing an existing one

// Called with no args from the "+ New Goal" button; called with a goal object when editing
function openModal(goal) {
  editingId = goal ? goal.id : null;
  document.getElementById('modal-title').textContent = goal ? 'Edit Goal' : 'New Goal';
  document.getElementById('goal-title').value        = goal ? goal.title    : '';
  document.getElementById('goal-cat').value          = goal ? goal.category : 'Academic';
  document.getElementById('goal-status').value       = goal ? goal.status   : 'Not Started';
  document.getElementById('goal-date').value         = goal ? goal.date     : '';
  document.getElementById('goal-progress').value     = goal ? goal.progress : '';
  document.getElementById('goal-desc').value         = goal ? goal.desc     : '';
  document.getElementById('goal-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('goal-modal').classList.remove('open');
  editingId = null;
}

function saveGoal() {
  const title = document.getElementById('goal-title').value.trim();
  if (!title) { alert('Please enter a goal name.'); return; }

  const data = {
    title,
    category: document.getElementById('goal-cat').value,
    status:   document.getElementById('goal-status').value,
    // Default to today if no date was entered
    date:     document.getElementById('goal-date').value || new Date().toISOString().slice(0, 10),
    progress: Math.min(100, Math.max(0, +document.getElementById('goal-progress').value || 0)),
    desc:     document.getElementById('goal-desc').value.trim(),
  };

  if (editingId !== null) {
    const idx = GOALS.findIndex(g => g.id === editingId);
    if (idx !== -1) GOALS[idx] = { ...GOALS[idx], ...data };
  } else {
    GOALS.push({ id: nextGoalId++, ...data });
  }

  closeModal();
  updateSummary();
  renderGoals();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Live filter controls
  document.getElementById('search-input').addEventListener('input', renderGoals);
  document.getElementById('status-filter').addEventListener('change', renderGoals);
  document.getElementById('cat-filter').addEventListener('change', renderGoals);

  // Edit buttons — event delegation avoids attaching a handler per card
  document.getElementById('goals-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-edit]');
    if (!btn) return;
    const goal = GOALS.find(g => g.id === +btn.dataset.edit);
    if (goal) openModal(goal);
  });

  // Close modal when clicking outside the modal box (on the dark backdrop)
  document.getElementById('goal-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // The HTML wired this button to closeModal() only; replace with saveGoal
  const saveBtn = document.querySelector('#goal-modal .modal-actions .btn:not(.secondary)');
  if (saveBtn) {
    saveBtn.removeAttribute('onclick');
    saveBtn.addEventListener('click', saveGoal);
  }

  updateSummary();
  renderGoals();
});
