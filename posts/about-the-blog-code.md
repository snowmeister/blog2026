---
title: "Why I Built Yet Another Blog Engine (And Why This One Might Stick)"
description: "Why I built yet another blog engine, and why this one might actually stick."
tags:
  - coding
  - frontend
date: 2025-07-03T11:36:07.000Z
slug: about-the-blog-code
---

### A Bit of Background

I've set out on this journey a few times: keeping a blog, sometimes using online platforms like WordPress, sometimes writing code to run a custom blog. Some attempts were more successful than others, but I always seem to run out of steam, or life gets in the way. Let's see how far I get this time!

This time around, I wanted to strip things back to basics. No frameworks, no databases, no "sign up for our cloud service" nonsense. Just a simple, static site that I can host on any server I happen to have lying around. I want to write, hit a button, and have my words show up online. That's it.

### The Requirement

So, what did I actually need? Honestly, not much. I wanted a front-end only, static HTML/vanilla JS/CSS app to publish my ramblings. No backend, no database, nothing fancy at all. Just some text files written in Markdown, compiled into a blog site. I didn't want to be dependent on any particular hosting service or platform. I run a couple of servers, so I just wanted to be able to hang the code on one of them and leave it.

### The Solution

Enter the "Lazy Blog Template." It's about as bare-bones as you can get, but it ticks all my boxes: it's responsive, accessible, and doesn't require a backend or database. It's built using just HTML, JavaScript, and CSS, with a little Node.js tool to compile everything when I write a new article.

#### What Makes It Tick?

- **Simple & File-Based:** There's no database or complex backend setup. All your posts are just Markdown files in a folder.
- **Markdown Support:** I write my posts in `.md` files using standard Markdown syntax. It's quick, familiar, and portable.
- **Responsive & Accessible:** The layout works on desktop and mobile, and there's an accessible off-canvas mobile menu with proper focus management and keyboard navigation.
- **Tag Filtering & Pagination:** The site automatically generates a list of tags to filter posts, and you can navigate with simple "Previous" and "Next" controls.
- **Easy to Customize:** Want to change the look? Just tweak a few CSS variables.

#### How It Works (Nuts & Bolts)

1. **Write Your Posts:** Add your blog posts as `.md` files inside the `/posts` directory. Each post starts with a little YAML front matter for the title and tags.
2. **Build the Index:** After adding or editing posts, run a Node.js script (`node scripts/generate-index.js`). This scans your posts and creates a `posts.json` file that the frontend uses to display everything.
3. **Serve It Up:** Since it's a static site, you can open `index.html` directly, but for best results (and to avoid fetch/CORS weirdness), use a simple local server. I like the Live Server extension in VS Code.
4. **Customize:** Change the site title in `index.html`, and tweak the colors and fonts by editing the CSS variables at the top of `/css/style.css`.

#### Example Post

Here's what a post looks like:

```markdown
---
title: "My First Post"
tags:
  - introduction
  - general
---

This is the content of my first post, written in Markdown.

To include an image, use the following syntax:

![An image description](../images/my-cool-image.png)
```

### Why Bother?

Honestly, there are a million ways to blog these days, but I wanted something I could fully understand, control, and tinker with. No hidden magic, no vendor lock-in, no monthly fees. Just a simple, accessible, and lightweight blog that I can update with a text editor and a single command.

If you're like me, someone who likes to keep things simple, and maybe even enjoys a bit of DIY, feel free to [grab the Lazy Blog Template](https://github.com/snowmeister/lazy-blog) from GitHub and make it your own. It's open source (MIT License), so hack away!

Let's see how long I keep this one going. Thanks for reading, and if you have questions or suggestions, drop me a line!
