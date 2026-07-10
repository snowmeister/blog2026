// Build script for lazy-blog.
// Reads markdown posts from /posts, generates the static site into /dist.
//
// Usage:
//   node scripts/build.js
//
// Environment variables:
//   BASE_PATH  Path prefix for asset and link URLs. Used for subpath
//              deployments (e.g. GitHub Pages project pages). When
//              unset, the build produces output for a URL-root
//              deployment: './' for the root, '../' for per-post
//              pages. For a project-page deploy, set to
//              './<repo-name>/' (e.g. './lazy-blog/').
//
// Idempotent: running multiple times produces the same output.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const DIST_DIR = path.join(ROOT, 'dist');
const POST_TEMPLATE_PATH = path.join(__dirname, 'templates', 'post.html');
const INDEX_TEMPLATE_PATH = path.join(__dirname, 'templates', 'index.html');

// Number of words from the post title to use when deriving a slug.
// Override per-post with `slug:` in the markdown front matter.
const SLUG_WORD_COUNT = 5;

// Resolve the base path for asset and link URLs. The build uses
// different prefixes for the root page and per-post pages:
//   - Root page: BASE_PATH or './'
//   - Per-post pages: '../' + (BASE_PATH with any leading './' or '/' stripped)
//
// Examples:
//   No env var         → root './', per-post '../'  (URL-root deploy)
//   BASE_PATH='./foo/' → root './foo/', per-post '../foo/'
//   BASE_PATH='/foo/'  → root '/foo/', per-post '../foo/'
const BASE_PATH = process.env.BASE_PATH || './';
const ROOT_BASE_PATH = BASE_PATH;
const POST_BASE_PATH = '../' + BASE_PATH.replace(/^(\.\/|\/)/, '');

const matter = require('@11ty/gray-matter');
const { marked } = require('marked');

/**
 * Derive a URL-safe slug from a title.
 * Lowercase, take the first N words, replace non-alphanumerics with '-'.
 * Example: "The Problem With Modern Politics" -> "the-problem-with-modern"
 */
