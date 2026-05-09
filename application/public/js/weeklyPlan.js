'use strict';

/*
  Weekly Planner
  - Assignments display read-only from /api/academic/weekly-planner
  - Planner items can be created, edited, deleted, and marked complete
*/

const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const CATEGORY_OPTIONS = ['Academic', 'Wellness', 'Productivity', 'Miscellaneous'];
const STATUS_OPTIONS = ['pending', 'completed'];
const RECURRING_PATTERNS = ['daily', 'weekly', 'monthly'];

let currentWeekStart = getStartOfWeek(new Date());
let weeklyItems = [];
let editingPlannerItem = null;

/* ---------- DOM helpers ---------- */

function getEl(id) {
  return document.getElementById(id);
}

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function showMessage(element, message, type = 'success') {
  if (!element) return;

  element.textContent = message;
  element.classList.remove('success', 'error');
  element.classList.add(type);
  element.hidden = false;
}

function hideMessage(element) {
  if (!element) return;

  element.textContent = '';
  element.classList.remove('success', 'error');
  element.hidden = true;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* ---------- Date helpers ---------- */

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function getStartOfWeek(date) {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);

  const dayOfWeek = localDate.getDay();
  const start = new Date(localDate);
  start.setDate(localDate.getDate() - dayOfWeek);

  return toDateInputValue(start);
}

function addDays(dateString, days) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);

  return toDateInputValue(date);
}

function getWeekDates(weekStart) {
  return WEEK_DAYS.map((dayName, index) => ({
    dayName,
    date: addDays(weekStart, index)
  }));
}

