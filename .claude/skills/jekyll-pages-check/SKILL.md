---
name: jekyll-pages-check
description: Validate the michaelmiller.page Jekyll site before pushing, or diagnose it when the GitHub Pages build fails or the live site looks wrong — checks front matter, internal links, images, Liquid tags, plugins, and CNAME without needing a local Jekyll build. Use this whenever changes to the quick-portfolio repo are about to be pushed, and whenever the user says the site is broken, a page 404s, images aren't showing, the build failed, GitHub emailed about a page build failure, or asks to check or verify the site before it goes live.
---

# Check the site before it goes live

This site has no local build — no Gemfile, no Ruby on this machine — so there is no
`jekyll serve` to catch mistakes. GitHub builds it remotely after a push, and the
failure modes are unhelpful: a YAML typo or an unsupported plugin fails the build
silently (you get an email, the site keeps serving the old version), while a broken link
or a missing image builds fine and ships broken.

The bundled script stands in for that build. It is static — no network, no npm install,
nothing to set up — so run it freely rather than reasoning about whether a change was
risky.

## Run it

```bash
node .claude/skills/jekyll-pages-check/scripts/check-site.mjs
```

Exit code 0 means no errors; 1 means something will break. It takes about a second, so
run it after any edit to a page, `_config.yml`, or `_layouts/`, and always before a push.

To check a directory other than this repo (mainly useful for testing the script itself):

```bash
node .claude/skills/jekyll-pages-check/scripts/check-site.mjs --root /path/to/fixture
```

## Reading the output

**ERRORS** break the build or publish something visibly broken. Fix before pushing:

- Front matter that never closes, contains a tab, or has an unquoted value containing
  `": "` — YAML reads the last one as a nested map and the build dies
- Internal links pointing at a file that doesn't exist, or ending in `.md` (Jekyll
  publishes extensionless URLs, so `.md` links 404)
- Images that don't exist, have no alt text, or use a relative path — relative image
  paths resolve from the site root, so they work on `index.md` and break everywhere else
- Plugins not on the GitHub Pages allowlist, or an unsupported `theme:`
- Unbalanced Liquid blocks in a layout, unbalanced code fences in a page
- A `CNAME` that's missing or no longer says `michaelmiller.page`

**WARNINGS** still publish, but they're the slow rot: pages with no front matter
(inheriting the site-wide bio as their meta description), missing share images,
oversized images, orphan pages nothing links to, dead assets, code fences with no
language tag.

Warnings are not automatically worth fixing on the spot. When they belong to files the
current task isn't touching, say what's there and let the user decide — an unrelated
cleanup buried inside a content change makes both harder to review.

## What it cannot catch

Be honest about the gap rather than treating a clean run as proof the site is fine:

- It does not run Liquid or Jekyll, so it validates tag *balance*, not tag *behavior*
- It does not parse full YAML — nested structures and multi-line values are skipped
- It knows nothing about how a page actually looks, or whether the CSS holds up
- It cannot see the remote build result

So a clean run means "nothing known-broken is going out," not "this rendered correctly."

## After pushing

The remote build takes about a minute. Confirm rather than assume:

1. Load the page, bypassing cache (the CDN serves the old version for a short while)
2. Check the change is actually visible — a stale page usually means the build is still
   running or failed, not that the edit was wrong
3. For a new or changed page, confirm `<title>`, `meta description`, and `og:image` are
   what you intended; the site depends on `jekyll-seo-tag` for all three

There is no `gh` CLI on this machine, so build status and failure emails have to be
checked in the browser under the repo's Actions tab or Settings → Pages.

If the live site is stale and the build failed, the cause is almost always something in
the ERROR list above — rerun the script, since a build that fails leaves the previous
version up and the mistake is easy to miss.

## Keeping the checks honest

The checks encode this site's conventions, so they have to move when the conventions do.
If you add a section to `index.md`, adopt a new image pattern, or start using a plugin,
update the script in the same commit — a checker that quietly encodes last year's rules
trains you to ignore it.

When adding a check, add a matching case to a throwaway fixture directory and confirm it
actually fires. Every check in the script was verified that way; a check that has never
failed on purpose has not been tested.
