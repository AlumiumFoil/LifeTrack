//This is the JS logic file for our dashboard page

//waits till page is completely loaded before attempting to access DOM elements
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

//reads saved JWT/access token from the localStorage
function getAccessToken() {
  return localStorage.getItem("accessToken");
}

//user info stored as JSON in localStorage after login
function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) { //if parsing fails it will return null so page can fall back safely
    return null;
  }
}

// loads saved accessibility settings for the logged-in user
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

// applies the user accessibility mode to the current page
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

//helper function (shared) for showing success/error messages on the dash
function showDashboardMessage(message, type = "success") {
  const dashboardMessage = document.getElementById("dashboardMessage");
  if (!dashboardMessage) return;

  dashboardMessage.style.display = "block";
  dashboardMessage.className = "status-message";
  dashboardMessage.classList.add(type);
  dashboardMessage.textContent = message;
}

//loads basic user info we currently have locally.
//this lets the page show something before the API finishes loading
function setWelcomeFromStoredUser() {
  const storedUser = getStoredUser();

  const profileUsernameTop = document.getElementById("profileUsernameTop");
  const dashboardWelcome = document.getElementById("dashboardWelcome");
  //const profileUsername = document.getElementById("profileUsername");
  //const profileEmail = document.getElementById("profileEmail");

  //fallback content when we dont have any saved user/data exists yet
  if (!storedUser) {
    if (dashboardWelcome) dashboardWelcome.textContent = "Welcome!";
    //if (profileUsername) profileUsername.textContent = "Guest User";
    //if (profileEmail) profileEmail.textContent = "Sign in to load your profile";
    if (profileUsernameTop) profileUsernameTop.textContent = "Profile";
    return;
  }

  if (dashboardWelcome) {
    dashboardWelcome.textContent = `Welcome, ${storedUser.username || "User"}!`;
  }

 /* if (profileUsername) {
    profileUsername.textContent = storedUser.username || "User";
  }

  if (profileEmail) {
    profileEmail.textContent = storedUser.email || "";
  }
*/
  if (profileUsernameTop) {
  profileUsernameTop.textContent = storedUser.username || "Profile";
}
}

//shows local fallback data first
async function initializeDashboard() {
  setWelcomeFromStoredUser();
  await loadAccessibilitySettings();

  const refreshButton = document.getElementById("refreshDashboardBtn");
  const logoutButton = document.getElementById("logoutBtn");
  //const uploadButton = document.getElementById("uploadProfileBtn");

  //this hooks up the upload button for the profile image uploads
  if (refreshButton) {
    refreshButton.addEventListener("click", loadDashboardData);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logoutUser);
  }

  //loads lives dashboard data from backend
  //if (uploadButton) {
    //uploadButton.addEventListener("click", uploadProfileImage);
 // }

  await loadDashboardData();
}

//loads user info/data from the backend
async function loadDashboardData() {
  const token = getAccessToken();

  //if no token exists the user is currently not logged in
  //the page will stay usable, but only with the fallback/default content
  if (!token) {
    showDashboardMessage("No saved login found yet. Dashboard is showing fallback content.", "error");
    return;
  }

  //requests the logged in users dashboard data from the backend
  try {
    const response = await fetch("/api/users/me/dashboard", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    //the route may return http success or failure and all a success flag in the JSON
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load dashboard.");
    }

    //fill out the page with love data from the response
    populateDashboard(data.dashboard);
    showDashboardMessage("Dashboard loaded successfully.", "success");
  //handles both backend generated errors and fetch failures
  } catch (error) {
    showDashboardMessage(error.message || "An error occurred while loading dashboard.", "error");
  }
}

//this is what actually fills in the dashboard with different fields/user data
//currently uses actual user info and filler data
function populateDashboard(dashboard) {
  //this is an extra safeguard so we don't break the api returns missing data
  if (!dashboard) return;

  //breaks up the dash data into smaller sections & provides defaults
  const profile = dashboard.profile || {};
  //const summary = dashboard.summary || {};
  const projects = Array.isArray(dashboard.projects) ? dashboard.projects : [];
  //const academicProgress = Array.isArray(dashboard.academicProgress) ? dashboard.academicProgress : [];
  const wellnessEntries = Array.isArray(dashboard.wellnessMoodEntries) ? dashboard.wellnessMoodEntries : [];

  const dashboardWelcome = document.getElementById("dashboardWelcome");
  //const profileUsername = document.getElementById("profileUsername");
  const profileUsernameTop = document.getElementById("profileUsernameTop");
  //const profileEmail = document.getElementById("profileEmail");
  const profilePreview = document.getElementById("profilePreview");

  //updates the visible profile/welcome text using backend data
  if (dashboardWelcome) {
    dashboardWelcome.textContent = `Welcome, ${profile.username || "User"}!`;
  }

  /*if (profileUsername) {
    profileUsername.textContent = profile.username || "User";
  }
  */
  if (profileUsernameTop) {
  profileUsernameTop.textContent = profile.username || "Profile";
  }
  /*
  if (profileEmail) {
    profileEmail.textContent = profile.email || "";
  }
  */

  //updates profile image preview if the abckend provides one
  if (profilePreview && profile.profileThumbnailUrl) {
    profilePreview.src = profile.profileThumbnailUrl;
  }

  /*
  //fills summary counts, defaults to 0 if any vals are missing
  document.getElementById("goalCount").textContent = summary.goalCount ?? 0;
  document.getElementById("projectCount").textContent = summary.projectCount ?? 0;
  document.getElementById("milestoneCount").textContent = summary.milestoneCount ?? 0;
  */

  //render each dashboard section
  loadAcademicAssignmentsSnapshot();
  loadTodaysScheduleSnapshot();
  loadProjectMilestonesSnapshot();
  renderWellness(wellnessEntries);
}

