---
name: add-project-page
description: Add, update, or remove a project page on the michaelmiller.page Jekyll portfolio (the quick-portfolio repo) — creating the markdown page, prepping screenshots, registering the link in index.md, and checking it before push. Use this whenever the user wants to put a project, query, dashboard, notebook, or writeup on their site or portfolio, or mentions adding something to michaelmiller.page, even if they don't say "Jekyll" or "page" — e.g. "I want to write up the Fabric KPI work", "add my new BigQuery query to the site", "put this notebook on my portfolio".
---

# Add a project page to the portfolio

The site publishes one markdown file per project, listed from `index.md`. That sounds
trivial, and writing the file is. What makes this worth a skill is everything around it:
the page has to carry front matter that older pages don't have, screenshots arrive at
6× the size they display, links have to be registered in the right section, and there is
**no local build** — a mistake isn't visible until it's live. Work through the steps
below in order and none of that bites.

Read `CLAUDE.md` at the repo root first if it isn't already in context. It has the
deploy model and conventions this skill assumes.

## Step 1 — Find out what you're writing about

You need these before writing anything. Ask for whatever's missing rather than
inventing it; a portfolio page with invented technical detail is worse than no page.

- **Title** — how it should read in the index and in a search result
- **What it does and why it existed** — the problem, the context (client work, personal
  tooling, coursework), and the tools involved by name
- **Where the code lives** — repo URL, notebook link, or "no public code"
- **Which section of `index.md`** it belongs under (see Step 4)
- **Screenshots**, if any — full paths to the original files

If the user points at existing code (a repo, a `.sql` file, a notebook), read it before
writing. The two existing pages, `excel_to_gs.md` and `order_location_sql.md`, walk
through the actual code in numbered steps — that specificity is the thing that makes
them worth reading, and it only comes from having read the source.

## Step 2 — Write the page

Copy `assets/project-page-template.md` to the repo root as `snake_case.md` — lowercase,
underscores, no dashes, no `.md` in any link that points at it later.

Match the voice of the existing pages: first person, plain, a little informal, honest
about limitations ("I am thinking of better ways to make them more usable"). Don't
inflate it into marketing copy.

**The front matter is the part that's easy to skip and shouldn't be.** Older pages have
none, which is why every page on the site currently emits the same site-wide bio as its
meta description and no share image at all. Setting `title`, `description`, and `image`
fixes that for this page:

```yaml
---
layout: default
title: Order Location SQL
description: A BigQuery SQL query that maps BigCommerce order shipping addresses to normalized state names, excluding fully refunded orders.
image: /images/order_location_result.jpg
---
```

- `layout: default` — once front matter exists, don't rely on the default-layout plugin
- `description` — under ~155 characters; this is the Google snippet and LinkedIn text
- `image` — leading slash, and it must be a real file (Step 3). Omit the key entirely if
  there's no screenshot rather than pointing it at something that doesn't exist

Then, because front matter now sets the title, the first heading in the body is free to
repeat the title as an `<h2>` the way the existing pages do.

## Step 3 — Prep screenshots

Screenshots come off a dashboard at 3000px and 700 KB and display in a ~460px column.
Shipping them raw is the single most common way this site gets slower, and hard-coding
`height`/`width` on the `<img>` (as the current index does) squashes the aspect ratio
and overflows on phones.

Run the bundled script on each image. It resizes to 920px (2× the display column, so it
stays sharp on retina screens), re-encodes, reports the savings, and prints the exact
markup to paste:

```powershell
.\.claude\skills\add-project-page\scripts\prep-image.ps1 -Path "C:\path\to\raw.png" -OutPath "C:\Users\mike_\Documents\GitHub\quick-portfolio\images\project_name.jpg" -Alt "What the image shows"
```

- Name the output after the project, `snake_case`, so it's obvious later what it belongs to
- Use `.jpg` for dashboards and photos, `.png` for charts with flat color or text that
  needs to stay crisp
- If it reports over 200 KB, rerun with `-Quality 70`
- **Open the image and look at it before writing alt text.** Filenames lie, or at least
  under-describe: a file called `faa_wildlife_strike.png` turned out to be four panels —
  a US map, a phase-of-flight breakdown, a distance-from-airport scatter, and yearly
  trends — none of which you'd guess from the name. Describe **what the image shows**
  ("Ticket volume by technician, Jan–Jun"), not that it's an image; screen readers and
  search both read it

If you're **replacing** an existing image rather than adding one, the old file usually
needs to go too — check nothing else references it (`grep -r "old-filename" .`), then
`git rm` it in the same commit. Leaving the original behind means the repo keeps paying
for the bytes you just saved.

## Step 4 — Register it in index.md

A page nobody links to is invisible; Jekyll will happily build an orphan. Add the link
under the section that fits, keeping the existing format:

```markdown
- [Order Location Query](/order_location_sql)
```

Current sections, in order: **Personal Projects**, **BigQuery SQL for BigCommerce**,
**Codecademy Projects**. If the project doesn't fit any of them, propose a new section
heading to the user rather than forcing it into a bad fit — the sections are how a
visitor reads the page, and a new area of work deserves its own.

Leading slash, no `.md`. Only add a thumbnail under the index entry if the existing
entries in that section have one; the Codecademy section does, the others don't.

## Step 5 — Check it before pushing

There's no way to preview locally, so these checks stand in for a build. They take a
minute and catch what actually breaks:

- **Front matter parses** — opening and closing `---`, and any value containing a colon
  is quoted. A YAML error fails the remote build silently, with an email and no site update
- **Every link in `index.md` resolves** to a file that exists at the repo root
- **Every `src` in the new page** points at a file that exists in `images/`
- **Every code fence has a language tag** and its closing fence
- **No `?raw=true`** and no fixed `height`/`width` attributes in the new markup
- **Only allowlisted plugins** — if you touched `_config.yml`, confirm anything added is
  on the GitHub Pages allowlist

Then commit, push to `master`, wait about a minute, and open the live page to confirm.
Verify the new URL renders and the index links to it. Sharing the URL through a
LinkedIn post preview (or any OG debugger) is the quick way to confirm the share card
picked up the `image` and `description`.

## Step 6 — Commit

One commit for the page, its images, and the index entry together, so the change is
reviewable as a unit. Match the existing log style: imperative, specific, no prefix
tags.

Good: `Add Fabric KPI dashboard project page`
Not: `feat(content): add new page` or `Update files`
