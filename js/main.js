document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const postListUl = document.getElementById('posts-list-ul');
    const postContent = document.getElementById('post-content'); // The article area on the root page.
    const tagFilterContainer = document.getElementById('tag-filter');
    const tagFilterWrapper = document.getElementById('tag-filter-container');
    const paginationContainer = document.getElementById('pagination-container');
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const postsListNav = document.getElementById('posts-list');

    // --- Mobile Menu Logic ---
    const openMenu = () => {
        postsListNav.classList.add('is-visible');
        postsListNav.setAttribute('aria-hidden', 'false');
        menuClose.focus();
        document.addEventListener('keydown', trapFocus);
    };

    const closeMenu = () => {
        postsListNav.classList.remove('is-visible');
        postsListNav.setAttribute('aria-hidden', 'true');
        menuToggle.focus();
        document.removeEventListener('keydown', trapFocus);
    };

    if (menuToggle && postsListNav) {
        menuToggle.addEventListener('click', openMenu);
    }

    if (menuClose && postsListNav) {
        menuClose.addEventListener('click', closeMenu);
    }

    // --- Focus Trap Logic ---
    const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        const focusableElements = postsListNav.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };

    // Close menu when a post link is clicked (useful on mobile).
    if (postListUl && postsListNav) {
        postListUl.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                closeMenu();
            }
        });
    }

    // --- State ---
    let allPosts = [];
    let filteredPosts = [];
    let currentPage = 1;
    const postsPerPage = 5;

    // --- Functions ---

    // The post list links need a path that's correct from both the root
    // (./<slug>/) and from a per-post page (../<slug>/). Detect from the URL.
    const getPostsBasePath = () => {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('/index.html') || path === '') {
            return './';
        }
        return '../';
    };

    const getCurrentSlug = () => {
        const path = window.location.pathname;
        const match = path.match(/\/([^/]+)\/?$/);
        if (!match) return null;
        const slug = match[1];
        if (slug === '' || slug === 'index.html') return null;
        return slug;
    };

    const displayPosts = (posts) => {
        const base = getPostsBasePath();
        const currentSlug = getCurrentSlug();
        const isRoot = currentSlug === null;
        // On the root page, the "active" item is the first (newest) post in
        // the sorted list, since no specific post is loaded.
        const activeSlug = currentSlug || (isRoot && posts.length > 0 ? posts[0].slug : null);
        const postLinks = posts.map(post => {
            const isActive = activeSlug && post.slug === activeSlug;
            const cls = isActive ? 'active' : '';
            return `<li><a href="${base}${escapeHtml(post.slug)}/" class="${cls}">${escapeHtml(post.title)}</a></li>`;
        }).join('');
        postListUl.innerHTML = postLinks;
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Escape a string for safe interpolation into HTML. lazy-blog trusts
    // the author of posts.json (it's a build artefact, not user input),
    // so this is defence-in-depth: a stray `<` or `&` in a post title
    // or tag should not break the rendered output.
    const escapeHtml = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Inline "Read more" link, used at the end of the excerpt paragraph
    // on the root page (hero and cards).
    const renderReadMore = (base, slug) =>
        `<a href="${base}${escapeHtml(slug)}/" class="read-more">Read more &rarr;</a>`;

    const renderLatestPost = (post, olderPosts = []) => {
        if (!postContent) return;
        const base = getPostsBasePath();
        const dateStr = formatDate(post.date);
        const tagsHtml = (post.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        const descText = post.description || '';
        let olderHtml = '';
        if (olderPosts.length > 0) {
            const cards = olderPosts.map(p => {
                const d = formatDate(p.date);
                const t = (p.tags || []).slice(0, 3).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join('');
                const cardDesc = p.description || '';
                return `
                    <article class="post-card">
                        <p class="post-meta">${d}</p>
                        <h3><a href="${base}${escapeHtml(p.slug)}/">${escapeHtml(p.title)}</a></h3>
                        ${t ? `<div class="tags-container">${t}</div>` : ''}
                        <p class="post-excerpt">${escapeHtml(cardDesc)} ${renderReadMore(base, p.slug)}</p>
                    </article>
                `;
            }).join('');
            olderHtml = `
                <section class="older-posts">
                    <div class="post-card-grid">${cards}</div>
                </section>
            `;
        }
        postContent.innerHTML = `
            <div class="post-header">
                <p class="post-meta">${dateStr}</p>
                <h1>${escapeHtml(post.title)}</h1>
            </div>
            ${tagsHtml ? `<div class="tags-container">${tagsHtml}</div>` : ''}
            <p class="post-excerpt">${escapeHtml(descText)} ${renderReadMore(base, post.slug)}</p>
            ${olderHtml}
        `;
    };

    const renderPaginationControls = () => {
        if (!paginationContainer) return;
        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        // Hide the container entirely when there's only one page. A reader
        // with JavaScript disabled still sees the empty <div> in the HTML,
        // but it's invisible and has no styling that would reserve space.
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        paginationContainer.innerHTML = '';

        const createButton = (text, onClick, disabled) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.disabled = disabled;
            button.addEventListener('click', onClick);
            return button;
        };

        const prevButton = createButton('Previous', () => { currentPage--; renderPostsForPage(); }, currentPage === 1);
        const nextButton = createButton('Next', () => { currentPage++; renderPostsForPage(); }, currentPage === totalPages);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.className = 'page-info';

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextButton);
    };

    const renderPostsForPage = () => {
        const start = (currentPage - 1) * postsPerPage;
        const end = start + postsPerPage;
        const postsToShow = filteredPosts.slice(start, end);

        if (postsToShow.length === 0 && currentPage === 1) {
            postListUl.innerHTML = '<li>No posts found.</li>';
        } else {
            displayPosts(postsToShow);
        }
        renderPaginationControls();
    };

    const filterAndRender = (activeTag = null) => {
        filteredPosts = activeTag
            ? allPosts.filter(post => post.tags.includes(activeTag))
            : [...allPosts];
        currentPage = 1;
        renderPostsForPage();
    };

    const renderTagFilters = () => {
        if (!tagFilterWrapper) return;
        const allTags = [...new Set(allPosts.flatMap(post => post.tags))];
        // Clear the wrapper, then add the heading and the filter buttons.
        // The heading is created here (not in the HTML template) so a
        // reader with JavaScript disabled doesn't see "Filter by Tag"
        // followed by no controls.
        tagFilterWrapper.innerHTML = '';
        const heading = document.createElement('h4');
        heading.textContent = 'Filter by Tag';
        tagFilterWrapper.appendChild(heading);

        tagFilterContainer.innerHTML = '';

        const createButton = (text, tag, isActive = false) => {
            const button = document.createElement('button');
            button.classList.add('tag-button');
            button.textContent = text;
            if (isActive) button.classList.add('active');

            button.addEventListener('click', () => {
                document.querySelectorAll('#tag-filter button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterAndRender(tag); // Just filter the list, no routing.
            });
            return button;
        };

        tagFilterContainer.appendChild(createButton('All Posts', null, true));
        allTags.forEach(tag => tagFilterContainer.appendChild(createButton(tag, tag)));
    };

    // --- Main Initialization ---
    const init = async () => {
        // Run on every page that has a post list element. The empty nav
        // containers in the HTML are filled in from posts.json.

        if (!postListUl) {
            return;
        }

        try {
            // Fetch the JSON using a path-relative URL so this works from any depth.
            const response = await fetch(`${getPostsBasePath()}posts.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            allPosts = await response.json();
            // Sort newest-first by date, regardless of JSON array order.
            allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            filteredPosts = [...allPosts];

            // Render the post list, tag filters, and pagination from JSON.
            renderTagFilters();
            displayPosts(filteredPosts);
            renderPaginationControls();

            // On the root page, render the latest post into the article area,
            // followed by a compact list of older posts. Per-post pages have
            // their own article body pre-rendered at build time and the JS
            // leaves it alone.
            if (getCurrentSlug() === null && allPosts.length > 0) {
                const olderPostsLimit = 6;
                renderLatestPost(allPosts[0], allPosts.slice(1, 1 + olderPostsLimit));
            }

        } catch (error) {
            console.error('Error initializing app:', error);
            if (postContent) {
                postContent.innerHTML = '<p>Could not load blog posts. Please try again later.</p>';
            }
        }
    };

    // Run on every page that has the nav. The menu/mobile logic still works
    // on every page regardless.
    if (postListUl) {
        init();
    }
});
