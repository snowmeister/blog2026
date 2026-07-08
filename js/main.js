document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const postListUl = document.getElementById('posts-list-ul');
    const postContent = document.getElementById('post-content'); // This is the article on the main page
    const tagFilterContainer = document.getElementById('tag-filter');
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

    // Close menu when a post link is clicked (useful on mobile)
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

    // The post list links need a relative path that works from both the root
    // and from per-post pages (one level deep). Posts live at /<slug>/, so a
    // path starting with the slug works on any page when the JSON is fetched
    // with a path-relative URL (see the fetch below). We use './' for root
    // pages and '../' for nested pages.
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
            return `<li><a href="${base}${post.slug}/" class="${cls}">${post.title}</a></li>`;
        }).join('');
        postListUl.innerHTML = postLinks;
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const renderLatestPost = (post, olderPosts = []) => {
        if (!postContent) return;
        const base = getPostsBasePath();
        const dateStr = formatDate(post.date);
        const tagsHtml = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
        const descHtml = post.description ? `<p class="post-excerpt">${post.description}</p>` : '';
        let olderHtml = '';
        if (olderPosts.length > 0) {
            const cards = olderPosts.map(p => {
                const d = formatDate(p.date);
                const t = (p.tags || []).slice(0, 3).map(x => `<span class="tag">${x}</span>`).join('');
                const desc = p.description ? `<p class="post-excerpt">${p.description}</p>` : '';
                return `
                    <article class="post-card">
                        <p class="post-meta">${d}</p>
                        <h3><a href="${base}${p.slug}/">${p.title}</a></h3>
                        ${desc}
                        ${t ? `<div class="tags-container">${t}</div>` : ''}
                        <div class="read-more-row"><a href="${base}${p.slug}/" class="read-more">Read more &rarr;</a></div>
                    </article>
                `;
            }).join('');
            olderHtml = `
                <section class="older-posts">
                    <h2>More posts</h2>
                    <div class="post-card-grid">${cards}</div>
                </section>
            `;
        }
        postContent.innerHTML = `
            <div class="post-header">
                <p class="post-meta">${dateStr}</p>
                <h1>${post.title}</h1>
            </div>
            ${tagsHtml ? `<div class="tags-container">${tagsHtml}</div>` : ''}
            ${descHtml}
            <div class="read-more-row"><a href="${base}${post.slug}/" class="read-more">Read more &rarr;</a></div>
            ${olderHtml}
        `;
    };

    const renderPaginationControls = () => {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        if (totalPages <= 1) return;

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
        const allTags = [...new Set(allPosts.flatMap(post => post.tags))];
        tagFilterContainer.innerHTML = '';

        const createButton = (text, tag, isActive = false) => {
            const button = document.createElement('button');
            button.classList.add('tag-button');
            button.textContent = text;
            if (isActive) button.classList.add('active');
            
            button.addEventListener('click', () => {
                document.querySelectorAll('#tag-filter button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterAndRender(tag); // Just filter the list, no routing
            });
            return button;
        };

        tagFilterContainer.appendChild(createButton('All Posts', null, true));
        allTags.forEach(tag => tagFilterContainer.appendChild(createButton(tag, tag)));
    };

    // --- Main Initialization ---
    const init = async () => {
        // Run on every page that has a post list element. The hand-baked HTML
        // nav is replaced with one driven by posts.json, sorted newest-first.

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
            // their own hand-baked article content and are left untouched.
            if (getCurrentSlug() === null && allPosts.length > 0) {
                const olderPostsLimit = 5;
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
