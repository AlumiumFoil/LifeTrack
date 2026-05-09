'use strict';

/* Project Planning resource page
   Handles backend-connected projects and milestones.
*/

const API_BASE = '/api/goals';

let projects = [];
let milestones = [];
let selectedProjectId = null;
let editingProjectId = null;
let editingMilestoneId = null;

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  initializeProjectPlanner();
});

function cacheElements() {
  els.message = document.getElementById('project-plan-message');

  els.statTotalProjects = document.getElementById('stat-total-projects');
  els.statActiveProjects = document.getElementById('stat-active-projects');
  els.statCompletedMilestones = document.getElementById('stat-completed-milestones');
  els.statOverdueMilestones = document.getElementById('stat-overdue-milestones');

  els.projectList = document.getElementById('project-list');
  els.milestoneList = document.getElementById('milestone-list');
  els.selectedProjectNote = document.getElementById('selected-project-note');
  els.selectedProjectDetails = document.getElementById('selected-project-details');

  els.newProjectBtn = document.getElementById('new-project-btn');
  els.newMilestoneBtn = document.getElementById('new-milestone-btn');

  els.projectModal = document.getElementById('project-modal');
  els.projectModalTitle = document.getElementById('project-modal-title');
  els.projectForm = document.getElementById('project-form');
  els.projectId = document.getElementById('project-id');
  els.projectTitle = document.getElementById('project-title');
  els.projectDescription = document.getElementById('project-description');
  els.projectGitUrl = document.getElementById('project-git-url');
  els.projectMembers = document.getElementById('project-members');
  els.projectStatusGroup = document.getElementById('project-status-group');
  els.projectStatus = document.getElementById('project-status');
  els.deleteProjectBtn = document.getElementById('delete-project-btn');
  els.cancelProjectBtn = document.getElementById('cancel-project-btn');
  els.closeProjectModalBtn = document.getElementById('close-project-modal-btn');

  els.milestoneModal = document.getElementById('milestone-modal');
  els.milestoneModalTitle = document.getElementById('milestone-modal-title');
  els.milestoneForm = document.getElementById('milestone-form');
  els.milestoneId = document.getElementById('milestone-id');
  els.milestoneTitle = document.getElementById('milestone-title');
  els.milestoneDescription = document.getElementById('milestone-description');
  els.milestoneDueDate = document.getElementById('milestone-due-date');
  els.milestoneSortOrder = document.getElementById('milestone-sort-order');
  els.milestoneStatus = document.getElementById('milestone-status');
  els.deleteMilestoneBtn = document.getElementById('delete-milestone-btn');
  els.cancelMilestoneBtn = document.getElementById('cancel-milestone-btn');
  els.closeMilestoneModalBtn = document.getElementById('close-milestone-modal-btn');
}

function bindEvents() {
  if (els.newProjectBtn) {
    els.newProjectBtn.addEventListener('click', openNewProjectModal);
  }

  if (els.newMilestoneBtn) {
    els.newMilestoneBtn.addEventListener('click', openNewMilestoneModal);
  }

  if (els.projectForm) {
    els.projectForm.addEventListener('submit', handleProjectSubmit);
  }

  if (els.milestoneForm) {
    els.milestoneForm.addEventListener('submit', handleMilestoneSubmit);
  }

  if (els.cancelProjectBtn) {
    els.cancelProjectBtn.addEventListener('click', closeProjectModal);
  }

  if (els.closeProjectModalBtn) {
    els.closeProjectModalBtn.addEventListener('click', closeProjectModal);
  }

  if (els.cancelMilestoneBtn) {
    els.cancelMilestoneBtn.addEventListener('click', closeMilestoneModal);
  }

  if (els.closeMilestoneModalBtn) {
    els.closeMilestoneModalBtn.addEventListener('click', closeMilestoneModal);
  }

  if (els.deleteProjectBtn) {
    els.deleteProjectBtn.addEventListener('click', handleProjectDelete);
  }

  if (els.deleteMilestoneBtn) {
    els.deleteMilestoneBtn.addEventListener('click', handleMilestoneDelete);
  }

  if (els.projectModal) {
    els.projectModal.addEventListener('click', (event) => {
      if (event.target === els.projectModal) {
        closeProjectModal();
      }
    });
  }

  if (els.milestoneModal) {
    els.milestoneModal.addEventListener('click', (event) => {
      if (event.target === els.milestoneModal) {
        closeMilestoneModal();
      }
    });
  }
}

