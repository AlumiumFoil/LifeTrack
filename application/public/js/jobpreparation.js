'use strict';

// ── Accessibility (matches pattern used across dashboard pages) ────────────────

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

async function loadAccessibilitySettings() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const res = await fetch('/api/users/me/accessibility', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    applyAccessibilitySettings(data.accessibility);
  } catch (err) {
    console.error('Accessibility settings load error:', err);
  }
}

function applyAccessibilitySettings(accessibility) {
  if (!accessibility) return;

  const themeMode  = accessibility.themeMode  || 'dark';
  const textSize   = accessibility.textSize   || 'normal';
  const highContrast =
    accessibility.highContrastEnabled === true  ||
    accessibility.highContrastEnabled === 1     ||
    accessibility.highContrastEnabled === '1';

  const isAccessibilityMode = themeMode === 'light' && textSize === 'large' && highContrast;

  document.body.setAttribute(
    'data-accessibility-mode',
    isAccessibilityMode ? 'accessibility' : 'default',
  );
}

// ── Career Resources ──────────────────────────────────────────────────────────

// Converts a backend-relative URL like "resources/resume.html" to a path that
// works from jobpreparation.html in pages/: "./resources/resume.html".
// Full external URLs (http/https) and already-prefixed paths are left unchanged.
function resolveResourceUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;          // external link
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
  return './' + url;                                   // bare relative path
}

async function loadCareerResources() {
  const container = document.getElementById('careerResources');

  try {
    const res = await fetch('/api/career/resources');

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--muted)">Unable to load career resources.</p>';
      return;
    }

    const data = await res.json();
    // API returns { success, resources: [...] }
    const resources = data.resources || [];

    if (!resources.length) {
      container.innerHTML = '<p style="color:var(--muted)">Career resources are not available right now.</p>';
      return;
    }

    container.innerHTML = resources.map(r => {
      // API field is contentType; fall back to category as secondary label
      const pill = r.contentType || r.category || '';
      const href = resolveResourceUrl(r.url);
      const isExternal = href && /^https?:\/\//i.test(href);
      const viewBtn = href
        ? `<a class="btn secondary sm" href="${href}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>View Resource</a>`
        : '';

      return `
        <div class="card">
          ${pill ? `<div class="goal-card-meta"><span class="badge">${pill}</span></div>` : ''}
          <h2 class="card-title">${r.title || 'Untitled'}</h2>
          <p class="card-desc">${r.description || ''}</p>
          ${viewBtn}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Career resources error:', err);
    container.innerHTML = '<p style="color:var(--muted)">Unable to load career resources.</p>';
  }
}

// ── Career Goals ──────────────────────────────────────────────────────────────

const GOAL_BADGE = {
  'In Progress': 'badge-in-progress',
  'Completed':   'badge-completed',
  'Not Started': 'badge-not-started',
  'Overdue':     'badge-overdue',
};

function goalBadgeClass(status) {
  return GOAL_BADGE[status] || 'badge-not-started';
}

async function loadCareerGoals() {
  const container = document.getElementById('careerGoals');
  const token = getAccessToken();

  if (!token) {
    container.innerHTML = '<p style="color:var(--muted)">Log in to see your career goals here.</p>';
    return;
  }

  try {
    const res = await fetch('/api/career/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      container.innerHTML = '<p style="color:var(--muted)">Your session has expired. Please log in again.</p>';
      return;
    }

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--muted)">Unable to load career goals.</p>';
      return;
    }

    const data = await res.json();
    // API returns { success, goals: [...] }
    const goals = data.goals || [];

    if (!goals.length) {
      container.innerHTML = '<p style="color:var(--muted)">No career goals found. Add some from the Goals page.</p>';
      return;
    }

    container.innerHTML = goals.map(g => {
      const status     = g.status     || '';
      const targetRole = g.targetRole || '';
      const targetDate = g.targetDate ? new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const desc       = g.description || '';

      return `
        <div class="card">
          <div class="goal-card-meta">
            ${status     ? `<span class="badge ${goalBadgeClass(status)}">${status}</span>` : ''}
            ${targetRole ? `<span class="small">${targetRole}</span>` : ''}
          </div>
          <h2 class="card-title">${g.title || 'Untitled Goal'}</h2>
          ${desc       ? `<p class="card-desc">${desc}</p>` : ''}
          ${targetDate ? `<p class="small" style="margin-top:8px">Target: ${targetDate}</p>` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Career goals error:', err);
    container.innerHTML = '<p style="color:var(--muted)">Unable to load career goals.</p>';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccessibilitySettings();
  loadCareerResources();
  loadCareerGoals();
});
