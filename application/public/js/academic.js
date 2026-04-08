const COURSES = [
  {
    code: 'CSC 648',
    name: 'Software Engineering',
    instructor: 'Dr. Rahman',
    grade: 'A-',
    credits: 3,
    status: 'In Progress',
    progress: 72,
  },
  {
    code: 'CSC 510',
    name: 'Software Engineering Process',
    instructor: 'Prof. Nguyen',
    grade: 'B+',
    credits: 3,
    status: 'In Progress',
    progress: 65,
  },
  {
    code: 'MATH 301',
    name: 'Linear Algebra',
    instructor: 'Dr. Kapoor',
    grade: 'A',
    credits: 3,
    status: 'In Progress',
    progress: 80,
  },
  {
    code: 'CSC 415',
    name: 'Operating Systems',
    instructor: 'Prof. Martinez',
    grade: 'B',
    credits: 3,
    status: 'In Progress',
    progress: 58,
  },
  {
    code: 'CSC 340',
    name: 'Programming Methodology',
    instructor: 'Dr. Chen',
    grade: 'A',
    credits: 3,
    status: 'In Progress',
    progress: 88,
  },
];

const ASSIGNMENTS = [
  { id: 1, course: 'CSC 648',  title: 'Milestone 3 – Prototype Demo',    due: 'Apr 11, 2026', status: 'Upcoming',  type: 'Project'  },
  { id: 2, course: 'CSC 510',  title: 'Process Improvement Report',       due: 'Apr 9, 2026',  status: 'Upcoming',  type: 'Report'   },
  { id: 3, course: 'MATH 301', title: 'Problem Set 8',                    due: 'Apr 10, 2026', status: 'Upcoming',  type: 'Homework' },
  { id: 4, course: 'CSC 415',  title: 'Thread Scheduling Lab',            due: 'Apr 7, 2026',  status: 'Submitted', type: 'Lab'      },
  { id: 5, course: 'CSC 340',  title: 'Design Patterns Quiz',             due: 'Apr 3, 2026',  status: 'Graded',    type: 'Quiz',    score: '94/100' },
  { id: 6, course: 'CSC 648',  title: 'Milestone 2 – ER Diagram',        due: 'Mar 21, 2026', status: 'Graded',    type: 'Project', score: '88/100' },
  { id: 7, course: 'MATH 301', title: 'Midterm Exam',                     due: 'Mar 18, 2026', status: 'Graded',    type: 'Exam',    score: '91/100' },
  { id: 8, course: 'CSC 510',  title: 'Agile Sprint Retrospective',       due: 'Mar 14, 2026', status: 'Graded',    type: 'Report',  score: '96/100' },
];

function gradeColor(g) {
  if (g.startsWith('A')) return '#4ade80';
  if (g.startsWith('B')) return '#4da3ff';
  if (g.startsWith('C')) return '#fbbf24';
  return '#f87171';
}

function renderCourses() {
  document.getElementById('course-grid').innerHTML = COURSES.map(c => `
    <div class="course-card">
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
          <span>Completion</span>
          <span>${c.progress}%</span>
        </div>
      </div>
      <div class="course-footer">
        <span class="badge badge-in-progress">${c.status}</span>
      </div>
    </div>
  `).join('');
}

let currentAssignFilter = 'all';

function filterAssign(btn, filter) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentAssignFilter = filter;
  renderAssignments();
}

function assignBadge(status) {
  if (status === 'Upcoming')  return 'badge-in-progress';
  if (status === 'Submitted') return 'badge-paused';
  if (status === 'Graded')    return 'badge-completed';
  return 'badge-not-started';
}

function renderAssignments() {
  const list = ASSIGNMENTS.filter(a =>
    currentAssignFilter === 'all' || a.status === currentAssignFilter
  );
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

renderCourses();
renderAssignments();