async function initializeProjectPlanner() {
  if (!getAccessToken()) {
    showMessage('Please log in to view and manage project plans.', 'error');
    renderEmptyAuthState();
    return;
  }

  await Promise.all([
    loadProjectStats(),
    loadProjects()
  ]);
}

/* Auth / fetch helpers */

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getAuthHeaders(includeJson = false) {
  const headers = {
    Authorization: `Bearer ${getAccessToken()}`
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

/* Messages */

function showMessage(text, type = 'success') {
  if (!els.message) return;

  els.message.textContent = text;
  els.message.classList.remove('success', 'error');
  els.message.classList.add(type === 'error' ? 'error' : 'success');
  els.message.hidden = false;
}

function clearMessage() {
  if (!els.message) return;

  els.message.textContent = '';
  els.message.classList.remove('success', 'error');
  els.message.hidden = true;
}

/* Loading */

async function loadProjectStats() {
  try {
    const data = await apiRequest('/projects/stats', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    renderStats(data.stats);
  } catch (error) {
    console.error('Project stats load error:', error.message);
  }
}

async function loadProjects() {
  try {
    const data = await apiRequest('/projects', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    projects = Array.isArray(data.projects) ? data.projects : [];

    if (!selectedProjectId && projects.length > 0) {
      selectedProjectId = projects[0].id;
    }

    if (selectedProjectId && !projects.some(project => Number(project.id) === Number(selectedProjectId))) {
      selectedProjectId = projects.length > 0 ? projects[0].id : null;
    }

    renderProjects();

    if (selectedProjectId) {
      await loadMilestones(selectedProjectId);
    } else {
      milestones = [];
      renderSelectedProject();
      renderMilestones();
    }
  } catch (error) {
    console.error('Project load error:', error.message);
    showMessage(error.message || 'Could not load projects.', 'error');
  }
}

async function loadMilestones(projectId) {
  if (!projectId) return;

  try {
    const data = await apiRequest(`/projects/${projectId}/milestones`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    milestones = Array.isArray(data.milestones) ? data.milestones : [];
    renderSelectedProject();
    renderMilestones();
  } catch (error) {
    console.error('Milestone load error:', error.message);
    showMessage(error.message || 'Could not load milestones.', 'error');
  }
}

/* Rendering */

function renderStats(stats) {
  const projectStats = stats?.projects || {};
  const milestoneStats = stats?.milestones || {};

  setText(els.statTotalProjects, projectStats.total ?? 0);
  setText(els.statActiveProjects, projectStats.active ?? 0);
  setText(els.statCompletedMilestones, milestoneStats.completed ?? 0);
  setText(els.statOverdueMilestones, milestoneStats.overdue ?? 0);
}

function renderProjects() {
  if (!els.projectList) return;

  if (projects.length === 0) {
    els.projectList.innerHTML = `
      <div class="card project-empty-card">
        <h2>No projects yet</h2>
        <p>Create your first project to begin organizing milestones.</p>
      </div>
    `;
    return;
  }

  els.projectList.innerHTML = projects.map(project => {
    const isActive = Number(project.id) === Number(selectedProjectId);
    const description = project.description || 'No description added yet.';
    const statusClass = getProjectStatusBadgeClass(project.status);

    return `
      <article
        class="card project-card ${isActive ? 'active' : ''}"
        data-project-id="${escapeHtml(project.id)}"
        tabindex="0"
      >
        <div class="project-card-header">
          <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
          <span class="badge ${statusClass}">${formatStatus(project.status)}</span>
        </div>

        <p class="project-card-description">${escapeHtml(description)}</p>

        <div class="project-card-meta">
          ${project.gitUrl ? `<a class="project-link" href="${escapeAttribute(project.gitUrl)}" target="_blank" rel="noopener">Project Link</a>` : ''}
          <span class="project-meta-text">${formatDateTime(project.updatedAt, 'Updated')}</span>
        </div>

        <div class="project-card-actions">
          <button class="btn sm secondary" type="button" data-action="select-project" data-project-id="${escapeHtml(project.id)}">View Milestones</button>
          <button class="btn sm secondary" type="button" data-action="edit-project" data-project-id="${escapeHtml(project.id)}">Edit</button>
        </div>
      </article>
    `;
  }).join('');

  els.projectList.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      selectProject(card.dataset.projectId);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectProject(card.dataset.projectId);
      }
    });
  });

  els.projectList.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();

      const action = button.dataset.action;
      const projectId = button.dataset.projectId;

      if (action === 'select-project') {
        selectProject(projectId);
      }

      if (action === 'edit-project') {
        openEditProjectModal(projectId);
      }
    });
  });
}

