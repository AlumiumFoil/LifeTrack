//waits till page has finished loading before running JS
//Stops errors if JS accesses elements before they exist in DOM
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  //runs search/results if we are on the test_results page.
  //keeps JS shared & only activate API on page that needs it
  if (path.endsWith("test_results.html")) {
    loadSearchResults();
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
