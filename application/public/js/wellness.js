const MOODS = [
  { emoji: '😄', label: 'Great'   },
  { emoji: '🙂', label: 'Good'    },
  { emoji: '😐', label: 'Okay'    },
  { emoji: '😔', label: 'Low'     },
  { emoji: '😰', label: 'Stressed'},
];

const HABITS = [
  { id: 'sleep',    label: 'Slept 7–9 hours',                streak: '4-day streak' },
  { id: 'water',    label: 'Drank 8 glasses of water',       streak: '2-day streak' },
  { id: 'exercise', label: '30 min of exercise',             streak: '1-day streak' },
  { id: 'mindful',  label: '10 min mindfulness / meditation', streak: '3-day streak' },
  { id: 'screen',   label: 'Limited screen time before bed', streak: '0-day streak' },
];

const HISTORY = [
  { emoji: '😄', mood: 'Great',   date: 'Mon Apr 6',  stress: 3, note: 'Finished milestone planning. Feeling productive.' },
  { emoji: '🙂', mood: 'Good',    date: 'Sun Apr 5',  stress: 4, note: 'Went for a long walk. Good rest day.'             },
  { emoji: '😐', mood: 'Okay',    date: 'Sat Apr 4',  stress: 6, note: 'Busy with assignments. Took breaks throughout.'   },
  { emoji: '😰', mood: 'Stressed',date: 'Fri Apr 3',  stress: 8, note: 'Deadline crunch. Skipped exercise.'               },
  { emoji: '🙂', mood: 'Good',    date: 'Thu Apr 2',  stress: 3, note: 'Study group session was very helpful.'            },
];

const RESOURCES = [
  {
    title: 'Campus Counseling',
    desc: 'SFSU Student Health Services offers free counseling sessions for enrolled students. Book an appointment online.',
    link: '#',
  },
  {
    title: '5-Minute Breathing Exercise',
    desc: 'Box breathing: inhale 4 s, hold 4 s, exhale 4 s, hold 4 s. Repeat 4 times to reduce acute stress.',
    link: '#',
  },
  {
    title: 'Healthy Sleep Tips',
    desc: 'Keep a consistent sleep schedule, avoid caffeine after 2 PM, and keep your room dark and cool for better rest.',
    link: '#',
  },
];

let selectedMood = null;

/* ── Mood selector ── */

function renderMoods() {
  document.getElementById('mood-grid').innerHTML = MOODS.map(m => `
    <button class="mood-btn${selectedMood === m.label ? ' selected' : ''}"
            onclick="selectMood('${m.label}', this)">
      <span class="mood-emoji">${m.emoji}</span>
      ${m.label}
    </button>
  `).join('');
}

function selectMood(label, btn) {
  selectedMood = label;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function submitCheckin() {
  if (!selectedMood) {
    alert('Please select a mood first.');
    return;
  }
  const stress = document.getElementById('stress-slider').value;
  alert(`Check-in saved!\nMood: ${selectedMood}  |  Stress: ${stress}/10\n\n(Demo only — no data is persisted)`);
}

function resetCheckin() {
  selectedMood = null;
  document.getElementById('stress-slider').value = 4;
  document.getElementById('stress-val').textContent = '4';
  renderMoods();
}

/* ── Habit checklist ── */

function renderHabits() {
  document.getElementById('habit-list').innerHTML = HABITS.map(h => `
    <div class="habit-item" id="habit-item-${h.id}" onclick="toggleHabit('${h.id}')">
      <input type="checkbox" id="chk-${h.id}"
             onclick="event.stopPropagation()"
             onchange="syncHabit('${h.id}')" />
      <span class="habit-label">${h.label}</span>
      <span class="habit-streak">${h.streak}</span>
    </div>
  `).join('');
}

function toggleHabit(id) {
  const chk = document.getElementById('chk-' + id);
  chk.checked = !chk.checked;
  syncHabit(id);
}

function syncHabit(id) {
  const chk  = document.getElementById('chk-' + id);
  const item = document.getElementById('habit-item-' + id);
  item.classList.toggle('checked', chk.checked);
}

/* ── Check-in history ── */

function renderHistory() {
  document.getElementById('history-list').innerHTML = HISTORY.map(h => `
    <div class="history-item">
      <div class="history-emoji">${h.emoji}</div>
      <div class="history-info">
        <div class="history-note">${h.note}</div>
        <div class="history-date">${h.date} &nbsp;•&nbsp; Mood: ${h.mood} &nbsp;•&nbsp; Stress: ${h.stress}/10</div>
      </div>
    </div>
  `).join('');
}

/* ── Wellness resources ── */

function renderResources() {
  document.getElementById('resources-grid').innerHTML = RESOURCES.map(r => `
    <div class="card">
      <h2 class="card-title">${r.title}</h2>
      <p class="card-desc">${r.desc}</p>
      <a class="btn secondary sm" href="${r.link}">Learn More</a>
    </div>
  `).join('');
}

renderMoods();
renderHabits();
renderHistory();
renderResources();
