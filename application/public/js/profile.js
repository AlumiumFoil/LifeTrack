/*
//takes care of our profile image upload in the front
async function uploadProfileImage() {
  const token = getAccessToken();
  const fileInput = document.getElementById("profileImageInput");

  //uploading is blocked if the user is not logged in
  if (!token) {
    showDashboardMessage("You must be logged in to upload a profile image.", "error");
    return;
  }

  //prevents the sending of an empty request
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showDashboardMessage("Please choose an image first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("profileImage", fileInput.files[0]);

  //sends image file to backend using multipart form data
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

    //if the upload was a success/loaded, it updates the image preview immediately w/o reload
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
*/