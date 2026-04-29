'use strict';

// ── Data ──────────────────────────────────────────────────────────────────────

// Mood labels match backend spec exactly: Great | Good | Okay | Low | Struggling
const MOODS = [
  { emoji:'😄', label:'Great'      },
  { emoji:'🙂', label:'Good'       },
  { emoji:'😐', label:'Okay'       },
  { emoji:'😔', label:'Low'        },
  { emoji:'😰', label:'Struggling' },
];

const HABITS = [
  { id:'sleep',    label:'Slept 7–9 hours',                 streak:'4-day streak' },
  { id:'water',    label:'Drank 8 glasses of water',        streak:'2-day streak' },
  { id:'exercise', label:'30 min of exercise',              streak:'1-day streak' },
  { id:'mindful',  label:'10 min mindfulness / meditation', streak:'3-day streak' },
  { id:'screen',   label:'Limited screen time before bed',  streak:'0-day streak' },
];

// Demo history shown when no API data is available (no token / not logged in)
let HISTORY = [
  { emoji:'😄', mood:'Great',      date:'Mon Apr 6', note:'Finished milestone planning. Feeling productive.' },
  { emoji:'🙂', mood:'Good',       date:'Sun Apr 5', note:'Went for a long walk. Good rest day.'            },
  { emoji:'😐', mood:'Okay',       date:'Sat Apr 4', note:'Busy with assignments. Took breaks throughout.'  },
  { emoji:'😰', mood:'Struggling', date:'Fri Apr 3', note:'Deadline crunch. Skipped exercise.'              },
  { emoji:'🙂', mood:'Good',       date:'Thu Apr 2', note:'Study group session was very helpful.'           },
];

const RESOURCES = [
  {
    title:'Campus Counseling',
    desc:'SFSU Student Health Services offers free counseling sessions for enrolled students. Book an appointment online.',
    link:'#',
  },
  {
    title:'5-Minute Breathing Exercise',
    desc:'Box breathing: inhale 4 s, hold 4 s, exhale 4 s, hold 4 s. Repeat 4 times to reduce acute stress.',
    link:'#',
  },
  {
    title:'Healthy Sleep Tips',
    desc:'Keep a consistent sleep schedule, avoid caffeine after 2 PM, and keep your room dark and cool for better rest.',
    link:'#',
  },
];

// ── Emoji lookup (used when mapping API history items back to emojis) ─────────

const MOOD_EMOJI = {
  'Great':      '😄',
  'Good':       '🙂',
  'Okay':       '😐',
  'Low':        '😔',
  'Struggling': '😰',
};

function formatCheckinDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMood = null;

// helper function - accessibility
function getAccessToken() {
  return localStorage.getItem("accessToken");
}

async function loadAccessibilitySettings() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const response = await fetch("/api/users/me/accessibility", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load accessibility settings.");
    }

    applyAccessibilitySettings(data.accessibility);
  } catch (error) {
    console.error("Accessibility settings load error:", error.message || error);
  }
}

function applyAccessibilitySettings(accessibility) {
  if (!accessibility) return;

  const themeMode = accessibility.themeMode || "dark";
  const textSize = accessibility.textSize || "normal";
  const highContrastEnabled =
    accessibility.highContrastEnabled === true ||
    accessibility.highContrastEnabled === 1 ||
    accessibility.highContrastEnabled === "1";

  const isAccessibilityMode =
    themeMode === "light" &&
    textSize === "large" &&
    highContrastEnabled;

  document.body.setAttribute(
    "data-accessibility-mode",
    isAccessibilityMode ? "accessibility" : "default"
  );
}

// ── Mood selector ─────────────────────────────────────────────────────────────

function renderMoods() {
  document.getElementById('mood-grid').innerHTML = MOODS.map(m => `
    <button class="mood-btn${selectedMood === m.label ? ' selected' : ''}"
            data-mood="${m.label}">
      <span class="mood-emoji">${m.emoji}</span>
      ${m.label}
    </button>
  `).join('');
}

// ── Check-in ──────────────────────────────────────────────────────────────────

// Maps HTTP status codes to user-friendly messages
function checkinErrorMessage(status, backendMsg) {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 409) return 'You have already checked in today. Come back tomorrow!';
  if (status === 400) return backendMsg || 'Invalid check-in data. Please try again.';
  return 'Something went wrong. Please try again.';
}

// Called from HTML onclick
async function submitCheckin() {
  if (!selectedMood) {
    showCheckinMsg('Please select a mood first.', 'error');
    return;
  }

  const token = localStorage.getItem('accessToken');

  if (!token) {
    showCheckinMsg('Please log in to save your check-in.', 'error');
    return;
  }

  // Payload matches backend spec exactly: { mood, note }
  const note = document.getElementById('checkin-notes').value.trim() || null;
  const payload = { mood: selectedMood, note };

  const moodObj = MOODS.find(m => m.label === selectedMood);
  const today   = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });

  try {
    const res = await fetch('/api/wellness/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showCheckinMsg(checkinErrorMessage(res.status, data.error), 'error');
      return;
    }

    // Prepend to local list for immediate UI feedback
    HISTORY.unshift({
      emoji: moodObj ? moodObj.emoji : '🙂',
      mood:  selectedMood,
      date:  today,
      note:  note || '',
    });

    showCheckinMsg(`Check-in saved! Feeling ${selectedMood} today.`, 'success');
    resetCheckin();
    renderHistory();
  } catch (err) {
    console.error('Checkin error:', err);
    showCheckinMsg('Unable to reach the server. Please try again.', 'error');
  }
}

