document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.endsWith("results.html")) {
    loadSearchResults();
  }
});

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

async function loadSearchResults() {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();

  const resultsSummary = document.getElementById("resultsSummary");
  const activeFilters = document.getElementById("activeFilters");
  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  const emptyState = document.getElementById("emptyState");
  const resultsGrid = document.getElementById("resultsGrid");

  const filterParts = [];
  if (q) filterParts.push(`Keyword: "${q}"`);
  if (category) filterParts.push(`Category: ${capitalizeWords(category)}`);

  activeFilters.textContent =
    filterParts.length > 0
      ? filterParts.join(" • ")
      : "Showing all available resources";

  try {
    const apiParams = new URLSearchParams();
    if (q) apiParams.append("q", q);
    if (category) apiParams.append("category", category);

    const headers = {};
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`/api/resources/search?${apiParams.toString()}`, {
      method: "GET",
      headers
    });

    const data = await response.json();
    loadingState.style.display = "none";

    if (!response.ok || !data.success) {
      const joinedErrors = Array.isArray(data.errors) ? data.errors.join(" ") : null;
      throw new Error(joinedErrors || data.error || "Search request failed.");
    }

    const results = Array.isArray(data.results) ? data.results : [];
    const total = typeof data.total === "number" ? data.total : results.length;
    const isAuthenticated = Boolean(data.isAuthenticated);

    if (results.length === 0) {
      resultsSummary.textContent =
        "Search completed, but no matching resources were found.";
      emptyState.style.display = "block";
      return;
    }

    resultsSummary.textContent = isAuthenticated
      ? `Displaying ${total} result${total === 1 ? "" : "s"} from public and personal resources.`
      : `Displaying ${total} public result${total === 1 ? "" : "s"}.`;

    resultsGrid.innerHTML = results.map(buildResultCard).join("");
    resultsGrid.style.display = "grid";
  } catch (error) {
    loadingState.style.display = "none";
    errorState.style.display = "block";
    errorMessage.textContent =
      error.message || "Something went wrong while loading results.";
  }
}

function buildResultCard(item) {
  const title = escapeHtml(item.title || "Untitled Resource");
  const description = escapeHtml(item.description || "No description available.");
  const category = escapeHtml(item.category || "Uncategorized");
  const source = escapeHtml(item.source || "resource");
  const contentType = escapeHtml(item.content_type || "Unknown Type");
  const imageUrl = item.image_url || "https://placehold.co/600x340?text=No+Image";
  const url = item.url || "#";
  const itemId = item.id ?? "N/A";
  const safeImageUrl = escapeAttribute(imageUrl);
  const safeUrl = escapeAttribute(url);
  const canOpenExternal = url && url !== "#";

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
          <span class="pill">ID: ${itemId}</span>
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

function capitalizeWords(text) {
  return String(text)
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}