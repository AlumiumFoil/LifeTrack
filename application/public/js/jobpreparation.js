// js/jobpreparation.js
// Career page frontend logic
// Fetches career resources (public) and career goals (authenticated)
// Renders results into the page and handles empty/error states cleanly

document.addEventListener('DOMContentLoaded', () => {
    loadCareerResources();
    loadCareerGoals();
});

// Read JWT from localStorage (set at login, same pattern as dashboard.js)
function getAccessToken() {
    return localStorage.getItem('accessToken');
}

// ── Styled empty/error state helper ──────────────────────────────────────────
// Produces a consistent card-style message block for empty and error states.
// `sub` may contain safe inline HTML (links etc.) written in this file only.
function styledState(heading, sub) {
    return `
        <div style="padding:1.25rem;background:var(--surface,#1e1e2e);border-radius:8px;border:1px solid var(--border,#2d2d3f);">
            <p style="margin:0 0 0.35rem;font-weight:600;font-size:0.95rem;">${heading}</p>
            <p style="margin:0;font-size:0.875rem;color:var(--muted,#9ca3af);">${sub}</p>
        </div>
    `;
}

// ── Career Resources (public, no auth needed) ─────────────────────────────────

async function loadCareerResources() {
    const grid    = document.getElementById('career-resources-grid');
    const status  = document.getElementById('career-resources-status');

    try {
        const response = await fetch('/api/career/resources');
        const data     = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Could not load career resources.');
        }

        const resources = Array.isArray(data.resources) ? data.resources : [];

        if (resources.length === 0) {
            status.innerHTML = styledState(
                'Career resources are not available right now.',
                'You can still use the starter resources below.'
            );
            status.style.display = 'block';
            return;
        }

        grid.innerHTML = resources.map(buildResourceCard).join('');
        grid.style.display = 'grid';

    } catch (error) {
        status.innerHTML = styledState(
            'Career resources are not available right now.',
            'You can still use the starter resources below.'
        );
        status.style.display = 'block';
        console.error('Career resources fetch error:', error);
    }
}

// Build one career resource card
function buildResourceCard(item) {
    const title       = escapeHtml(item.title       || 'Untitled Resource');
    const description = escapeHtml(item.description || 'No description available.');
    const contentType = escapeHtml(item.content_type || '');
    const url         = item.url && item.url !== '#' ? item.url : null;
    const safeUrl     = url ? escapeAttr(url) : '#';

    return `
        <div class="card">
            <div class="card-body">
                ${contentType ? `<span class="pill" style="margin-bottom:0.5rem;display:inline-block;">${capitalizeWords(contentType)}</span>` : ''}
                <h3 style="margin:0 0 0.4rem;">${title}</h3>
                <p style="margin:0 0 1rem;font-size:0.875rem;">${description}</p>
                ${url
                    ? `<a class="btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">View Resource</a>`
                    : `<button class="btn secondary" type="button" disabled>No Link</button>`
                }
            </div>
        </div>
    `;
}

// ── Career Goals (requires authentication) ────────────────────────────────────

async function loadCareerGoals() {
    const list    = document.getElementById('career-goals-list');
    const status  = document.getElementById('career-goals-status');
    const token   = getAccessToken();

    // If not logged in, show a prompt instead of hitting the protected endpoint
    if (!token) {
        status.innerHTML = styledState(
            'Log in to see your career goals.',
            'Once you\'re logged in, goals tagged as "Career" will appear here.'
        );
        status.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/career/goals', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        // 401 just means the session expired; guide the user gracefully
        if (response.status === 401) {
            status.innerHTML = styledState(
                'Your session has expired.',
                '<a href="./auth.html" style="color:inherit;text-decoration:underline;">Log in again</a> to view your career goals.'
            );
            status.style.display = 'block';
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Could not load career goals.');
        }

        const goals = Array.isArray(data.goals) ? data.goals : [];

        if (goals.length === 0) {
            status.innerHTML = styledState(
                'No career goals yet.',
                'Head to the <a href="./goals.html" style="color:inherit;text-decoration:underline;">Goals page</a> and tag a goal as "Career" to see it here.'
            );
            status.style.display = 'block';
            return;
        }

        list.innerHTML = goals.map(buildGoalRow).join('');
        list.style.display = 'block';

    } catch (error) {
        status.innerHTML = styledState(
            'Could not load career goals.',
            'Something went wrong. Try refreshing the page.'
        );
        status.style.display = 'block';
        console.error('Career goals fetch error:', error);
    }
}

// Build one career goal row
function buildGoalRow(goal) {
    const title  = escapeHtml(goal.title  || 'Untitled Goal');
    const desc   = escapeHtml(goal.description || '');
    const status = escapeHtml(goal.status || 'Unknown');
    const date   = goal.target_date ? escapeHtml(formatDate(goal.target_date)) : null;

    const badgeMap = {
        'In Progress': 'badge-in-progress',
        'Completed':   'badge-completed',
        'Not Started': 'badge-not-started',
        'Overdue':     'badge-overdue'
    };
    const badgeClass = badgeMap[goal.status] || 'badge-not-started';

    return `
        <div class="card" style="margin-bottom:0.75rem;">
            <div class="card-body" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
                <div>
                    <strong style="font-size:0.95rem;">${title}</strong>
                    ${desc ? `<p style="margin:0.2rem 0 0;font-size:0.85rem;color:var(--muted,#9ca3af);">${desc}</p>` : ''}
                    ${date ? `<p style="margin:0.2rem 0 0;font-size:0.8rem;color:var(--muted,#9ca3af);">Target: ${date}</p>` : ''}
                </div>
                <span class="badge ${badgeClass}" style="white-space:nowrap;">${status}</span>
            </div>
        </div>
    `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    try {
        const [y, m, d] = String(iso).slice(0, 10).split('-');
        return `${months[+m - 1]} ${+d}, ${y}`;
    } catch {
        return String(iso);
    }
}

function capitalizeWords(text) {
    return String(text)
        .split('_').join(' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return String(value).replace(/"/g, '&quot;');
}
