// Shared header profile loader
// Include this in every dashboard page to load profile pic and username in the header

async function loadHeaderProfile() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  // first show whatever we have in localStorage immediately
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const profilePreview = document.getElementById("profilePreview");
    const profileUsernameTop = document.getElementById("profileUsernameTop");

    const cachedThumbnail = user?.profileThumbnailUrl || user?.profile_thumbnail_url;
    if (profilePreview && cachedThumbnail) {
      profilePreview.src = cachedThumbnail;
    }
    if (profileUsernameTop && user?.username) {
      profileUsernameTop.textContent = user.username;
    }
  } catch (e) {}

  // then fetch fresh data from API
  try {
    const response = await fetch("/api/users/me/profile", {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok || !data.success) return;

    const profile = data.profile;
    const thumbnailUrl = profile.profile_thumbnail_url || profile.profileThumbnailUrl;
    const username = profile.username;

    const profilePreview = document.getElementById("profilePreview");
    const profileUsernameTop = document.getElementById("profileUsernameTop");

    if (profilePreview && thumbnailUrl) {
      profilePreview.src = thumbnailUrl;
    }
    if (profileUsernameTop && username) {
      profileUsernameTop.textContent = username;
    }

    // save to localStorage for next time
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({
      ...currentUser,
      username,
      profileThumbnailUrl: thumbnailUrl,
      profile_thumbnail_url: thumbnailUrl
    }));
  } catch (e) {
    console.error("Header profile load error:", e.message);
  }
}

document.addEventListener("DOMContentLoaded", loadHeaderProfile);