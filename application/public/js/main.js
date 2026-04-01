//waits till page has finished loading before running JS
//Stops errors if JS accesses elements before they exist in DOM
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  //runs search/results if we are on the test_results page.
  //keeps JS shared & only activate API on page that needs it
  if (path.endsWith("test_results.html")) {
    loadSearchResults();
  }


  if (path.endsWith("auth.html")) {
    initializeLoginForm();
  }


  if (path.endsWith("register.html")) {
  initializeRegisterForm();
}
});

//Reads search values from URL & sends them to abckend, then updates page based on the response
async function loadSearchResults() {
  //grab query string from URL (if they dont exist use empty string)
  const params = new URLSearchParams(window.location.search);
  const q = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();

  //reference to HTML elements which we will update dynamically
  const resultsSummary = document.getElementById("resultsSummary");
  const activeFilters = document.getElementById("activeFilters");
  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  const emptyState = document.getElementById("emptyState");
  const resultsGrid = document.getElementById("resultsGrid");

  //build text summary of current filters used
  const filterParts = [];
  if (q) filterParts.push(`Keyword: "${q}"`);
  if (category) filterParts.push(`Category: ${capitalizeWords(category)}`);

  //if no filters, show all public resoutrces
  activeFilters.textContent =
    filterParts.length > 0
      ? filterParts.join(" • ")
      : "Showing all public resources";

  //build api query param that is sent to backend
  //include q & category if user provided them
  try {
    const apiParams = new URLSearchParams();
    if (q) apiParams.append("q", q);
    if (category) apiParams.append("category", category);

    //GET request to backend serach route
    //convert backend JSON text to JS object
    const response = await fetch(`/api/resources/search?${apiParams.toString()}`);
    const data = await response.json();

    //request finished --> hide loading box
    loadingState.style.display = "none";

    //if hhtp request failure or backend success = false
    //treat as error & jump to catch block
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Search request failed.");
    }

    //results is always treated as array, if missing use empty array
    //Use total from backend (if exists), otherwise count results array
    const results = Array.isArray(data.results) ? data.results : [];
    const total = typeof data.total === "number" ? data.total : results.length;

    //no matching results found --> show message
    if (results.length === 0) {
      resultsSummary.textContent = "Search completed, but no matching resources were found.";
      emptyState.style.display = "block";
      return;
    }

    //update summary text & top of page
    resultsSummary.textContent = `Displaying ${total} resource${total === 1 ? "" : "s"} from the vertical prototype search.`;

    //turn each result into html card w/ buildResultCard, combine into 1 string & place in grid
    //make sure results grid is visible since cards are rdy
    resultsGrid.innerHTML = results.map(buildResultCard).join("");
    resultsGrid.style.display = "grid";
    //if something goes wrong/error (network/backend/etc.) hide loading & show error box
  } catch (error) {
    loadingState.style.display = "none";
    errorState.style.display = "block";
    errorMessage.textContent = error.message || "Something went wrong while loading results.";
  }
}

//build one result card using html string, each item from backend turns into one visual card on page
function buildResultCard(item) {
  //prepare text values (safely/securly) so unexpected chars dont break html
  const title = escapeHtml(item.title || "Untitled Resource");
  const description = escapeHtml(item.description || "No description available.");
  const category = escapeHtml(item.category || "Uncategorized");
  const contentType = escapeHtml(item.content_type || "Unknown Type");
  //if image provided exists use it, if not use placeholder img
  const imageUrl = item.image_url || "https://placehold.co/600x340?text=No+Image";
  //use resource link if exists, otherwise use # so btn does not break
  const url = item.url || "#";
  //show resource id if exists, if not display NA
  const resourceId = item.resource_id ?? "N/A";

  //escape attribute vals separately to keep from breaking src="" or href=""
  const safeImageUrl = escapeAttribute(imageUrl);
  const safeUrl = escapeAttribute(url);

  //return full html for one result vard
  return `
    <article class="card result-card">
      <img
        class="result-image"
        src="${safeImageUrl}"
        alt="${title}"
        onerror="this.src='https://placehold.co/600x340?text=Image+Unavailable';"
      />

      <div class="result-content">
        <div class="result-meta">
          <span class="pill">${category}</span>
          <span class="pill">${contentType}</span>
          <span class="pill">ID: ${resourceId}</span>
        </div>

        <h2>${title}</h2>
        <p>${description}</p>

        <div style="margin-top:14px;">
          <a class="btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
            View Resource
          </a>
        </div>
      </div>
    </article>
  `;
}

//helper to amke values display better
//i.e. "community_shared" = "Community Shared"
function capitalizeWords(text) {
  return text
    .split("_")  //"community_shared" --> ["community","shared"]
    .join(" ")  //["community","shared"] --> "community shared"
    .replace(/\b\w/g, (char) => char.toUpperCase()); //capatalize first letter
}

//prevents html injextion by replacing special chars w/ safe html versions 
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

//escape quotes for vals that are placed inside html attributes like src="" or href=""
function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
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

      //If this runs the login has been successul, so we display a success message.
      loginMessage.style.display = "block";
      loginMessage.classList.add("success");
      loginMessage.textContent = "Login successful. Redirecting to dashboard...";

      //After a short pause we send the user to the dashboard
      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 900);

      //If something goes wrong such as a bad response, network failure, some backend error
      //we will display an error message within our status area
    } catch (error) {
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

      //if registration is a success, show message
      registerMessage.style.display = "block";
      registerMessage.classList.add("success");
      registerMessage.textContent = "Registration successful. Redirecting to login...";

      //After a delay, we will return the user to the login page so they can sign in
      setTimeout(() => {
        window.location.href = "./auth.html";
      }, 1200);

      //If registration fails, show the error 
      // which is returned from backend (or our fallback message)
    } catch (error) {
      registerMessage.style.display = "block";
      registerMessage.classList.add("error");
      registerMessage.textContent = error.message || "An error occurred during registration.";
    }
  });
}


