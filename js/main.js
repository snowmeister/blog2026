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

    const displayPosts = (posts) => {
        // Links now point to the static directories, relative to the homepage.
        const postLinks = posts.map(post => `<li><a href="./${post.slug}/">${post.title}</a></li>`).join('');
        postListUl.innerHTML = postLinks;
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
        // This script only runs on the homepage (index.html).
        // It's responsible for fetching post data for client-side filtering.
        // The initial render of the post list is now done by the server.

        // Check if we are on the homepage by looking for the post list element.
        if (!postListUl) {
            // We are likely on a static post page, so do nothing.
            return;
        }

        try {
            // Fetch the JSON using a relative path for robustness.
            const response = await fetch('./posts.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            allPosts = await response.json();
            filteredPosts = [...allPosts]; // Set initial state for filtering

            renderTagFilters();
            renderPaginationControls(); // Render pagination for the full list

            // The initial post list is now rendered by the server, so no need to render it here.
            // When a user clicks a filter, filterAndRender() will be called to update the list.

        } catch (error) {
            console.error('Error initializing app:', error);
            if (postContent) {
                postContent.innerHTML = '<p>Could not load blog posts. Please try again later.</p>';
            }
        }
    };

    // Only run the initialization logic on the homepage.
    // The menu functionality will work on all pages regardless.
    if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '') {
        init();
    }
});
