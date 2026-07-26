# quick-portfolio

Michael Miller's data & reporting portfolio — a Jekyll site published at
**https://michaelmiller.page** via GitHub Pages.

## How it deploys

Push to `master` → GitHub builds the site remotely → live in ~1 minute. There is no
CI config in the repo; GitHub Pages runs the build. The custom domain comes from
`CNAME`, which must stay at the repo root and must not be edited casually — losing it
takes the site off `michaelmiller.page`.

**There is no local build.** No `Gemfile`, no Ruby installed on this machine. Changes
cannot be previewed before pushing, so correctness has to come from checking things
statically (see "Before pushing" below) and then verifying the live URL after the push.

## Structure

| Path | What it is |
|---|---|
| `index.md` | The portfolio landing page — the index of every project, grouped by section |
| `*.md` at root | One file per project page, e.g. `excel_to_gs.md`, `order_location_sql.md` |
| `_config.yml` | Site title, bio blob (`description`), theme, GA4 id |
| `_layouts/default.html` | Local override of the theme's layout — the only HTML in the repo |
| `images/` | Screenshots and the profile photo |
| `favicon.png` | Mike Miller Consulting logo, referenced from the layout |

Theme is `jekyll-theme-minimal`, supplied by GitHub Pages as a gem. The CSS lives in
the gem, not the repo — `/assets/css/style.css` is generated at build time and there is
no local `assets/` directory to edit. To change markup, edit `_layouts/default.html`.

## Jekyll behavior this site depends on

GitHub Pages auto-enables several plugins, and this site quietly relies on them:

- **jekyll-optional-front-matter** — pages here have no `---` front matter and still build
- **jekyll-default-layout** — that's why pages render with `default` without asking
- **jekyll-titles-from-headings** — page titles come from the first heading in the file
- **jekyll-seo-tag** — powers `{% seo %}` in the layout (title, canonical, OG, JSON-LD)

Only plugins on the [GitHub Pages allowlist](https://pages.github.com/versions/) will
run. Adding anything else to `_config.yml` fails the remote build with an email and no
site update, which is a slow way to find out.

## Conventions

- **New project = one markdown file at the repo root**, `snake_case.md`, linked from the
  matching section of `index.md`. The `add-project-page` skill in `.claude/skills/` does
  this end to end — use it rather than hand-rolling a page.
- **Internal links use a leading slash** (`/excel_to_gs`), no `.md` extension.
- **Images: leading-slash paths** (`/images/foo.jpg`) so they resolve from subpages too,
  under 200 KB, sized with `style="max-width:100%; height:auto;"` rather than fixed
  `height`/`width` attributes, which distort aspect ratio and overflow on mobile.
- The older `?raw=true` suffix on image `src` values is a leftover from GitHub blob
  URLs. Harmless, but don't copy it into new pages.

## Tooling available on this machine

`git` and `node` — that's it. No Python, no Ruby, no ImageMagick, no `gh` CLI. Skill
scripts here are PowerShell for that reason. If a task seems to need `gh` (e.g. reading
Pages build status), it has to be done in the browser instead.

## Remotes

- `origin` → `gobr2005/quick-portfolio` — Mike's repo, this is what deploys
- `upstream` → `evanca/quick-portfolio` — the template this was forked from. Never push
  here, and don't merge from it; the site has diverged deliberately.

## Known issues / backlog

Not urgent, but worth knowing before touching related code:

- The header photo has `alt="Logo"` in `_layouts/default.html` — it's a photo of a
  person, not a logo.
- `images/Mike Miller.jpg` has a space in the filename, so it appears as `%20` in the
  `og:image` URL. Works, but a rename would be tidier — it is referenced from
  `_config.yml` in two places (`logo` and the `defaults` share image).
- Neither project page has its own screenshot, so both fall back to the site-wide share
  image. A page-specific one previews better.
- **GA4**: the tag fires correctly (verified live — container initializes, `gtm.load`
  runs). If data looks missing, the cause is GA4-side or an ad blocker, not the site.

Run `node .claude/skills/jekyll-pages-check/scripts/check-site.mjs` for the current
state rather than trusting this list — it drifts.