// Called from HTML onclick
function resetCheckin() {
  selectedMood = null;
  document.getElementById('checkin-notes').value = '';
  renderMoods();
}

// Show inline feedback inside the check-in card; auto-hides after 4 s
function showCheckinMsg(text, type) {
  let msg = document.getElementById('checkin-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'checkin-msg';
    msg.className = 'status-message';
    const card = document.querySelector('.checkin-card');
    if (card) card.appendChild(msg);
  }
  msg.textContent = text;
  msg.className   = `status-message ${type}`;
  msg.style.display = 'block';
  clearTimeout(msg._hideTimer);
  msg._hideTimer = setTimeout(() => { msg.style.display = 'none'; }, 4000);
}

// ── Habit checklist ───────────────────────────────────────────────────────────

function renderHabits() {
  document.getElementById('habit-list').innerHTML = HABITS.map(h => `
    <div class="habit-item" id="habit-item-${h.id}">
      <input type="checkbox" id="chk-${h.id}" />
      <span class="habit-label">${h.label}</span>
      <span class="habit-streak">${h.streak}</span>
    </div>
  `).join('');
}

function syncHabitClass(id) {
  const chk  = document.getElementById('chk-' + id);
  const item = document.getElementById('habit-item-' + id);
  if (chk && item) item.classList.toggle('checked', chk.checked);
}

// ── Check-in history ──────────────────────────────────────────────────────────

async function loadCheckinHistory() {
  const list  = document.getElementById('history-list');
  const token = localStorage.getItem('accessToken');

  if (!token) {
    list.innerHTML = '<p style="color:var(--muted); padding:4px 0">Log in to see your recent check-ins here.</p>';
    return;
  }

  try {
    const res = await fetch('/api/wellness/checkins', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      list.innerHTML = '<p style="color:var(--muted); padding:4px 0">Unable to load check-in history.</p>';
      return;
    }

    const data = await res.json();

    // If the user already checked in today, disable the submit button
    if (data.todayCheckin) {
      const submitBtn = document.getElementById('checkin-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title    = 'You have already checked in today.';
        submitBtn.style.opacity = '0.55';
        submitBtn.style.cursor  = 'not-allowed';
      }
      showCheckinMsg('You have already checked in today. See you tomorrow!', 'success');
    }

    if (data.success && Array.isArray(data.history) && data.history.length > 0) {
      HISTORY = data.history.map(h => ({
        emoji: MOOD_EMOJI[h.mood] || '🙂',
        mood:  h.mood  || 'Okay',
        date:  formatCheckinDate(h.createdAt),
        note:  h.note  || '',
      }));
    } else {
      HISTORY = [];
    }
  } catch (err) {
    console.error('Load history error:', err);
    list.innerHTML = '<p style="color:var(--muted); padding:4px 0">Unable to load check-in history.</p>';
    return;
  }

  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');

  if (!HISTORY.length) {
    list.innerHTML = '<p style="color:var(--muted); padding:4px 0">No check-ins recorded yet.</p>';
    return;
  }

  list.innerHTML = HISTORY.map(h => `
    <div class="history-item">
      <div class="history-emoji">${h.emoji}</div>
      <div class="history-info">
        <div class="history-note">${h.note || ''}</div>
        <div class="history-date">${h.date} &nbsp;•&nbsp; Mood: ${h.mood}</div>
      </div>
    </div>
  `).join('');
}

// ── Wellness resources ────────────────────────────────────────────────────────

function renderResources() {
  document.getElementById('resources-grid').innerHTML = RESOURCES.map(r => `
    <div class="card">
      <h2 class="card-title">${r.title}</h2>
      <p class="card-desc">${r.desc}</p>
      <a class="btn secondary sm" href="${r.link}">Learn More</a>
    </div>
  `).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccessibilitySettings();
  // Mood buttons — event delegation so re-renders don't drop handlers
  document.getElementById('mood-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-mood]');
    if (!btn) return;
    selectedMood = btn.dataset.mood;
    renderMoods();
  });

  // Habit row click — clicking anywhere on the row toggles the checkbox.
  // If the click landed directly on the checkbox, its state already changed;
  // only manually flip it when the click was on the row background/label.
  document.getElementById('habit-list').addEventListener('click', e => {
    const item = e.target.closest('.habit-item');
    if (!item) return;
    const id  = item.id.replace('habit-item-', '');
    const chk = document.getElementById('chk-' + id);
    if (!chk) return;
    if (e.target !== chk) chk.checked = !chk.checked; // row click: manual toggle
    syncHabitClass(id);
  });

  renderMoods();
  renderHabits();
  await loadCheckinHistory();
  renderResources();
});