//loads upcoming academic assignments for the dashboard academic snapshot
async function loadAcademicAssignmentsSnapshot() {
  const token = getAccessToken();
  const container = document.getElementById("academicAssignmentsList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `<p class="small">Sign in to view upcoming assignments.</p>`;
    return;
  }

  try {
    const response = await fetch("/api/academic/assignments?status=Upcoming", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load upcoming assignments.");
    }

    renderAcademicAssignmentsSnapshot(data.assignments || []);
  } catch (error) {
    console.error("Academic dashboard snapshot error:", error.message || error);
    container.innerHTML = `<p class="small">Could not load upcoming assignments.</p>`;
  }
}

//renders the upcoming assignment snapshot inside the academic dashboard card
function renderAcademicAssignmentsSnapshot(assignments) {
  const container = document.getElementById("academicAssignmentsList");
  if (!container) return;

  if (!assignments.length) {
    container.innerHTML = `<p class="small">No upcoming assignments. Schedule is wide open.</p>`;
    return;
  }

  container.innerHTML = assignments.slice(0, 3).map((assignment) => {
    const dueDateText = formatDashboardDate(assignment.dueDate);

    return `
      <div class="dashboard-list-item">
        <strong>${escapeHtml(assignment.title || "Untitled Assignment")}</strong>
        <span class="small">
          ${escapeHtml(assignment.courseName || "No course")}
          ${dueDateText ? ` • Due: ${escapeHtml(dueDateText)}` : ""}
          • ${escapeHtml(assignment.status || "Upcoming")}
        </span>
      </div>
    `;
  }).join("");
}