function renderSelectedProject() {
  const project = getSelectedProject();

  if (!els.selectedProjectDetails || !els.selectedProjectNote || !els.newMilestoneBtn) return;

  if (!project) {
    els.selectedProjectDetails.hidden = true;
    els.selectedProjectDetails.innerHTML = '';
    els.selectedProjectNote.textContent = 'Choose a project to view its milestones.';
    els.newMilestoneBtn.disabled = true;
    return;
  }

  els.newMilestoneBtn.disabled = false;
  els.selectedProjectNote.textContent = `Managing milestones for ${project.title}.`;

  const membersMarkup = renderMembers(project.groupMembers, project.memberRoles);
  const statusClass = getProjectStatusBadgeClass(project.status);

  els.selectedProjectDetails.hidden = false;
  els.selectedProjectDetails.innerHTML = `
    <div class="selected-project-header">
      <h3 class="selected-project-title">${escapeHtml(project.title)}</h3>
      <span class="badge ${statusClass}">${formatStatus(project.status)}</span>
    </div>

    <p class="selected-project-description">${escapeHtml(project.description || 'No description added yet.')}</p>

    <div class="selected-project-meta">
      ${project.gitUrl ? `<a class="project-link" href="${escapeAttribute(project.gitUrl)}" target="_blank" rel="noopener">Open Project Link</a>` : ''}
      <span class="project-meta-text">${formatDateTime(project.createdAt, 'Created')}</span>
      <span class="project-meta-text">${formatDateTime(project.updatedAt, 'Updated')}</span>
    </div>

    ${membersMarkup}

    <div class="selected-project-actions">
      <button class="btn sm secondary" id="edit-selected-project-btn" type="button">Edit Project</button>
      <button class="btn sm danger" id="delete-selected-project-btn" type="button">Delete Project</button>
    </div>
  `;

  const editBtn = document.getElementById('edit-selected-project-btn');
  const deleteBtn = document.getElementById('delete-selected-project-btn');

  if (editBtn) {
    editBtn.addEventListener('click', () => openEditProjectModal(project.id));
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      openEditProjectModal(project.id);
    });
  }
}

