// JS logic for our profile page

document.addEventListener("DOMContentLoaded", () => {
  initializeProfilePage();
});

// reads saved access token from localStorage
function getAccessToken() {
  return localStorage.getItem("accessToken");
}

// reads saved user object from localStorage
function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

// updates stored user object when needed
function saveStoredUser(updatedFields = {}) {
  const currentUser = getStoredUser() || {};
  const mergedUser = { ...currentUser, ...updatedFields };
  localStorage.setItem("user", JSON.stringify(mergedUser));
}

// clears local auth session on logout
function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

// shared profile page message area
function showProfileMessage(message, type = "success") {
  const profileMessage = document.getElementById("profileMessage");
  if (!profileMessage) return;

  profileMessage.style.display = "block";
  profileMessage.className = "status-message";
  profileMessage.classList.add(type);
  profileMessage.textContent = message;

  profileMessage.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// hides the message area when needed
function hideProfileMessage() {
  const profileMessage = document.getElementById("profileMessage");
  if (!profileMessage) return;

  profileMessage.style.display = "none";
  profileMessage.className = "status-message";
  profileMessage.textContent = "";
}

// escape html so user-provided text does not inject markup
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// fallback local user info shown before backend profile loads
function setProfileFromStoredUser() {
  const storedUser = getStoredUser();

  const profileUsernameTop = document.getElementById("profileUsernameTop");
  const profileUsername = document.getElementById("profileUsername");
  const profileEmail = document.getElementById("profileEmail");

  if (!storedUser) {
    if (profileUsernameTop) profileUsernameTop.textContent = "Profile";
    if (profileUsername) profileUsername.textContent = "User";
    if (profileEmail) profileEmail.textContent = "Sign in to load profile";
    return;
  }

  if (profileUsernameTop) {
    profileUsernameTop.textContent = storedUser.username || "Profile";
  }

  if (profileUsername) {
    profileUsername.textContent = storedUser.username || "User";
  }

  if (profileEmail) {
    profileEmail.textContent = storedUser.email || "";
  }
}

// profile page startup
async function initializeProfilePage() {
  setProfileFromStoredUser();
  wireProfileEvents();
  await loadUserProfile();
}

// all page event listeners live here
function wireProfileEvents() {
  const logoutButton = document.getElementById("logoutBtn");
  const uploadButton = document.getElementById("uploadProfileBtn");
  const editProfileButton = document.getElementById("editProfileBtn");
  const cancelEditButton = document.getElementById("cancelEditProfileBtn");
  const editProfileForm = document.getElementById("editProfileForm");

  const openPasswordModalButton = document.getElementById("openPasswordModalBtn");
  const cancelPasswordButton = document.getElementById("cancelPasswordBtn");
  const changePasswordForm = document.getElementById("changePasswordForm");

  const loadSecurityQuestionsButton = document.getElementById("loadSecurityQuestionsBtn");

  if (logoutButton) {
    logoutButton.addEventListener("click", logoutUser);
  }

  if (uploadButton) {
    uploadButton.addEventListener("click", uploadProfileImage);
  }

  if (editProfileButton) {
    editProfileButton.addEventListener("click", openEditProfileModal);
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", closeEditProfileModal);
  }

  if (editProfileForm) {
    editProfileForm.addEventListener("submit", submitProfileUpdate);
  }

  if (openPasswordModalButton) {
    openPasswordModalButton.addEventListener("click", openPasswordModal);
  }

  if (cancelPasswordButton) {
    cancelPasswordButton.addEventListener("click", closePasswordModal);
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", submitPasswordChange);
  }

  if (loadSecurityQuestionsButton) {
    loadSecurityQuestionsButton.addEventListener("click", loadSecurityQuestionsForDisplay);
  }

  // allows clicking outside the modal to close it
  const editProfileModal = document.getElementById("editProfileModal");
  const passwordModal = document.getElementById("passwordModal");

  if (editProfileModal) {
    editProfileModal.addEventListener("click", (event) => {
      if (event.target === editProfileModal) {
        closeEditProfileModal();
      }
    });
  }

  if (passwordModal) {
    passwordModal.addEventListener("click", (event) => {
      if (event.target === passwordModal) {
        closePasswordModal();
      }
    });
  }
}

// fetches the full profile from backend
async function loadUserProfile() {
  const token = getAccessToken();

  if (!token) {
    showProfileMessage("No saved login found yet. Please log in again.", "error");
    return;
  }

  try {
    const response = await fetch("/api/users/me/profile", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load profile.");
    }

    populateProfile(data.profile);
    hideProfileMessage();
  } catch (error) {
    showProfileMessage(error.message || "An error occurred while loading profile.", "error");
  }
}

// fills profile page with backend data
function populateProfile(profile) {
  if (!profile) return;

  const username = profile.username || "User";
  const email = profile.email || "";
  const name = profile.name || profile.full_name || "Not set";
  const university = profile.university || "Not set";
  const major = profile.major || "Not set";
  const year = profile.year || profile.academicYear || profile.academic_year || "Not set";
  const accountStatus = profile.account_status || "active";
  const memberSince = formatMemberSince(profile.created_at);

  const profileUsernameTop = document.getElementById("profileUsernameTop");
  const profileUsername = document.getElementById("profileUsername");
  const profileEmail = document.getElementById("profileEmail");
  const profileStatus = document.getElementById("profileStatus");
  const profileMemberSince = document.getElementById("profileMemberSince");

  const profileFullName = document.getElementById("profileFullName");
  const profileUniversity = document.getElementById("profileUniversity");
  const profileMajor = document.getElementById("profileMajor");
  const profileYear = document.getElementById("profileYear");

  const headerPreview = document.getElementById("profilePreview");
  const pageImage = document.getElementById("profilePageImage");

  if (profileUsernameTop) profileUsernameTop.textContent = username;
  if (profileUsername) profileUsername.textContent = username;
  if (profileEmail) profileEmail.textContent = email;
  if (profileStatus) profileStatus.textContent = accountStatus;
  if (profileMemberSince) profileMemberSince.textContent = memberSince;

  if (profileFullName) profileFullName.textContent = name;
  if (profileUniversity) profileUniversity.textContent = university;
  if (profileMajor) profileMajor.textContent = major;
  if (profileYear) profileYear.textContent = year;

  const thumbnailUrl = profile.profile_thumbnail_url || profile.profileThumbnailUrl;
  const imageUrl = profile.profile_image_url || profile.profileImageUrl || thumbnailUrl;

  if (headerPreview && thumbnailUrl) {
    headerPreview.src = thumbnailUrl;
  }

  if (pageImage && imageUrl) {
    pageImage.src = imageUrl;
  }

  // keep localStorage user in sync with important top-right header data
  saveStoredUser({
    username,
    email
  });

  populateEditForm(profile);
}

// fills modal inputs with current data
function populateEditForm(profile) {
  const editName = document.getElementById("editName");
  const editUniversity = document.getElementById("editUniversity");
  const editMajor = document.getElementById("editMajor");
  const editYear = document.getElementById("editYear");

  if (editName) editName.value = profile.name || "";
  if (editUniversity) editUniversity.value = profile.university || "";
  if (editMajor) editMajor.value = profile.major || "";
  if (editYear) editYear.value = profile.year || "";
}

// converts created_at into readable date
function formatMemberSince(dateValue) {
  if (!dateValue) return "--";

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// modal helpers
function openEditProfileModal() {
  const modal = document.getElementById("editProfileModal");
  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeEditProfileModal() {
  const modal = document.getElementById("editProfileModal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function submitProfileUpdate(event) {
  event.preventDefault();

  const token = getAccessToken();

  if (!token) {
    showProfileMessage("You must be logged in to update your profile.", "error");
    return;
  }

  const name = document.getElementById("editName")?.value.trim() || "";
  const university = document.getElementById("editUniversity")?.value.trim() || "";
  const major = document.getElementById("editMajor")?.value.trim() || "";
  const year = document.getElementById("editYear")?.value || "";

  const hasAtLeastOneValue = name || university || major || year;

  if (!hasAtLeastOneValue) {
    showProfileMessage("Please fill in at least one field before saving.", "error");
    return;
  }

  const requestBody = {
    name,
    university,
    major,
    academicYear: year
  };

  try {
    const response = await fetch("/api/users/me/profile", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Profile update failed.");
    }

    populateProfile(data.profile);
    closeEditProfileModal();
    showProfileMessage("Profile updated successfully.", "success");
  } catch (error) {
    showProfileMessage(error.message || "An error occurred while updating profile.", "error");
  }
}

// uploads new profile image
async function uploadProfileImage() {
  const token = getAccessToken();
  const fileInput = document.getElementById("profileImageInput");

  if (!token) {
    showProfileMessage("You must be logged in to upload a profile image.", "error");
    return;
  }

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showProfileMessage("Please choose an image first.", "error");
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

    const headerPreview = document.getElementById("profilePreview");
    const pageImage = document.getElementById("profilePageImage");

    const thumbnailUrl = data.image?.profileThumbnailUrl || data.image?.profile_thumbnail_url;
    const imageUrl = data.image?.profileImageUrl || data.image?.profile_image_url || thumbnailUrl;

    if (headerPreview && thumbnailUrl) {
      headerPreview.src = thumbnailUrl;
    }

    if (pageImage && imageUrl) {
      pageImage.src = imageUrl;
    }

    showProfileMessage("Profile image uploaded successfully.", "success");

    // reload profile so the rest of the page stays in sync with backend
    await loadUserProfile();
  } catch (error) {
    showProfileMessage(error.message || "An error occurred while uploading image.", "error");
  }
}

// security question list for display card
async function loadSecurityQuestionsForDisplay() {
  const token = getAccessToken();

  if (!token) {
    showProfileMessage("You must be logged in to view security questions.", "error");
    return;
  }

  const securityQuestionsBlock = document.getElementById("securityQuestionsBlock");
  const securityQuestionsList = document.getElementById("securityQuestionsList");

  if (!securityQuestionsBlock || !securityQuestionsList) return;

  try {
    const response = await fetch("/api/users/me/security-questions", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load security questions.");
    }

    const questions = Array.isArray(data.securityQuestions) ? data.securityQuestions : [];

    securityQuestionsBlock.style.display = "block";

    if (!questions.length) {
      securityQuestionsList.innerHTML = `<p class="small">No security questions found for this account.</p>`;
      return;
    }

    securityQuestionsList.innerHTML = questions.map((question) => `
      <div class="dashboard-list-item">
        <strong>Question ${escapeHtml(question.question_id)}</strong>
        <span class="small">${escapeHtml(question.question_text || "Unknown question")}</span>
      </div>
    `).join("");

    showProfileMessage("Security questions loaded successfully.", "success");
  } catch (error) {
    showProfileMessage(error.message || "An error occurred while loading security questions.", "error");
  }
}

// password modal helpers
async function openPasswordModal() {
  const modal = document.getElementById("passwordModal");
  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  await loadSecurityQuestionsForPasswordForm();
}

function closePasswordModal() {
  const modal = document.getElementById("passwordModal");
  const form = document.getElementById("changePasswordForm");
  const securityAnswerFields = document.getElementById("securityAnswerFields");

  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  if (form) {
    form.reset();
  }

  if (securityAnswerFields) {
    securityAnswerFields.innerHTML = "";
  }
}

// loads security questions into password change modal
async function loadSecurityQuestionsForPasswordForm() {
  const token = getAccessToken();
  const securityAnswerFields = document.getElementById("securityAnswerFields");

  if (!token || !securityAnswerFields) return;

  securityAnswerFields.innerHTML = `<p class="small">Loading security questions...</p>`;

  try {
    const response = await fetch("/api/users/me/security-questions", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not load security questions.");
    }

    const questions = Array.isArray(data.securityQuestions) ? data.securityQuestions : [];

    if (!questions.length) {
      securityAnswerFields.innerHTML = `<p class="small">No security questions found for this account.</p>`;
      return;
    }

    securityAnswerFields.innerHTML = questions.map((question, index) => `
      <div class="form-group">
        <label for="securityAnswer${index}">
          ${escapeHtml(question.question_text || "Security Question")}
        </label>
        <input
          type="text"
          id="securityAnswer${index}"
          data-question-id="${escapeHtml(question.question_id)}"
          placeholder="Enter your answer"
        />
      </div>
    `).join("");
  } catch (error) {
    securityAnswerFields.innerHTML = `<p class="small">Could not load security questions.</p>`;
    showProfileMessage(error.message || "An error occurred while loading security questions.", "error");
  }
}

// changes password for logged-in user
async function submitPasswordChange(event) {
  event.preventDefault();

  const token = getAccessToken();

  if (!token) {
    showProfileMessage("You must be logged in to change your password.", "error");
    return;
  }

  const currentPassword = document.getElementById("currentPassword")?.value || "";
  const newPassword = document.getElementById("newPassword")?.value || "";

  const answerInputs = Array.from(
    document.querySelectorAll("#securityAnswerFields input[data-question-id]")
  );

  const answers = answerInputs.map((input) => ({
    question_id: Number(input.dataset.questionId),
    answer: input.value.trim()
  }));

  try {
    const response = await fetch("/api/users/me/password", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        answers
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Password change failed.");
    }

    closePasswordModal();
    showProfileMessage("Password changed successfully. Please log in again.", "success");

    setTimeout(() => {
      clearAuthSession();
      window.location.href = "./auth.html";
    }, 1200);
  } catch (error) {
    showProfileMessage(error.message || "An error occurred while changing password.", "error");
  }
}

// logout action
function logoutUser() {
  clearAuthSession();
  window.location.href = "./auth.html";
}