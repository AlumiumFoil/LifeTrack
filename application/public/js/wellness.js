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

let HABITS = [];
let editingHabitId = null;

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
    title: 'Focus Tips',
    desc:  'Quick tips to help you reset, stay focused, and manage stress.',
    link:  './resources/focusTips.html',
  },
  {
    title: 'Sleep Routine',
    desc:  'Track your sleep habits and improve your sleep quality.',
    link:  './resources/sleepRoutine.html',
  },
  {
    title: 'Breathing Exercise',
    desc:  'Simple breathing techniques to reduce stress and calm your mind.',
    link:  './resources/breathing.html',
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

// ── Mood ↔ slider mappings ────────────────────────────────────────────────────

const MOOD_LEVEL = { 'Struggling': 1, 'Low': 2, 'Okay': 3, 'Good': 4, 'Great': 5 };
const LEVEL_MOOD = { 1: 'Struggling', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };

// Push the current selectedMood into the slider (called after button clicks)
function syncSliderFromMood() {
  const slider = document.getElementById('mood-slider');
  const label  = document.getElementById('mood-slider-label');
  if (!slider || !label) return;
  const level = selectedMood ? (MOOD_LEVEL[selectedMood] ?? 3) : 3;
  slider.value    = level;
  label.textContent = LEVEL_MOOD[level] || 'Okay';
}

// Push the slider value into selectedMood + re-render buttons (called on slider input)
function syncMoodFromSlider(val) {
  const mood  = LEVEL_MOOD[+val] || 'Okay';
  const label = document.getElementById('mood-slider-label');
  if (label) label.textContent = mood;
  selectedMood = mood;
  renderMoods();
}

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMood = null;


function getAccessToken() {
  return localStorage.getItem("accessToken");
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

function setProfileHeaderFromStoredUser() {
  const storedUser = getStoredUser();
  const profileUsernameTop = document.getElementById('profileUsernameTop');

  if (!profileUsernameTop) return;

  if (!storedUser) {
    profileUsernameTop.textContent = 'Profile';
    return;
  }

  profileUsernameTop.textContent = storedUser.username || 'Profile';
}

async function loadProfileHeader() {
  const token = getAccessToken();

  setProfileHeaderFromStoredUser();

  if (!token) return;

  try {
    const response = await fetch('/api/users/me/dashboard', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

function getAuthHeaders(includeJson = false) {
  const token = getAccessToken();

  const headers = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function isHabitCompletedToday(habit) {
  if (!habit || !habit.lastCompletedDate) return false;

  const today = new Date().toISOString().slice(0, 10);
  return habit.lastCompletedDate === today;
}

function formatHabitStreak(streakCount) {
  const streak = Number(streakCount) || 0;
  return `${streak}-day streak`;
}

function showHabitModalMsg(text, type = 'error') {
  const msg = document.getElementById('habit-modal-msg');
  if (!msg) return;

  msg.textContent = text;
  msg.className = `status-message ${type}`;
  msg.classList.remove('wellness-hidden');
}

function clearHabitModalMsg() {
  const msg = document.getElementById('habit-modal-msg');
  if (!msg) return;

  msg.textContent = '';
  msg.className = 'status-message wellness-hidden';
}

// helper function - accessibility
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
  document.getElementById('checkin-notes').value    = '';
  const slider = document.getElementById('mood-slider');
  const label  = document.getElementById('mood-slider-label');
  if (slider) slider.value        = 3;
  if (label)  label.textContent   = 'Okay';
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

// ── Habit checklist / CRUD ────────────────────────────────────────────────────

async function loadHabits() {
  const list = document.getElementById('habit-list');
  const token = getAccessToken();

  if (!list) return;

  if (!token) {
    list.innerHTML = '<p style="color:var(--muted); padding:4px 0">Log in to track your habits here.</p>';
    return;
  }

  try {
    const res = await fetch('/api/wellness/habits', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      list.innerHTML = '<p style="color:var(--muted); padding:4px 0">Unable to load habits.</p>';
      return;
    }

    HABITS = Array.isArray(data.habits) ? data.habits : [];
    renderHabits();
  } catch (err) {
    console.error('Load habits error:', err);
    list.innerHTML = '<p style="color:var(--muted); padding:4px 0">Unable to reach the server.</p>';
  }
}

function renderHabits() {
  const list = document.getElementById('habit-list');
  if (!list) return;

  if (!HABITS.length) {
    list.innerHTML = `
      <div class="habit-item">
        <span class="habit-label">No habits yet. Add your first wellness habit to get started.</span>
      </div>
    `;
    return;
  }

  list.innerHTML = HABITS.map(habit => {
    const completedToday = isHabitCompletedToday(habit);
    const checkedAttr = completedToday ? 'checked' : '';
    const disabledAttr = completedToday ? 'disabled' : '';
    const checkedClass = completedToday ? ' checked' : '';

    return `
      <div class="habit-item${checkedClass}" id="habit-item-${habit.id}" data-habit-id="${habit.id}">
        <input type="checkbox" id="chk-${habit.id}" ${checkedAttr} ${disabledAttr} />
        <span class="habit-label">
          ${habit.title || 'Untitled Habit'}
          ${habit.description ? `<span class="habit-description">${habit.description}</span>` : ''}
        </span>
        <span class="habit-streak">${formatHabitStreak(habit.streakCount)}</span>
        <button class="btn secondary sm habit-edit-btn" type="button" data-edit-habit-id="${habit.id}">
          Edit
        </button>
      </div>
    `;
  }).join('');
}

async function completeHabit(habitId) {
  const token = getAccessToken();

  if (!token) {
    showCheckinMsg('Please log in to complete habits.', 'error');
    return;
  }

  const habit = HABITS.find(h => String(h.id) === String(habitId));
  if (!habit || isHabitCompletedToday(habit)) {
    return;
  }

  try {
    const res = await fetch(`/api/wellness/habits/${habitId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 409) {
      await loadHabits();
      showCheckinMsg('Habit already completed today.', 'success');
      return;
    }

    if (!res.ok || !data.success) {
      showCheckinMsg(data.error || 'Unable to complete habit.', 'error');
      await loadHabits();
      return;
    }

    await loadHabits();
    showCheckinMsg('Habit marked complete for today!', 'success');
  } catch (err) {
    console.error('Complete habit error:', err);
    showCheckinMsg('Unable to reach the server.', 'error');
    await loadHabits();
  }
}

function openHabitModal(habit = null) {
  const modal = document.getElementById('habit-modal');
  const title = document.getElementById('habit-modal-title');
  const deleteBtn = document.getElementById('delete-habit-btn');

  editingHabitId = habit ? habit.id : null;

  clearHabitModalMsg();

  document.getElementById('habit-title').value = habit?.title || '';
  document.getElementById('habit-category').value = habit?.category || '';
  document.getElementById('habit-frequency').value = habit?.frequency || 'daily';
  document.getElementById('habit-description').value = habit?.description || '';

  if (title) {
    title.textContent = habit ? 'Edit Habit' : 'New Habit';
  }

  if (deleteBtn) {
    deleteBtn.hidden = !habit;
  }

  if (modal) {
    modal.classList.add('open');
  }
}

function closeHabitModal() {
  const modal = document.getElementById('habit-modal');

  editingHabitId = null;
  clearHabitModalMsg();

  if (modal) {
    modal.classList.remove('open');
  }
}

function getHabitPayloadFromForm() {
  return {
    title: document.getElementById('habit-title').value.trim(),
    category: document.getElementById('habit-category').value.trim() || null,
    frequency: document.getElementById('habit-frequency').value || 'daily',
    description: document.getElementById('habit-description').value.trim() || null,
  };
}

async function saveHabit() {
  const token = getAccessToken();

  if (!token) {
    showHabitModalMsg('Please log in to save habits.', 'error');
    return;
  }

  const payload = getHabitPayloadFromForm();

  if (!payload.title) {
    showHabitModalMsg('Habit name is required.', 'error');
    return;
  }

  const isEditing = editingHabitId !== null;
  const url = isEditing
    ? `/api/wellness/habits/${editingHabitId}`
    : '/api/wellness/habits';

  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      showHabitModalMsg(data.error || 'Unable to save habit.', 'error');
      return;
    }

    closeHabitModal();
    await loadHabits();
  } catch (err) {
    console.error('Save habit error:', err);
    showHabitModalMsg('Unable to reach the server.', 'error');
  }
}

async function deleteHabit() {
  const token = getAccessToken();

  if (!token || editingHabitId === null) {
    return;
  }

  const confirmed = confirm('Delete this habit? This will remove it from your active habit list.');
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/wellness/habits/${editingHabitId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      showHabitModalMsg(data.error || 'Unable to delete habit.', 'error');
      return;
    }

    closeHabitModal();
    await loadHabits();
  } catch (err) {
    console.error('Delete habit error:', err);
    showHabitModalMsg('Unable to reach the server.', 'error');
  }
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
  await loadProfileHeader();
  await loadAccessibilitySettings();
  // Mood buttons — event delegation so re-renders don't drop handlers
  document.getElementById('mood-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-mood]');
    if (!btn) return;
    selectedMood = btn.dataset.mood;
    renderMoods();
    syncSliderFromMood();
  });

  // Mood slider — keep buttons in sync
  document.getElementById('mood-slider').addEventListener('input', e => {
    syncMoodFromSlider(e.target.value);
  });

  // Habit row click — clicking anywhere on the row toggles the checkbox.
  // If the click landed directly on the checkbox, its state already changed;
  // only manually flip it when the click was on the row background/label.
  const habitList = document.getElementById('habit-list');
  if (habitList) {
    habitList.addEventListener('click', async e => {
      const editBtn = e.target.closest('[data-edit-habit-id]');
      if (editBtn) {
        const habitId = editBtn.dataset.editHabitId;
        const habit = HABITS.find(h => String(h.id) === String(habitId));
        if (habit) openHabitModal(habit);
        return;
      }

      const item = e.target.closest('.habit-item');
      if (!item || !item.dataset.habitId) return;

      const habitId = item.dataset.habitId;
      await completeHabit(habitId);
    });
  }

  const addHabitBtn = document.getElementById('add-habit-btn');
  if (addHabitBtn) {
    addHabitBtn.addEventListener('click', () => openHabitModal());
  }

  const closeHabitModalBtn = document.getElementById('close-habit-modal-btn');
  if (closeHabitModalBtn) {
    closeHabitModalBtn.addEventListener('click', closeHabitModal);
  }

  const cancelHabitBtn = document.getElementById('cancel-habit-btn');
  if (cancelHabitBtn) {
    cancelHabitBtn.addEventListener('click', closeHabitModal);
  }

  const saveHabitBtn = document.getElementById('save-habit-btn');
  if (saveHabitBtn) {
    saveHabitBtn.addEventListener('click', saveHabit);
  }

  const deleteHabitBtn = document.getElementById('delete-habit-btn');
  if (deleteHabitBtn) {
    deleteHabitBtn.addEventListener('click', deleteHabit);
  }

  const habitModal = document.getElementById('habit-modal');
  if (habitModal) {
    habitModal.addEventListener('click', e => {
      if (e.target === habitModal) {
        closeHabitModal();
      }
    });
  }

  renderMoods();
  await loadHabits();
  await loadCheckinHistory();
  renderResources();
});
