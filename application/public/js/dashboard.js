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
  const academicProgress = Array.isArray(dashboard.academicProgress) ? dashboard.academicProgress : [];
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
  renderAcademicProgress(academicProgress);
  renderProjects(projects);
  renderWellness(wellnessEntries);
}

//this will fill out the academic progress card (schedule).
//currently it uses the default untill post HP when linked with different tasks
function renderAcademicProgress(items) {
  const container = document.getElementById("academicProgressList");
  if (!container) return;

  //default message when no data exists
  if (!items.length) {
    container.innerHTML = `<p class="small">No academic progress records yet.</p>`;
    return;
  }

  //will only show a few items on the dash to keep the card compact
  container.innerHTML = items.slice(0, 5).map((item) => `
    <div class="dashboard-list-item">
      <strong>${escapeHtml(item.courseName || "Unnamed Course")}</strong>
      <span class="small">${Number(item.progressPercent ?? 0)}% complete</span>
    </div>
  `).join("");
}

//this will fill out the project progress card (milestones).
//currently it uses the default untill post HP when linked with our projects data
function renderProjects(items) {
  const container = document.getElementById("projectList");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p class="small">No projects found yet.</p>`;
    return;
  }

  container.innerHTML = items.slice(0, 4).map((project) => {
    const milestones = Array.isArray(project.milestones) ? project.milestones : [];

    return `
      <div class="dashboard-list-item">
        <strong>${escapeHtml(project.title || "Untitled Project")}</strong>
        <span class="small">Status: ${escapeHtml(project.status || "unknown")}</span>
        <span class="small">Milestones: ${milestones.length}</span>
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

//prevents html injection by replacing special chars w/ safe html versions 
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}