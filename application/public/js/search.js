/*
    Handles the search results page for the frontend search
    it reads query parameters from results.html, calls the backend search API, 
    and renders loading/error/empty/result states.
  */

//waits till page has finished loading before running JS
//Stops errors if JS accesses elements before they exist in DOM
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.endsWith("results.html")) {
    loadSearchResults();
  }
});

//reads the saved token so logged in users can access personal search results
function getAccessToken() {
  return localStorage.getItem("accessToken");
}

//Reads search values from URL & sends them to abckend, 
//then updates page based on the response
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
      : "Showing all available resources";

  //build api query param that is sent to backend
  //include q & category if user provided them
  try {
    const apiParams = new URLSearchParams();
    if (q) apiParams.append("q", q);
    if (category) apiParams.append("category", category);

    const headers = {};
    const accessToken = getAccessToken();

    //If a token exists, include it so the backend can return personal results
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    //GET request to backend search route
    //convert backend JSON text to JS object
    const response = await fetch(`/api/resources/search?${apiParams.toString()}`, {
      method: "GET",
      headers
    });

    const data = await response.json();

    //request finished --> hide loading box
    loadingState.style.display = "none";

    //if http request failure or backend success = false
    //treat as error & jump to catch block
    if (!response.ok || !data.success) {
      const joinedErrors = Array.isArray(data.errors) ? data.errors.join(" ") : null;
      throw new Error(joinedErrors || data.error || "Search request failed.");
    }

    //results is always treated as array, if missing use empty array
    //Use total from backend (if exists), otherwise count results array
    const results = Array.isArray(data.results) ? data.results : [];
    const total = typeof data.total === "number" ? data.total : results.length;
    const isAuthenticated = Boolean(data.isAuthenticated);

    //no matching results found --> show message
    if (results.length === 0) {
      resultsSummary.textContent =
        "Search completed, but no matching resources were found.";
      emptyState.style.display = "block";
      return;
    }

    //Update the top summary depending on whether the user was authenticated
    resultsSummary.textContent = isAuthenticated
      ? `Displaying ${total} result${total === 1 ? "" : "s"} from public and personal resources.`
      : `Displaying ${total} public result${total === 1 ? "" : "s"}.`;

    //turn each result into html card w/ buildResultCard, combine into 1 string & place in grid
    //make sure results grid is visible since cards are rdy
    resultsGrid.innerHTML = results.map(buildResultCard).join("");
    resultsGrid.style.display = "grid";

    //if something goes wrong/error (network/backend/etc.) hide loading & show error box
  } catch (error) {
    loadingState.style.display = "none";
    errorState.style.display = "block";
    errorMessage.textContent =
      error.message || "Something went wrong while loading results.";
  }
}

//build one result card using html string, each item from backend turns into one visual card on page
function buildResultCard(item) {

  //prepare text values (safely/securly) so unexpected chars dont break html
  const title = escapeHtml(item.title || "Untitled Resource");
  const description = escapeHtml(item.description || "No description available.");
  const category = escapeHtml(item.category || "Uncategorized");
  const source = escapeHtml(item.source || "resource");
  const contentType = escapeHtml(item.content_type || "Unknown Type");
  //if image provided exists use it, if not use placeholder img
  const imageUrl = item.image_url || "https://placehold.co/600x340?text=No+Image";
  //use resource link if exists, otherwise use # so btn does not break
  const url = item.url || "#";
  const itemId = item.id ?? "N/A";
  const safeImageUrl = escapeAttribute(imageUrl);
  const safeUrl = escapeAttribute(url);
  const canOpenExternal = url && url !== "#";

  //return full html for one result card
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
          <span class="pill">${capitalizeWords(category)}</span>
          <span class="pill">${capitalizeWords(source)}</span>
          <span class="pill">${capitalizeWords(contentType)}</span>
          
        </div>

        <h2>${title}</h2>
        <p>${description}</p>

        <div style="margin-top:14px;">
          ${
            canOpenExternal
              ? `<a class="btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">View Resource</a>`
              : `<button class="btn secondary" type="button" disabled>No External Link</button>`
          }
        </div>
      </div>
    </article>
  `;
}

//helper to amke values display better
//i.e. "community_shared" = "Community Shared"
function capitalizeWords(text) {
  return String(text)
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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