function formatDisplayDate(dateString) {
  if (!dateString) return 'No date';

  const date = parseLocalDate(dateString);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatShortDate(dateString) {
  if (!dateString) return '';

  const date = parseLocalDate(dateString);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function isToday(dateString) {
  return dateString === toDateInputValue(new Date());
}

/* ---------- API helpers ---------- */

async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Please log in to use the Weekly Planner.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

async function loadWeeklyPlanner(weekStart = currentWeekStart) {
  const plannerMessage = getEl('plannerMessage');

  try {
    hideMessage(plannerMessage);

    const data = await apiRequest(`/api/academic/weekly-planner?weekStart=${weekStart}`, {
      method: 'GET'
    });

    currentWeekStart = data.weekStart;
    weeklyItems = Array.isArray(data.items) ? data.items : [];

    updateWeekPicker();
    renderWeekHeader(data.weekStart, data.weekEnd);
    renderStats();
    renderWeeklyGrid();
  } catch (error) {
    console.error('Weekly planner load error:', error);
    showMessage(plannerMessage, error.message, 'error');
    renderEmptyWeeklyGrid();
  }
}

async function fetchPlannerItemById(itemId) {
  const data = await apiRequest(`/api/academic/planner-items/${itemId}`, {
    method: 'GET'
  });

  return data.item;
}

async function createPlannerItem(payload) {
  return apiRequest('/api/academic/planner-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function updatePlannerItem(itemId, payload) {
  return apiRequest(`/api/academic/planner-items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function deletePlannerItem(itemId) {
  return apiRequest(`/api/academic/planner-items/${itemId}`, {
    method: 'DELETE'
  });
}

async function completePlannerItem(itemId) {
  return apiRequest(`/api/academic/planner-items/${itemId}/complete`, {
    method: 'PATCH'
  });
}

/* ---------- Rendering ---------- */

function renderWeekHeader(weekStart, weekEnd) {
  const heading = getEl('weekRangeHeading');
  const subtext = getEl('weekRangeSubtext');

  if (heading) {
    heading.textContent = `${formatDisplayDate(weekStart)} – ${formatDisplayDate(weekEnd)}`;
  }

  if (subtext) {
    subtext.textContent = 'Assignments are read-only here. Planner items can be managed directly from this page.';
  }
}

function renderStats() {
  const total = weeklyItems.length;
  const assignments = weeklyItems.filter(item => item.source === 'assignment').length;
  const completed = weeklyItems.filter(item => isCompletedStatus(item.status)).length;
  const pending = Math.max(total - completed, 0);

  getEl('stat-total').textContent = total;
  getEl('stat-completed').textContent = completed;
  getEl('stat-pending').textContent = pending;
  getEl('stat-assignments').textContent = assignments;
}

function renderEmptyWeeklyGrid() {
  const weeklyGrid = getEl('weeklyGrid');
  if (!weeklyGrid) return;

  weeklyGrid.innerHTML = '';

  const weekDates = getWeekDates(currentWeekStart);

  weekDates.forEach(day => {
    const card = document.createElement('article');
    card.className = `weekly-day-card${isToday(day.date) ? ' today' : ''}`;

    card.innerHTML = `
      <div class="weekly-day-header">
        <h3 class="weekly-day-name">${day.dayName}</h3>
        <div class="weekly-day-date">${formatShortDate(day.date)}</div>
      </div>
      <div class="weekly-day-items">
        <div class="weekly-empty-day">No items loaded.</div>
      </div>
    `;

    weeklyGrid.appendChild(card);
  });
}

function renderWeeklyGrid() {
  const weeklyGrid = getEl('weeklyGrid');
  if (!weeklyGrid) return;

  weeklyGrid.innerHTML = '';

  const weekDates = getWeekDates(currentWeekStart);

  weekDates.forEach(day => {
    const dayItems = weeklyItems.filter(item => item.dueDate === day.date);

    const card = document.createElement('article');
    card.className = `weekly-day-card${isToday(day.date) ? ' today' : ''}`;

    card.innerHTML = `
      <div class="weekly-day-header">
        <h3 class="weekly-day-name">${day.dayName}</h3>
        <div class="weekly-day-date">${formatShortDate(day.date)}</div>
      </div>
      <div class="weekly-day-items">
        ${
          dayItems.length
            ? dayItems.map(renderPlannerCard).join('')
            : '<div class="weekly-empty-day">Nothing planned for this day.</div>'
        }
      </div>
    `;

    weeklyGrid.appendChild(card);
  });
}

function renderPlannerCard(item) {
  const source = item.source || 'planner';
  const completed = isCompletedStatus(item.status);
  const title = escapeHtml(item.title || 'Untitled item');
  const description = item.description
    ? `<p class="weekly-item-desc">${escapeHtml(item.description)}</p>`
    : '';

  const sourceChip =
    source === 'assignment'
      ? '<span class="weekly-chip assignment-chip">Assignment</span>'
      : '<span class="weekly-chip planner-chip">Planner</span>';

  const statusChip = completed
    ? '<span class="weekly-chip completed-chip">Completed</span>'
    : `<span class="weekly-chip">${escapeHtml(formatStatus(item.status))}</span>`;

  const categoryChip = item.category
    ? `<span class="weekly-chip">${escapeHtml(item.category)}</span>`
    : '';

  const courseChip = item.courseName
    ? `<span class="weekly-chip">${escapeHtml(item.courseName)}</span>`
    : '';

  const recurringChip = item.isRecurring
    ? `<span class="weekly-chip">Repeats ${escapeHtml(item.recurringPattern || '')}</span>`
    : '';

  const actions = source === 'planner'
    ? renderPlannerActions(item, completed)
    : `
      <p class="weekly-readonly-note">
        Edit this assignment from the Academic tab.
      </p>
    `;

  return `
    <article
      class="weekly-item-card ${escapeHtml(source)}${completed ? ' completed' : ''}"
      data-id="${escapeHtml(item.id)}"
      data-source="${escapeHtml(source)}"
    >
      <div class="weekly-item-top">
        <h4 class="weekly-item-title">${title}</h4>
      </div>

      ${description}

      <div class="weekly-item-meta">
        ${sourceChip}
        ${statusChip}
        ${categoryChip}
        ${courseChip}
        ${recurringChip}
      </div>

      ${actions}
    </article>
  `;
}

function renderPlannerActions(item, completed) {
  const completeButton = completed
    ? ''
    : `
      <button
        class="btn secondary weekly-complete-btn"
        type="button"
        data-id="${escapeHtml(item.id)}"
      >
        Mark Complete
      </button>
    `;

  return `
    <div class="weekly-item-actions">
      ${completeButton}
      <button
        class="btn secondary weekly-edit-btn"
        type="button"
        data-id="${escapeHtml(item.id)}"
      >
        Edit
      </button>
      <button
        class="btn danger weekly-delete-btn"
        type="button"
        data-id="${escapeHtml(item.id)}"
      >
        Delete
      </button>
    </div>
  `;
}

function isCompletedStatus(status) {
  return status === 'completed' || status === 'graded';
}

function formatStatus(status) {
  if (!status) return 'Pending';

  return String(status)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/* ---------- Week controls ---------- */

function updateWeekPicker() {
  const weekPicker = getEl('weekPicker');
  if (weekPicker) {
    weekPicker.value = currentWeekStart;
  }
}

function goToPreviousWeek() {
  currentWeekStart = addDays(currentWeekStart, -7);
  loadWeeklyPlanner(currentWeekStart);
}

function goToCurrentWeek() {
  currentWeekStart = getStartOfWeek(new Date());
  loadWeeklyPlanner(currentWeekStart);
}

function goToNextWeek() {
  currentWeekStart = addDays(currentWeekStart, 7);
  loadWeeklyPlanner(currentWeekStart);
}

function jumpToSelectedWeek(event) {
  const selectedDate = event.target.value;
  if (!selectedDate) return;

  currentWeekStart = getStartOfWeek(parseLocalDate(selectedDate));
  loadWeeklyPlanner(currentWeekStart);
}

/* ---------- Modal helpers ---------- */

function openPlannerModal(mode = 'create', item = null) {
  const modal = getEl('plannerModal');
  const modalTitle = getEl('plannerModalTitle');
  const deleteBtn = getEl('deletePlannerItemBtn');
  const saveBtn = getEl('savePlannerItemBtn');

  if (!modal) return;

  editingPlannerItem = mode === 'edit' ? item : null;

  hideMessage(getEl('modalMessage'));

  if (mode === 'edit' && item) {
    modalTitle.textContent = 'Edit Planner Item';
    saveBtn.textContent = 'Save Changes';
    deleteBtn.hidden = false;
    fillPlannerForm(item);
  } else {
    modalTitle.textContent = 'Add Planner Item';
    saveBtn.textContent = 'Save Planner Item';
    deleteBtn.hidden = true;
    resetPlannerForm();
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  const titleInput = getEl('plannerTitle');
  if (titleInput) {
    titleInput.focus();
  }
}

function closePlannerModal() {
  const modal = getEl('plannerModal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  editingPlannerItem = null;
  resetPlannerForm();
  hideMessage(getEl('modalMessage'));
}

function resetPlannerForm() {
  const form = getEl('plannerForm');
  if (form) form.reset();

  getEl('plannerItemId').value = '';
  getEl('plannerCategory').value = 'Academic';
  getEl('plannerStatus').value = 'pending';
  getEl('plannerDueDate').value = getDefaultPlannerDate();
  getEl('plannerRecurring').checked = false;

  toggleRecurringFields(false);
}

function fillPlannerForm(item) {
  getEl('plannerItemId').value = item.id || '';
  getEl('plannerTitle').value = item.title || '';
  getEl('plannerDescription').value = item.description || '';
  getEl('plannerCategory').value = CATEGORY_OPTIONS.includes(item.category) ? item.category : 'Academic';
  getEl('plannerStatus').value = STATUS_OPTIONS.includes(item.status) ? item.status : 'pending';
  getEl('plannerDueDate').value = item.dueDate || getDefaultPlannerDate();

  const isRecurring =
    item.isRecurring === true ||
    item.isRecurring === 1 ||
    item.isRecurring === '1';

  getEl('plannerRecurring').checked = isRecurring;
  getEl('plannerRecurringPattern').value =
    RECURRING_PATTERNS.includes(item.recurringPattern) ? item.recurringPattern : '';
  getEl('plannerRecurringEndDate').value = item.recurringEndDate || '';

  toggleRecurringFields(isRecurring);
}

function getDefaultPlannerDate() {
  const today = toDateInputValue(new Date());
  const weekEnd = addDays(currentWeekStart, 6);

  if (today >= currentWeekStart && today <= weekEnd) {
    return today;
  }

  return currentWeekStart;
}

function toggleRecurringFields(show) {
  const recurringFields = getEl('recurringFields');
  const recurringPattern = getEl('plannerRecurringPattern');
  const recurringEndDate = getEl('plannerRecurringEndDate');

  if (!recurringFields) return;

  recurringFields.hidden = !show;

  if (show) {
    recurringPattern.setAttribute('required', 'required');
  } else {
    recurringPattern.removeAttribute('required');
    recurringPattern.value = '';
    recurringEndDate.value = '';
  }
}

function buildPlannerPayload() {
  const title = getEl('plannerTitle').value.trim();
  const description = getEl('plannerDescription').value.trim();
  const category = getEl('plannerCategory').value;
  const status = getEl('plannerStatus').value;
  const dueDate = getEl('plannerDueDate').value;
  const isRecurring = getEl('plannerRecurring').checked;
  const recurringPattern = getEl('plannerRecurringPattern').value;
  const recurringEndDate = getEl('plannerRecurringEndDate').value;

  if (!title) {
    throw new Error('Title is required.');
  }

  if (!category) {
    throw new Error('Category is required.');
  }

  if (!dueDate) {
    throw new Error('Due date is required.');
  }

  if (isRecurring && !recurringPattern) {
    throw new Error('Please select a recurring pattern.');
  }

  return {
    title,
    description: description || null,
    category,
    dueDate,
    status: status || 'pending',
    isRecurring,
    recurringPattern: isRecurring ? recurringPattern : null,
    recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : null
  };
}

/* ---------- Item actions ---------- */

async function handlePlannerFormSubmit(event) {
  event.preventDefault();

  const modalMessage = getEl('modalMessage');
  const saveBtn = getEl('savePlannerItemBtn');

  try {
    hideMessage(modalMessage);
    saveBtn.disabled = true;

    const payload = buildPlannerPayload();

    if (editingPlannerItem) {
      await updatePlannerItem(editingPlannerItem.id, payload);
      showMessage(getEl('plannerMessage'), 'Planner item updated successfully.', 'success');
    } else {
      await createPlannerItem(payload);
      showMessage(getEl('plannerMessage'), 'Planner item created successfully.', 'success');
    }

    closePlannerModal();

    const newWeekStart = getStartOfWeek(parseLocalDate(payload.dueDate));
    currentWeekStart = newWeekStart;
    await loadWeeklyPlanner(currentWeekStart);
  } catch (error) {
    console.error('Planner item save error:', error);
    showMessage(modalMessage, error.message, 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleEditPlannerItem(itemId) {
  const plannerMessage = getEl('plannerMessage');

  try {
    hideMessage(plannerMessage);

    const item = await fetchPlannerItemById(itemId);
    openPlannerModal('edit', item);
  } catch (error) {
    console.error('Planner item edit load error:', error);
    showMessage(plannerMessage, error.message, 'error');
  }
}

async function handleDeletePlannerItem(itemId, fromModal = false) {
  const confirmed = window.confirm('Delete this planner item? This cannot be undone.');
  if (!confirmed) return;

  const messageElement = fromModal ? getEl('modalMessage') : getEl('plannerMessage');

  try {
    hideMessage(messageElement);

    await deletePlannerItem(itemId);

    if (fromModal) {
      closePlannerModal();
    }

    showMessage(getEl('plannerMessage'), 'Planner item deleted successfully.', 'success');
    await loadWeeklyPlanner(currentWeekStart);
  } catch (error) {
    console.error('Planner item delete error:', error);
    showMessage(messageElement, error.message, 'error');
  }
}

async function handleCompletePlannerItem(itemId) {
  const plannerMessage = getEl('plannerMessage');

  try {
    hideMessage(plannerMessage);

    await completePlannerItem(itemId);

    showMessage(plannerMessage, 'Planner item marked as completed.', 'success');
    await loadWeeklyPlanner(currentWeekStart);
  } catch (error) {
    console.error('Planner item complete error:', error);
    showMessage(plannerMessage, error.message, 'error');
  }
}

function handleWeeklyGridClick(event) {
  const editBtn = event.target.closest('.weekly-edit-btn');
  const deleteBtn = event.target.closest('.weekly-delete-btn');
  const completeBtn = event.target.closest('.weekly-complete-btn');

  if (editBtn) {
    handleEditPlannerItem(editBtn.dataset.id);
    return;
  }

  if (deleteBtn) {
    handleDeletePlannerItem(deleteBtn.dataset.id);
    return;
  }

  if (completeBtn) {
    handleCompletePlannerItem(completeBtn.dataset.id);
  }
}

/* ---------- Event binding ---------- */

function bindEvents() {
  const prevWeekBtn = getEl('prevWeekBtn');
  const currentWeekBtn = getEl('currentWeekBtn');
  const nextWeekBtn = getEl('nextWeekBtn');
  const weekPicker = getEl('weekPicker');
  const addPlannerItemBtn = getEl('addPlannerItemBtn');
  const closePlannerModalBtn = getEl('closePlannerModalBtn');
  const cancelPlannerModalBtn = getEl('cancelPlannerModalBtn');
  const plannerModal = getEl('plannerModal');
  const plannerForm = getEl('plannerForm');
  const plannerRecurring = getEl('plannerRecurring');
  const deletePlannerItemBtn = getEl('deletePlannerItemBtn');
  const weeklyGrid = getEl('weeklyGrid');

  if (prevWeekBtn) prevWeekBtn.addEventListener('click', goToPreviousWeek);
  if (currentWeekBtn) currentWeekBtn.addEventListener('click', goToCurrentWeek);
  if (nextWeekBtn) nextWeekBtn.addEventListener('click', goToNextWeek);
  if (weekPicker) weekPicker.addEventListener('change', jumpToSelectedWeek);

  if (addPlannerItemBtn) {
    addPlannerItemBtn.addEventListener('click', () => openPlannerModal('create'));
  }

  if (closePlannerModalBtn) {
    closePlannerModalBtn.addEventListener('click', closePlannerModal);
  }

  if (cancelPlannerModalBtn) {
    cancelPlannerModalBtn.addEventListener('click', closePlannerModal);
  }

  if (plannerModal) {
    plannerModal.addEventListener('click', event => {
      if (event.target === plannerModal) {
        closePlannerModal();
      }
    });
  }

  if (plannerForm) {
    plannerForm.addEventListener('submit', handlePlannerFormSubmit);
  }

  if (plannerRecurring) {
    plannerRecurring.addEventListener('change', event => {
      toggleRecurringFields(event.target.checked);
    });
  }

  if (deletePlannerItemBtn) {
    deletePlannerItemBtn.addEventListener('click', () => {
      if (!editingPlannerItem) return;
      handleDeletePlannerItem(editingPlannerItem.id, true);
    });
  }

  if (weeklyGrid) {
    weeklyGrid.addEventListener('click', handleWeeklyGridClick);
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closePlannerModal();
    }
  });
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  updateWeekPicker();
  renderEmptyWeeklyGrid();
  loadWeeklyPlanner(currentWeekStart);
});