const deriveSlug = (title) => {
    return title
        .toLowerCase()
        .split(/\s+/)
        .slice(0, SLUG_WORD_COUNT)
        .join(' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Format an ISO date string as a human-readable date, e.g. "July 7, 2025".
 */
const formatDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Strip HTML comments from a template after substitution. Comments are
 * useful for the developer editing the template but should not appear in
 * the rendered output sent to readers.
 */
const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

/**
 * Escape a string for safe interpolation into HTML.
 *
 * lazy-blog trusts the author of the .md files (you wrote them), so
 * escaping is defence-in-depth, not the primary security control. It
 * prevents a stray `<` or `&` in a title or tag from breaking the
 * rendered output.
 */
const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Render a post's front matter and body into a per-post index.html.
 * Reads the template from disk, substitutes placeholders, writes the result.
 */
const renderPost = (template, post, bodyHtml, basePath) => {
    const tagsHtml = (post.tags || [])
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join('');

    // Substitute placeholders using the function form to avoid `$` in
    // values being interpreted as backreferences (e.g. a title with
    // "$5" or "$&" in it would otherwise corrupt the output).
    return template
        .replace(/\{\{BASE_PATH\}\}/g, () => basePath)
        .replace(/\{\{TITLE\}\}/g, () => escapeHtml(post.title))
        .replace(/\{\{DESCRIPTION\}\}/g, () => escapeHtml(post.description || ''))
        .replace(/\{\{SLUG\}\}/g, () => escapeHtml(post.slug))
        .replace(/\{\{DATE\}\}/g, () => escapeHtml(formatDate(post.date)))
        .replace(/\{\{TAGS\}\}/g, () => tagsHtml)
        .replace(/\{\{BODY_HTML\}\}/g, () => bodyHtml);
};

/**
 * Render the root blog-roll index.html. The article body and post list
 * are populated client-side by js/main.js from dist/posts.json; this
 * template just provides the noscript fallback and the page shell.
 */
const renderIndex = (template, posts, basePath) => {
    const noscriptItems = posts
        .map((p) => `<li><a href="${basePath}${escapeHtml(p.slug)}/">${escapeHtml(p.title)}</a></li>`)
        .join('\n');

    return template
        .replace(/\{\{BASE_PATH\}\}/g, () => basePath)
        .replace(/\{\{NOSCRIPT_POSTS_LIST\}\}/g, () => noscriptItems);
};

/**
 * Parse a single .md file into a post object. Returns the data needed
 * to render the per-post HTML and to write the posts.json entry. Does
 * not perform any file I/O beyond reading the file content.
 *
 * Validates the front matter and warns on the console for problems.
 * Falls back to safe defaults (e.g. "Untitled Post", file mtime) so
 * the build never crashes on a single bad post.
 */
const parsePost = (file, fileContent, stats) => {
    const { data } = matter(fileContent);
    const warn = (msg) => console.warn(`  warn: ${file}: ${msg}`);

    if (!data.title) {
        warn('missing "title" in front matter; using "Untitled Post"');
    }
    if (data.tags !== undefined && !Array.isArray(data.tags)) {
        warn('"tags" should be an array, got ' + typeof data.tags + '; using empty list');
    }
    if (data.date !== undefined) {
        const d = new Date(data.date);
        if (isNaN(d)) {
            warn(`"date" is not a valid date ("${data.date}"); using file mtime`);
        }
    }

    return {
        title: data.title || 'Untitled Post',
        description: data.description || '',
        image: data.image || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        file,
        slug: data.slug || deriveSlug(data.title || 'untitled'),
        date: data.date && !isNaN(new Date(data.date)) ? data.date : stats.mtime.toISOString(),
    };
};

// Read every .md file in posts/, parse it, render the per-post HTML,
// and write each to dist/<slug>/index.html. Returns the parsed posts.
const buildPosts = (postTemplate) => {
    const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
    return files.map((file) => {
        const filePath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        const { content } = matter(fileContent);

        const post = parsePost(file, fileContent, stats);

        const bodyHtml = marked.parse(content);
        const html = stripHtmlComments(renderPost(postTemplate, post, bodyHtml, POST_BASE_PATH));
        const postDir = path.join(DIST_DIR, post.slug);
        fs.mkdirSync(postDir, { recursive: true });
        fs.writeFileSync(path.join(postDir, 'index.html'), html);

        console.log(`  ${file} -> dist/${post.slug}/index.html`);
        return post;
    });
};

// Render the root blog-roll index.html and write it to dist/index.html.
const writeIndex = (posts) => {
    const indexTemplate = fs.readFileSync(INDEX_TEMPLATE_PATH, 'utf8');
    const indexHtml = stripHtmlComments(renderIndex(indexTemplate, posts, ROOT_BASE_PATH));
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
};

// Copy the static asset directories (css, js, images) into dist/ so the
// generated pages can reference them via absolute paths like /css/style.css.
const copyStaticAssets = () => {
    for (const name of ['css', 'js', 'images']) {
        const src = path.join(ROOT, name);
        const dest = path.join(DIST_DIR, name);
        if (!fs.existsSync(src)) continue;
        fs.cpSync(src, dest, { recursive: true });
    }
};

const main = () => {
    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`No posts directory at ${POSTS_DIR}`);
        process.exit(1);
    }

    fs.mkdirSync(DIST_DIR, { recursive: true });

    const postTemplate = fs.readFileSync(POST_TEMPLATE_PATH, 'utf8');

    console.log('Building posts...');
    const posts = buildPosts(postTemplate);
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log('Building index...');
    writeIndex(posts);
    copyStaticAssets();

    const out = path.join(DIST_DIR, 'posts.json');
    fs.writeFileSync(out, JSON.stringify(posts, null, 2) + '\n');
    console.log(`Done. Wrote ${posts.length} posts to ${path.relative(ROOT, out)}`);
};

main();
