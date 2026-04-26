//waits till page has finished loading before running JS
//Stops errors if JS accesses elements before they exist in DOM
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  
  if (path.endsWith("auth.html")) {
    initializeLoginForm();
  }


  if (path.endsWith("register.html")) {
  initializeRegisterForm();
}
});

//saves the auth session data that is returned from the back
//it stores tokens & basic user info so that later pages can use the auth indpoints
function saveAuthSession(data) {
  if (!data) return;

  if (data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
  }

  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }

  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }
}

//clears the saved auth session data
//is useful for later when we logout or if theres some invalid session handling
function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}


//** This sets up the login form on auth.html (aka our login page). This function
// will listen for the form submission, sends our login info to the backend as JSON 
// and will display it either as successful or an error message on this page.  */
function initializeLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  //checks if the expected items are not on the page. If not it will stop here so that 
  //JS wont throw errors. (Used as a safety check).
  if (!loginForm || !loginMessage) return;

  //When the user submits the login form, it stops the browser from doing a normal 
  //html form submission. We want to do it with fetch()
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    //reads & cleans up vals entered as the user. 
    // The identifier can be either email or username
    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("loginPassword").value;

    //this will reset any status message before a new attempted submission.
    //(removes success or error message & old text)
    loginMessage.style.display = "none";
    loginMessage.className = "status-message";
    loginMessage.textContent = "";

    /** sends login request to backend
     * expected:
     * {
     *  "idnetifier": "...",
     *  "password": "..."
     * }
     */
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifier,
          password
        })
      });

      //convert backend response into JS object
      const data = await response.json();

      //if a request fails or backend returns success:false, we treat it as
      //an error & will show the BE message
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }
      //saves tokens & user info from back
      saveAuthSession(data);

      //If this runs the login has been successul, so we display a success message.
      loginMessage.style.display = "block";
      loginMessage.classList.add("success");
      loginMessage.textContent = "Login successful. Redirecting...";

      //After a short pause we send admins to admin.html and regular users to dashboard.html
      setTimeout(() => {
        const roles = Array.isArray(data.user?.roles) ? data.user.roles : [];

        const isAdmin = roles.some((role) => {
          const normalizedRole = String(role).toLowerCase();
          return normalizedRole === "admin" || normalizedRole === "administrator";
        });

        window.location.href = isAdmin ? "./admin.html" : "./dashboard.html";
      }, 900);

      //If something goes wrong such as a bad response, network failure, some backend error
      //we will display an error message within our status area
    } catch (error) {
      //cleat old/partial session if the login had failed
      clearAuthSession();

      loginMessage.style.display = "block";
      loginMessage.classList.add("error");
      loginMessage.textContent = error.message || "An error occurred during login.";
    }
  });
}

/** This function sets up the registration form on register.html
 * It collects user registration info, packages that info into the JSON 
 * structure thats expected on the backend and sends it with fetch. It will 
 * then display either success or error message on the page
*/
function initializeRegisterForm() {
  const registerForm = document.getElementById("registerForm");
  const registerMessage = document.getElementById("registerMessage");

  //Checks if the form or the message container does not exist. If it doesnt
  //it will stop here. 
  if (!registerForm || !registerMessage) return;

  //When the user submits the registration form, we stop the brower from 
  //reloading the page afterwards. We want to handle the request instead (asynchronously)
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    //reads vals enterted by the user
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const questionText = document.getElementById("securityQuestion").value;
    const answer = document.getElementById("securityAnswer").value.trim();

    //resets message area so old text/messages dont stay visible from a previous attempt
    registerMessage.style.display = "none";
    registerMessage.className = "status-message";
    registerMessage.textContent = "";

    //sends registration info to backend, which expects securityQuestions to be an array
    //for the time being we are only sending one question (may change later)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          username,
          password,
          securityQuestions: [
            {
              question_text: questionText,
              answer
            }
          ]
        })
      });

      //parse JSON response from the backend
      const data = await response.json();

      //if backend responds with an error, or theres a http status failure
      //we will shrow an error (handled below - catch) 
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      //save tokens & user data. Reg logs user in immediately
      saveAuthSession(data);

      //if registration is a success, show message
      registerMessage.style.display = "block";
      registerMessage.classList.add("success");
      registerMessage.textContent = "Registration successful. Redirecting to Dashboard...";

      //After a delay, we will return the user to the login page so they can sign in
      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1000);

      //If registration fails, show the error 
      // which is returned from backend (or our fallback message)
    } catch (error) {
      clearAuthSession();
      
      registerMessage.style.display = "block";
      registerMessage.classList.add("error");
      registerMessage.textContent = error.message || "An error occurred during registration.";
    }
  });
}