function renderMilestones() {
  if (!els.milestoneList) return;

  const project = getSelectedProject();

  if (!project) {
    els.milestoneList.innerHTML = `
      <div class="card project-empty-card">
        <h2>No project selected</h2>
        <p>Select a project from the list to load its milestones.</p>
      </div>
    `;
    return;
  }

  if (milestones.length === 0) {
    els.milestoneList.innerHTML = `
      <div class="card project-empty-card">
        <h2>No milestones yet</h2>
        <p>Add your first milestone for this project to start tracking progress.</p>
      </div>
    `;
    return;
  }

  els.milestoneList.innerHTML = milestones.map(milestone => {
    const statusClass = getMilestoneStatusBadgeClass(milestone.status);
    const dueInfo = getDueDateInfo(milestone);

    return `
      <article class="card milestone-card" data-milestone-id="${escapeHtml(milestone.id)}">
        <div class="milestone-card-header">
          <h3 class="milestone-card-title">${escapeHtml(milestone.title)}</h3>
          <span class="badge ${statusClass}">${formatStatus(milestone.status)}</span>
        </div>

        <p class="milestone-card-description">${escapeHtml(milestone.description || 'No description added yet.')}</p>

        <div class="milestone-card-meta">
          <span class="project-meta-text ${dueInfo.className}">${dueInfo.text}</span>
          <span class="project-meta-text">Sort Order: ${escapeHtml(milestone.sortOrder ?? 0)}</span>
        </div>

        <div class="milestone-card-actions">
          <select class="milestone-status-select" data-action="change-milestone-status" data-milestone-id="${escapeHtml(milestone.id)}" aria-label="Change milestone status">
            <option value="not started" ${milestone.status === 'not started' ? 'selected' : ''}>Not Started</option>
            <option value="in progress" ${milestone.status === 'in progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${milestone.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>

          <button class="btn sm secondary" type="button" data-action="edit-milestone" data-milestone-id="${escapeHtml(milestone.id)}">Edit</button>
          <button class="btn sm danger" type="button" data-action="delete-milestone" data-milestone-id="${escapeHtml(milestone.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join('');

  els.milestoneList.querySelectorAll('[data-action="change-milestone-status"]').forEach(select => {
    select.addEventListener('change', () => {
      updateMilestoneStatus(select.dataset.milestoneId, select.value);
    });
  });

  els.milestoneList.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const milestoneId = button.dataset.milestoneId;

      if (action === 'edit-milestone') {
        openEditMilestoneModal(milestoneId);
      }

      if (action === 'delete-milestone') {
        openEditMilestoneModal(milestoneId);
      }
    });
  });
}

function renderEmptyAuthState() {
  renderStats({
    projects: { total: 0, active: 0, completed: 0 },
    milestones: { total: 0, completed: 0, overdue: 0 }
  });

  if (els.projectList) {
    els.projectList.innerHTML = `
      <div class="card project-empty-card">
        <h2>Login required</h2>
        <p>You need to be logged in to manage projects.</p>
      </div>
    `;
  }

  if (els.milestoneList) {
    els.milestoneList.innerHTML = `
      <div class="card project-empty-card">
        <h2>No project selected</h2>
        <p>Milestones will appear here after you log in and select a project.</p>
      </div>
    `;
  }

  if (els.newProjectBtn) els.newProjectBtn.disabled = true;
  if (els.newMilestoneBtn) els.newMilestoneBtn.disabled = true;
}

/* Project interactions */

async function selectProject(projectId) {
  clearMessage();
  selectedProjectId = Number(projectId);
  renderProjects();
  await loadMilestones(selectedProjectId);
}

function openNewProjectModal() {
  clearMessage();
  editingProjectId = null;

  els.projectModalTitle.textContent = 'New Project';
  els.projectForm.reset();
  els.projectId.value = '';
  els.projectStatus.value = 'active';

  if (els.projectStatusGroup) {
    els.projectStatusGroup.hidden = true;
  }

  if (els.deleteProjectBtn) {
    els.deleteProjectBtn.hidden = true;
  }

  openModal(els.projectModal);
  els.projectTitle.focus();
}

function openEditProjectModal(projectId) {
  clearMessage();

  const project = projects.find(item => Number(item.id) === Number(projectId));
  if (!project) {
    showMessage('Project not found.', 'error');
    return;
  }

  editingProjectId = Number(project.id);

  els.projectModalTitle.textContent = 'Edit Project';
  els.projectId.value = project.id;
  els.projectTitle.value = project.title || '';
  els.projectDescription.value = project.description || '';
  els.projectGitUrl.value = project.gitUrl || '';
  els.projectMembers.value = membersToTextarea(project.groupMembers, project.memberRoles);
  els.projectStatus.value = project.status === 'completed' ? 'completed' : 'active';

  if (els.projectStatusGroup) {
    els.projectStatusGroup.hidden = false;
  }

  if (els.deleteProjectBtn) {
    els.deleteProjectBtn.hidden = false;
  }

  openModal(els.projectModal);
  els.projectTitle.focus();
}

function closeProjectModal() {
  closeModal(els.projectModal);
  editingProjectId = null;
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  clearMessage();

  const title = els.projectTitle.value.trim();

  if (!title) {
    showMessage('Project title is required.', 'error');
    return;
  }

  const memberData = parseMembersTextarea(els.projectMembers.value);

  const payload = {
    title,
    description: optionalValue(els.projectDescription.value),
    groupMembers: memberData.groupMembers,
    memberRoles: memberData.memberRoles,
    gitUrl: optionalValue(els.projectGitUrl.value)
  };

  if (editingProjectId) {
    payload.status = els.projectStatus.value;
  }

  try {
    if (editingProjectId) {
      await apiRequest(`/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      });

      showMessage('Project updated successfully.', 'success');
    } else {
      const data = await apiRequest('/projects', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      });

      selectedProjectId = data.projectId;
      showMessage('Project created successfully.', 'success');
    }

    closeProjectModal();

    await Promise.all([
      loadProjectStats(),
      loadProjects()
    ]);
  } catch (error) {
    console.error('Project save error:', error.message);
    showMessage(error.message || 'Could not save project.', 'error');
  }
}

