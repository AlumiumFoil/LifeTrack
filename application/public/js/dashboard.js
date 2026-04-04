document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

function showDashboardMessage(message, type = "success") {
  const dashboardMessage = document.getElementById("dashboardMessage");
  if (!dashboardMessage) return;

  dashboardMessage.style.display = "block";
  dashboardMessage.className = "status-message";
  dashboardMessage.classList.add(type);
  dashboardMessage.textContent = message;
}

function setWelcomeFromStoredUser() {
  const storedUser = getStoredUser();

  const profileUsernameTop = document.getElementById("profileUsernameTop");
  const dashboardWelcome = document.getElementById("dashboardWelcome");
  const profileUsername = document.getElementById("profileUsername");
  const profileEmail = document.getElementById("profileEmail");

  if (!storedUser) {
    if (dashboardWelcome) dashboardWelcome.textContent = "Welcome!";
    if (profileUsername) profileUsername.textContent = "Guest User";
    if (profileEmail) profileEmail.textContent = "Sign in to load your profile";
    if (profileUsernameTop) profileUsernameTop.textContent = "Profile";
    return;
  }

  if (dashboardWelcome) {
    dashboardWelcome.textContent = `Welcome, ${storedUser.username || "User"}!`;
  }

  if (profileUsername) {
    profileUsername.textContent = storedUser.username || "User";
  }

  if (profileEmail) {
    profileEmail.textContent = storedUser.email || "";
  }

  if (profileUsernameTop) {
  profileUsernameTop.textContent = storedUser.username || "Profile";
}
}

async function initializeDashboard() {
  setWelcomeFromStoredUser();

  const refreshButton = document.getElementById("refreshDashboardBtn");
  const uploadButton = document.getElementById("uploadProfileBtn");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadDashboardData);
  }

  if (uploadButton) {
    uploadButton.addEventListener("click", uploadProfileImage);
  }

  await loadDashboardData();
}

async function loadDashboardData() {
  const token = getAccessToken();

  if (!token) {
    showDashboardMessage("No saved login found yet. Dashboard is showing fallback content.", "error");
    return;
  }

  try {
    const response = await fetch("/api/users/me/dashboard", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load dashboard.");
    }

    populateDashboard(data.dashboard);
    showDashboardMessage("Dashboard loaded successfully.", "success");
  } catch (error) {
    showDashboardMessage(error.message || "An error occurred while loading dashboard.", "error");
  }
}

function populateDashboard(dashboard) {
  if (!dashboard) return;

  const profile = dashboard.profile || {};
  const summary = dashboard.summary || {};
  const projects = Array.isArray(dashboard.projects) ? dashboard.projects : [];
  const academicProgress = Array.isArray(dashboard.academicProgress) ? dashboard.academicProgress : [];
  const wellnessEntries = Array.isArray(dashboard.wellnessMoodEntries) ? dashboard.wellnessMoodEntries : [];

  const dashboardWelcome = document.getElementById("dashboardWelcome");
  const profileUsername = document.getElementById("profileUsername");
  const profileUsernameTop = document.getElementById("profileUsernameTop");
  const profileEmail = document.getElementById("profileEmail");
  const profilePreview = document.getElementById("profilePreview");

  if (dashboardWelcome) {
    dashboardWelcome.textContent = `Welcome, ${profile.username || "User"}!`;
  }

  if (profileUsername) {
    profileUsername.textContent = profile.username || "User";
  }

  if (profileUsernameTop) {
  profileUsernameTop.textContent = profile.username || "Profile";
  }

  if (profileEmail) {
    profileEmail.textContent = profile.email || "";
  }

  if (profilePreview && profile.profileThumbnailUrl) {
    profilePreview.src = profile.profileThumbnailUrl;
  }

  document.getElementById("goalCount").textContent = summary.goalCount ?? 0;
  document.getElementById("projectCount").textContent = summary.projectCount ?? 0;
  document.getElementById("milestoneCount").textContent = summary.milestoneCount ?? 0;

  renderAcademicProgress(academicProgress);
  renderProjects(projects);
  renderWellness(wellnessEntries);
}

function renderAcademicProgress(items) {
  const container = document.getElementById("academicProgressList");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p class="small">No academic progress records yet.</p>`;
    return;
  }

  container.innerHTML = items.slice(0, 5).map((item) => `
    <div class="dashboard-list-item">
      <strong>${escapeHtml(item.courseName || "Unnamed Course")}</strong>
      <span class="small">${Number(item.progressPercent ?? 0)}% complete</span>
    </div>
  `).join("");
}

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

async function uploadProfileImage() {
  const token = getAccessToken();
  const fileInput = document.getElementById("profileImageInput");

  if (!token) {
    showDashboardMessage("You must be logged in to upload a profile image.", "error");
    return;
  }

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showDashboardMessage("Please choose an image first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("profileImage", fileInput.files[0]);

  try {
    const response = await fetch("/api/users/me/profile-image", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Profile image upload failed.");
    }

    if (data.image && data.image.profileThumbnailUrl) {
      const profilePreview = document.getElementById("profilePreview");
      if (profilePreview) {
        profilePreview.src = data.image.profileThumbnailUrl;
      }
    }

    showDashboardMessage("Profile image uploaded successfully.", "success");
  } catch (error) {
    showDashboardMessage(error.message || "An error occurred while uploading image.", "error");
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}