const GOALS = [
  {
    id: 1,
    title: 'Complete Research Paper',
    category: 'Academic',
    status: 'In Progress',
    date: '2026-04-15',
    desc: 'Write and submit the final 10-page research paper for ENGR 301.',
    progress: 65,
  },
  {
    id: 2,
    title: 'Run 5K Without Stopping',
    category: 'Health',
    status: 'In Progress',
    date: '2026-04-20',
    desc: 'Train consistently to complete a 5K run in under 35 minutes.',
    progress: 45,
  },
  {
    id: 3,
    title: 'Apply to 3 Internships',
    category: 'Career',
    status: 'Completed',
    date: '2026-03-31',
    desc: 'Research, tailor résumé, and submit applications to target companies.',
    progress: 100,
  },
  {
    id: 4,
    title: 'Finish Linear Algebra Course',
    category: 'Academic',
    status: 'Completed',
    date: '2026-03-25',
    desc: 'Complete all modules and pass the final exam with a B or higher.',
    progress: 100,
  },
  {
    id: 5,
    title: 'Read 2 Books This Month',
    category: 'Personal',
    status: 'Not Started',
    date: '2026-04-30',
    desc: 'Choose and complete two books from the reading list.',
    progress: 0,
  },
  {
    id: 6,
    title: 'Update Portfolio Website',
    category: 'Career',
    status: 'Overdue',
    date: '2026-04-01',
    desc: 'Redesign personal portfolio and add latest projects from this semester.',
    progress: 30,
  },
];

let currentTab = 'all';

function badgeClass(status) {
  const map = {
    'In Progress': 'badge-in-progress',
    'Completed':   'badge-completed',
    'Not Started': 'badge-not-started',
    'Overdue':     'badge-overdue',
    'Paused':      'badge-paused',
  };
  return map[status] || 'badge-not-started';
}

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, day] = d.split('-');
  return `${months[+m - 1]} ${+day}, ${y}`;
}

function renderGoals() {
  const search  = document.getElementById('search-input').value.toLowerCase();
  const statusF = document.getElementById('status-filter').value;
  const catF    = document.getElementById('cat-filter').value;

  const list = GOALS.filter(g => {
    if (currentTab !== 'all' && g.status !== currentTab) return false;
    if (statusF !== 'all' && g.status !== statusF) return false;
    if (catF !== 'all' && g.category !== catF) return false;
    if (search && !g.title.toLowerCase().includes(search) && !g.desc.toLowerCase().includes(search)) return false;
    return true;
  });

  const grid = document.getElementById('goals-grid');

  if (list.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted); padding:12px 0;">No goals match your filters.</p>';
    return;
  }

  grid.innerHTML = list.map(g => `
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
          <span>Progress</span>
          <span>${g.progress}%</span>
        </div>
      </div>
      <div class="goal-card-footer">
        <span class="small">Target: ${formatDate(g.date)}</span>
        <button class="btn secondary sm" onclick="editGoal(${g.id})">Edit</button>
      </div>
    </div>
  `).join('');
}

function setTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = tab;
  renderGoals();
}

function openModal(data) {
  const modal = document.getElementById('goal-modal');
  if (data) {
    document.getElementById('modal-title').textContent   = 'Edit Goal';
    document.getElementById('goal-title').value          = data.title;
    document.getElementById('goal-cat').value            = data.category;
    document.getElementById('goal-status').value         = data.status;
    document.getElementById('goal-date').value           = data.date;
    document.getElementById('goal-progress').value       = data.progress;
    document.getElementById('goal-desc').value           = data.desc;
  } else {
    document.getElementById('modal-title').textContent   = 'New Goal';
    document.getElementById('goal-title').value          = '';
    document.getElementById('goal-cat').value            = 'Academic';
    document.getElementById('goal-status').value         = 'Not Started';
    document.getElementById('goal-date').value           = '';
    document.getElementById('goal-progress').value       = '';
    document.getElementById('goal-desc').value           = '';
  }
  modal.classList.add('open');
}

function editGoal(id) {
  const g = GOALS.find(x => x.id === id);
  if (g) openModal(g);
}

function closeModal() {
  document.getElementById('goal-modal').classList.remove('open');
}

document.getElementById('goal-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.getElementById('search-input').addEventListener('input', renderGoals);
document.getElementById('status-filter').addEventListener('change', renderGoals);
document.getElementById('cat-filter').addEventListener('change', renderGoals);

renderGoals();