async function handleProjectDelete() {
  if (!editingProjectId) return;

  const confirmed = window.confirm('Delete this project? This will archive the project and hide it from your planner.');

  if (!confirmed) return;

  try {
    await apiRequest(`/projects/${editingProjectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (Number(selectedProjectId) === Number(editingProjectId)) {
      selectedProjectId = null;
    }

    closeProjectModal();
    showMessage('Project deleted successfully.', 'success');

    await Promise.all([
      loadProjectStats(),
      loadProjects()
    ]);
  } catch (error) {
    console.error('Project delete error:', error.message);
    showMessage(error.message || 'Could not delete project.', 'error');
  }
}

/* Milestone interactions */

function openNewMilestoneModal() {
  clearMessage();

  if (!selectedProjectId) {
    showMessage('Select a project before adding a milestone.', 'error');
    return;
  }

  editingMilestoneId = null;

  els.milestoneModalTitle.textContent = 'New Milestone';
  els.milestoneForm.reset();
  els.milestoneId.value = '';
  els.milestoneStatus.value = 'not started';
  els.milestoneSortOrder.value = getNextSortOrder();

  if (els.deleteMilestoneBtn) {
    els.deleteMilestoneBtn.hidden = true;
  }

  openModal(els.milestoneModal);
  els.milestoneTitle.focus();
}

function openEditMilestoneModal(milestoneId) {
  clearMessage();

  const milestone = milestones.find(item => Number(item.id) === Number(milestoneId));
  if (!milestone) {
    showMessage('Milestone not found.', 'error');
    return;
  }

  editingMilestoneId = Number(milestone.id);

  els.milestoneModalTitle.textContent = 'Edit Milestone';
  els.milestoneId.value = milestone.id;
  els.milestoneTitle.value = milestone.title || '';
  els.milestoneDescription.value = milestone.description || '';
  els.milestoneDueDate.value = milestone.dueDate || '';
  els.milestoneSortOrder.value = milestone.sortOrder ?? 0;
  els.milestoneStatus.value = milestone.status || 'not started';

  if (els.deleteMilestoneBtn) {
    els.deleteMilestoneBtn.hidden = false;
  }

  openModal(els.milestoneModal);
  els.milestoneTitle.focus();
}

function closeMilestoneModal() {
  closeModal(els.milestoneModal);
  editingMilestoneId = null;
}

async function handleMilestoneSubmit(event) {
  event.preventDefault();
  clearMessage();

  if (!selectedProjectId) {
    showMessage('Select a project before saving a milestone.', 'error');
    return;
  }

  const title = els.milestoneTitle.value.trim();

  if (!title) {
    showMessage('Milestone title is required.', 'error');
    return;
  }

  const payload = {
    title,
    description: optionalValue(els.milestoneDescription.value),
    dueDate: optionalValue(els.milestoneDueDate.value),
    status: els.milestoneStatus.value,
    sortOrder: Number(els.milestoneSortOrder.value) || 0
  };

  try {
    if (editingMilestoneId) {
      await apiRequest(`/milestones/${editingMilestoneId}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      });

      showMessage('Milestone updated successfully.', 'success');
    } else {
      await apiRequest(`/projects/${selectedProjectId}/milestones`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      });

      showMessage('Milestone created successfully.', 'success');
    }

    closeMilestoneModal();

    await Promise.all([
      loadProjectStats(),
      loadMilestones(selectedProjectId)
    ]);
  } catch (error) {
    console.error('Milestone save error:', error.message);
    showMessage(error.message || 'Could not save milestone.', 'error');
  }
}

