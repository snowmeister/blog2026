# blog.snowmeister.ninja

The source for **Bites, Beaks, Bytes And Rights** — Snowy's blog.

A minimal, file-based static site generator ("lazy-blog"). Posts are
Markdown files in `/posts`. A Node.js build script renders each one
into its own folder under `/dist`. Vercel runs the build on push and
serves the result.

No framework, no database, no backend.

---

## Repository layout

```
posts/              Markdown posts (one .md file per post)
scripts/
  build.js          The build script — reads /posts, writes /dist
  templates/
    post.html       Template for each individual post page
    index.html      Template for the root blog-roll page
css/                Stylesheet (single file: css/style.css)
js/main.js          Client-side nav, tag filter, pagination, mobile menu
images/             Static images. /images/social/ holds OG card images.
vercel.json         Tells Vercel "the output is dist/"
index.html          The root page template source — wait, see note below
package.json        Defines the "build" script (node scripts/build.js)
```

Note: there is **no** `index.html` at the repo root. The build script
reads `scripts/templates/index.html` and writes the rendered root page
to `dist/index.html`. The reference to `index.html` as the entry in
`package.json`'s old `main` field is a leftover from the upstream
template and is not used by the build.

---

## How the build works

Run `npm run build`. The script:

1. Reads every `*.md` file in `posts/`.
2. Parses each post's YAML front matter (`title`, `description`,
   `tags`, `date`, `slug` — see below).
3. Renders each post body with `marked` (Markdown → HTML).
4. Substitutes placeholders in `scripts/templates/post.html`
   (`{{TITLE}}`, `{{DESCRIPTION}}`, `{{SLUG}}`, `{{DATE}}`, `{{TAGS}}`,
   `{{BODY_HTML}}`, `{{BASE_PATH}}`).
5. Writes the result to `dist/<slug>/index.html` (one folder per post,
   with its own `index.html`).
6. Renders the root index template (`scripts/templates/index.html`)
   into `dist/index.html`. The root page is mostly a shell — the nav,
   tag filter, pagination, and the latest-post hero are all populated
   client-side by `js/main.js` from `dist/posts.json`.
7. Copies `css/`, `js/`, and `images/` into `dist/`.
8. Writes `dist/posts.json` — an array of post metadata
   (title/description/tags/slug/date/file), no body content. This is
   what `js/main.js` fetches at runtime to render the nav, tag filter,
   pagination, and the latest-post hero.

The build is **idempotent**. Running it twice produces the same output.

`dist/` is gitignored. You never commit it.

---

## Deployment

`vercel.json` is one line:

```json
{ "outputDirectory": "dist" }
```

Vercel detects the Node project, runs `npm run build` on push, and
serves the resulting `dist/` directory. Push to `main` deploys.

To override the URL root (e.g. for a GitHub Pages project-page deploy),
set `BASE_PATH` at build time. For a Vercel URL-root deploy, leave it
unset.

---

## Authoring a post

1. Create a new `.md` file in `posts/`. Filename is irrelevant for
   the URL — the slug comes from front matter, or is derived from the
   title (lowercased, first 5 words, non-alphanumerics → `-`).

2. Start the file with YAML front matter. Supported fields:

   | Field         | Required | Notes                                                                 |
   |---------------|----------|-----------------------------------------------------------------------|
   | `title`       | yes      | Used in the page `<title>`, OG tags, nav, and as the slug source.     |
   | `tags`        | yes      | Array. Used by the tag filter. Missing/invalid → empty list + warn.   |
   | `description` | no       | Shown on the homepage hero / post cards. Falls back to empty string. |
   | `image`       | no       | OG/Twitter card image. Currently unused by the template — wire in.   |
   | `date`        | no       | ISO date string. Invalid → falls back to file mtime (with a warn).   |
   | `slug`        | no       | Override the derived slug. Otherwise: first 5 words of the title.     |

   Example:

   ```markdown
   ---
   title: "My New Post"
   description: "What it's about, in one line."
   tags:
     - coding
     - ai
   date: 2026-09-04T15:00:00.000Z
   slug: my-new-post
   ---

   Body in Markdown. Standard `marked` syntax — headings, lists, code
   fences, images, etc.

   ![Alt text](../images/social/my-new-post.webp)
   ```

3. (Optional) Preview locally:

   ```bash
   npm install
   npm run build
   npx serve dist
   ```

   Any static server works. `serve` is included as a dev convenience.

4. Commit and push to `main`. Vercel rebuilds and deploys.

---

## Front matter gotchas

These are bugs in the current code, not features. Watch out:

- **`image` field is read but never used.** The `post.html` template
  has no `{{IMAGE}}` placeholder, and the build script does not
  generate an `<meta property="og:image">` tag from it. If you want
  social card previews per post, the template and `renderPost()` need
  a small addition.
- **`image` is also missing from `posts.json`.** Only
  `title`/`description`/`tags`/`file`/`slug`/`date` are written, so
  client-side rendering has no card image to work with either.
- **No `BASE_PATH` → root URLs are relative (`./`).** Fine for Vercel
  URL-root deploys; set `BASE_PATH` explicitly if you ever move the
  site off-root.

---

## Customising

- **Site title / header** — edit the `<h1>` in both
  `scripts/templates/index.html` and `scripts/templates/post.html`.
- **Colours / fonts** — CSS variables at the top of `css/style.css`.
- **Nav, pagination, mobile menu** — `js/main.js`. The mobile menu has
  proper focus trapping and ARIA handling.
- **Adding a field to front matter** — edit `parsePost()` in
  `scripts/build.js` to read it, `renderPost()` to substitute it, and
  add the `{{PLACEHOLDER}}` to `scripts/templates/post.html`. Mirror
  the same field into `posts.json` if you want it client-side.

After any template, CSS, or JS change, rebuild before pushing.

---

## Local contracts

- This subtree is a static blog with `index.html`, `posts.json`, and
  asset/content folders. Post pages and static assets are served
  directly from this directory tree.
- Keep URL paths and folder names stable unless explicitly requested.
- Update blog index and related content references together when
  adding or changing posts.

See `AGENTS.md` for the work contract.

---

## License

This site is personal. The underlying `lazy-blog` template is MIT.
