//shared accessibility file for resources that no need need any additional backend support - info only files

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  setResourceHeaderFromStoredUser();
  await loadAccessibilitySettings();
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

function setResourceHeaderFromStoredUser() {
  const storedUser = getStoredUser();
  const profileUsernameTop = document.getElementById("profileUsernameTop");

  if (!storedUser) {
    if (profileUsernameTop) {
      profileUsernameTop.textContent = "Profile";
    }
    return;
  }

  if (profileUsernameTop) {
    profileUsernameTop.textContent = storedUser.username || "Profile";
  }
}

async function loadAccessibilitySettings() {
  const token = getAccessToken();

  // static resource pages should still load normally for users without a token
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