async function updateMilestoneStatus(milestoneId, status) {
  clearMessage();

  try {
    await apiRequest(`/milestones/${milestoneId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status })
    });

    await Promise.all([
      loadProjectStats(),
      loadMilestones(selectedProjectId)
    ]);

    showMessage('Milestone status updated.', 'success');
  } catch (error) {
    console.error('Milestone status update error:', error.message);
    showMessage(error.message || 'Could not update milestone status.', 'error');
    await loadMilestones(selectedProjectId);
  }
}

async function handleMilestoneDelete() {
  if (!editingMilestoneId) return;

  const confirmed = window.confirm('Delete this milestone? This cannot be undone.');

  if (!confirmed) return;

  try {
    await apiRequest(`/milestones/${editingMilestoneId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    closeMilestoneModal();
    showMessage('Milestone deleted successfully.', 'success');

    await Promise.all([
      loadProjectStats(),
      loadMilestones(selectedProjectId)
    ]);
  } catch (error) {
    console.error('Milestone delete error:', error.message);
    showMessage(error.message || 'Could not delete milestone.', 'error');
  }
}

/* Modal helpers */

function openModal(modal) {
  if (!modal) return;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

/* Formatting / parsing helpers */

function getSelectedProject() {
  return projects.find(project => Number(project.id) === Number(selectedProjectId)) || null;
}

function getNextSortOrder() {
  if (!milestones.length) return 0;

  const highestSortOrder = milestones.reduce((highest, milestone) => {
    const current = Number(milestone.sortOrder) || 0;
    return current > highest ? current : highest;
  }, 0);

  return highestSortOrder + 1;
}

function parseMembersTextarea(value) {
  const groupMembers = [];
  const memberRoles = {};

  const lines = value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  lines.forEach(line => {
    const parts = line.split(' - ');
    const name = parts[0]?.trim();
    const role = parts.slice(1).join(' - ').trim();

    if (!name) return;

    groupMembers.push(name);

    if (role) {
      memberRoles[name] = role;
    }
  });

  return { groupMembers, memberRoles };
}

function membersToTextarea(groupMembers = [], memberRoles = {}) {
  if (!Array.isArray(groupMembers) || groupMembers.length === 0) {
    return '';
  }

  return groupMembers.map(member => {
    const role = memberRoles?.[member];

    if (role) {
      return `${member} - ${role}`;
    }

    return member;
  }).join('\n');
}

function renderMembers(groupMembers = [], memberRoles = {}) {
  if (!Array.isArray(groupMembers) || groupMembers.length === 0) {
    return '';
  }

  const items = groupMembers.map(member => {
    const role = memberRoles?.[member];
    const label = role ? `${member} — ${role}` : member;
    return `<li>${escapeHtml(label)}</li>`;
  }).join('');

  return `
    <ul class="project-members-list">
      ${items}
    </ul>
  `;
}

function getProjectStatusBadgeClass(status) {
  if (status === 'completed') return 'badge-completed';
  return 'badge-in-progress';
}

function getMilestoneStatusBadgeClass(status) {
  if (status === 'completed') return 'badge-completed';
  if (status === 'in progress') return 'badge-in-progress';
  return 'badge-not-started';
}

function getDueDateInfo(milestone) {
  if (!milestone.dueDate) {
    return {
      text: 'No due date',
      className: ''
    };
  }

  if (milestone.status === 'completed') {
    return {
      text: `Due: ${formatDate(milestone.dueDate)}`,
      className: 'project-completed-text'
    };
  }

  if (isOverdue(milestone.dueDate)) {
    return {
      text: `Overdue: ${formatDate(milestone.dueDate)}`,
      className: 'project-overdue-text'
    };
  }

  return {
    text: `Due: ${formatDate(milestone.dueDate)}`,
    className: ''
  };
}

function isOverdue(dateString) {
  const today = new Date();
  const dueDate = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function formatStatus(status) {
  if (!status) return 'Active';

  return status
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateString) {
  if (!dateString) return '';

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

function formatDateTime(dateValue, label) {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return `${label}: ${dateValue}`;
  }

  return `${label}: ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;
}

function optionalValue(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}