//loads today's schedule from the weekly planner combined assignment/planner endpoint
async function loadTodaysScheduleSnapshot() {
  const token = getAccessToken();
  const container = document.getElementById("academicProgressList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `<p class="small">Sign in to view today's schedule.</p>`;
    return;
  }

  try {
    const today = getDashboardLocalDate();
    const weekStart = getDashboardStartOfWeek(today);

    const response = await fetch(`/api/academic/weekly-planner?weekStart=${weekStart}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load today's schedule.");
    }

    const weeklyItems = Array.isArray(data.items) ? data.items : [];
    const todayItems = weeklyItems.filter(item => item.dueDate === today);

    renderTodaysScheduleSnapshot(todayItems);
  } catch (error) {
    console.error("Today's schedule dashboard snapshot error:", error.message || error);
    container.innerHTML = `<p class="small">Could not load today's schedule.</p>`;
  }
}

//renders assignments and planner items due today
function renderTodaysScheduleSnapshot(items) {
  const container = document.getElementById("academicProgressList");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p class="small">Nothing scheduled for today.</p>`;
    return;
  }

  const sortedItems = items.sort((a, b) => {
    const aDone = isDashboardCompletedStatus(a.status);
    const bDone = isDashboardCompletedStatus(b.status);

    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }

    const aSourceOrder = a.source === "assignment" ? 0 : 1;
    const bSourceOrder = b.source === "assignment" ? 0 : 1;

    if (aSourceOrder !== bSourceOrder) {
      return aSourceOrder - bSourceOrder;
    }

    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  container.innerHTML = sortedItems.slice(0, 5).map((item) => {
    const sourceLabel = item.source === "assignment" ? "Assignment" : "Planner";
    const contextLabel = item.source === "assignment"
      ? item.courseName || item.category || "Academic"
      : item.category || "Planner Item";

    return `
      <div class="dashboard-list-item">
        <strong>${escapeHtml(item.title || "Untitled Item")}</strong>
        <span class="small">
          ${escapeHtml(sourceLabel)}
          ${contextLabel ? ` • ${escapeHtml(contextLabel)}` : ""}
          • ${escapeHtml(formatDashboardStatus(item.status || "pending"))}
        </span>
      </div>
    `;
  }).join("");
}

//this fills out the project progress card (milestones).
//loads upcoming project milestones for the dashboard snapshot
async function loadProjectMilestonesSnapshot() {
  const token = getAccessToken();
  const container = document.getElementById("projectList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `<p class="small">Sign in to view upcoming milestones.</p>`;
    return;
  }

  try {
    const [projectsResponse, milestonesResponse] = await Promise.all([
      fetch("/api/goals/projects", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }),
      fetch("/api/goals/milestones", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
    ]);

    const projectsData = await projectsResponse.json();
    const milestonesData = await milestonesResponse.json();

    if (!projectsResponse.ok || !projectsData.success) {
      throw new Error(projectsData.error || "Could not load projects.");
    }

    if (!milestonesResponse.ok || !milestonesData.success) {
      throw new Error(milestonesData.error || "Could not load milestones.");
    }

    const visibleProjects = Array.isArray(projectsData.projects)
      ? projectsData.projects
      : [];

    const allMilestones = Array.isArray(milestonesData.milestones)
      ? milestonesData.milestones
      : [];

    renderProjectMilestonesSnapshot(visibleProjects, allMilestones);
  } catch (error) {
    console.error("Project milestones dashboard snapshot error:", error.message || error);
    container.innerHTML = `<p class="small">Could not load upcoming milestones.</p>`;
  }
}

//renders upcoming milestones attached only to visible/non-archived projects
function renderProjectMilestonesSnapshot(projects, milestones) {
  const container = document.getElementById("projectList");
  if (!container) return;

  const visibleProjectIds = new Set(
    projects.map(project => Number(project.id))
  );

  const projectTitleById = new Map(
    projects.map(project => [Number(project.id), project.title || "Untitled Project"])
  );

  const visibleMilestones = milestones
    .filter(milestone => visibleProjectIds.has(Number(milestone.projectId)))
    .filter(milestone => milestone.status !== "completed");

  const sortedMilestones = visibleMilestones.sort((a, b) => {
    const aOverdue = isDashboardOverdue(a.dueDate) ? 0 : 1;
    const bOverdue = isDashboardOverdue(b.dueDate) ? 0 : 1;

    if (aOverdue !== bOverdue) {
      return aOverdue - bOverdue;
    }

    const aTime = getDashboardDateTime(a.dueDate);
    const bTime = getDashboardDateTime(b.dueDate);

    return aTime - bTime;
  });

  if (!sortedMilestones.length) {
    container.innerHTML = `<p class="small">No upcoming milestones. Project schedule is clear.</p>`;
    return;
  }

  container.innerHTML = sortedMilestones.slice(0, 3).map((milestone) => {
    const projectTitle = projectTitleById.get(Number(milestone.projectId)) || "Untitled Project";
    const dueDateText = formatDashboardDate(milestone.dueDate);
    const dueLabel = isDashboardOverdue(milestone.dueDate) ? "Overdue" : "Due";

    return `
      <div class="dashboard-list-item">
        <strong>${escapeHtml(milestone.title || "Untitled Milestone")}</strong>
        <span class="small">${escapeHtml(projectTitle)}</span>
        <span class="small">
          ${dueDateText ? `${dueLabel}: ${escapeHtml(dueDateText)} • ` : ""}
          ${escapeHtml(formatDashboardStatus(milestone.status || "not started"))}
        </span>
      </div>
    `;
  }).join("");
}

//this will fill out the wellness progress card.
//currently it uses the default untill post HP when linked with wellness data
function renderWellness(items) {
  const container = document.getElementById("wellnessList");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p class="small">No wellness entries found yet.</p>`;
    return;
  }

  container.innerHTML = items.slice(0, 5).map((entry) => `
    <div class="dashboard-list-item">
      <strong>Mood: ${escapeHtml(entry.moodValue ?? "N/A")}</strong>
      <span class="small">${escapeHtml(entry.note || "No note added.")}</span>
    </div>
  `).join("");
}

//user logout
function logoutUser() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "./auth.html";
}

//returns a comparable timestamp for dashboard sorting
function getDashboardDateTime(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }

  return date.getTime();
}

//checks whether a dashboard date is overdue
function isDashboardOverdue(value) {
  if (!value) return false;

  const today = new Date();
  const dueDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

//formats status text like "in progress" into "In Progress"
function formatDashboardStatus(status) {
  if (!status) return "";

  return String(status)
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

//formats dates for dashboard cards
function formatDashboardDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

//returns today's local date as YYYY-MM-DD
function getDashboardLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

//returns the Sunday week start for a YYYY-MM-DD date string
function getDashboardStartOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setHours(0, 0, 0, 0);

  const dayOfWeek = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

//dashboard version of completed/finished status check
function isDashboardCompletedStatus(status) {
  return status === "completed" || status === "graded";
}

//prevents html injection by replacing special chars w/ safe html versions 
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}