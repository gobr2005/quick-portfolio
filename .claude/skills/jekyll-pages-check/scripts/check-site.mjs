#!/usr/bin/env node
/**
 * Static checks for the quick-portfolio Jekyll site.
 *
 * This site has no local build — no Gemfile, no Ruby — so nothing catches a
 * broken link, a missing image, a YAML typo, or an unsupported plugin until
 * GitHub Pages either fails the build (email, no site update) or publishes
 * something broken. These checks stand in for that build.
 *
 * They are deliberately static: no network, no dependencies, no npm install.
 * Run from anywhere; paths resolve against the repo root.
 *
 *   node .claude/skills/jekyll-pages-check/scripts/check-site.mjs
 *
 * Exit code 0 = no errors (warnings may still be present), 1 = errors found.
 */

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Defaults to the repo this script lives in. --root exists so the checks can be
// run against a fixture directory, which is how they get tested.
const rootArg = process.argv.indexOf('--root');
const REPO = rootArg !== -1
  ? resolve(process.argv[rootArg + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const IMAGE_BUDGET_KB = 200;
const EXPECTED_DOMAIN = 'michaelmiller.page';

const errors = [];
const warnings = [];
/** Site-wide `image` default from _config.yml, if one is set. Pages inherit it as
 *  their share card, so a page without its own `image` is not necessarily bare. */
let defaultImage = null;
const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

const rel = (p) => relative(REPO, p).replace(/\\/g, '/');
const read = (p) => readFileSync(p, 'utf8');

// Plugins GitHub Pages will actually load. Anything else in `plugins:` fails the
// remote build. See https://pages.github.com/versions/
const ALWAYS_ON = [
  'jekyll-coffeescript', 'jekyll-default-layout', 'jekyll-gist',
  'jekyll-github-metadata', 'jekyll-optional-front-matter', 'jekyll-paginate',
  'jekyll-readme-index', 'jekyll-titles-from-headings', 'jekyll-relative-links',
  'jekyll-seo-tag',
];
const OPT_IN = [
  'jekyll-avatar', 'jekyll-mentions', 'jekyll-remote-theme', 'jekyll-sitemap',
  'jekyll-redirect-from', 'jekyll-feed', 'jemoji', 'jekyll-include-cache',
];

// Liquid block tags that must be closed, and the standalone tags Pages supports.
const BLOCK_TAGS = ['if', 'unless', 'for', 'case', 'capture', 'comment', 'raw', 'tablerow', 'highlight'];
const INLINE_TAGS = [
  'assign', 'include', 'include_cached', 'break', 'continue', 'cycle', 'increment',
  'decrement', 'when', 'else', 'elsif', 'seo', 'feed_meta', 'avatar', 'gist',
  'post_url', 'link', 'sitemap',
];

const rootMarkdown = readdirSync(REPO)
  .filter((f) => extname(f) === '.md' && f !== 'README.md' && f !== 'CLAUDE.md')
  .map((f) => join(REPO, f));

const configText = existsSync(join(REPO, '_config.yml')) ? read(join(REPO, '_config.yml')) : '';

// A site-wide `image` under `defaults:` gives every page a share card, so read it
// before checking pages — otherwise every page looks like it has no preview image.
const configLines = configText.split(/\r?\n/);
const defaultsAt = configLines.findIndex((l) => /^defaults:\s*$/.test(l));
if (defaultsAt !== -1) {
  // The block runs until the next top-level key (a line starting with a non-space).
  const block = [];
  for (let i = defaultsAt + 1; i < configLines.length; i++) {
    const line = configLines[i];
    if (line.trim() && !/^\s/.test(line)) break;
    block.push(line);
  }
  const img = block.join('\n').match(/^\s+image:\s*(.+)$/m);
  if (img) {
    defaultImage = img[1].trim().replace(/^['"]|['"]$/g, '');
    const onDisk = join(REPO, decodeURIComponent(defaultImage.replace(/^\//, '')));
    if (!existsSync(onDisk)) {
      err('_config.yml', `Default share image "${defaultImage}" does not exist, so every page gets a broken link preview.`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Front matter
 * ------------------------------------------------------------------ */

const BROKEN = Symbol('broken front matter');

/** Minimal front matter reader. Not a YAML parser — it catches the mistakes
 *  that actually break Jekyll builds, which are structural, not semantic.
 *  Returns null when there is no front matter (valid here), BROKEN when it is
 *  malformed, or a key/value object. */
function frontMatter(file) {
  const text = read(file);
  if (!text.startsWith('---')) return null; // valid here: jekyll-optional-front-matter
  const lines = text.split(/\r?\n/);
  const close = lines.indexOf('---', 1);
  if (close === -1) {
    err(rel(file), 'Front matter opens with --- but never closes. Jekyll will treat the whole file as front matter and the build fails.');
    return BROKEN; // distinct from "absent" so we don't also report it as missing
  }
  const keys = {};
  for (let i = 1; i < close; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (line.includes('\t')) {
      err(rel(file), `Front matter line ${i + 1} contains a tab. YAML forbids tabs for indentation.`);
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) {
      if (/^\s+/.test(line)) continue; // continuation / nested value, out of scope
      err(rel(file), `Front matter line ${i + 1} is not a key: value pair -> ${line.trim()}`);
      continue;
    }
    const [, key, raw] = m;
    const value = raw.trim();
    // The classic silent build-breaker: an unquoted value containing ": ",
    // which YAML reads as a nested mapping.
    if (/:\s/.test(value) && !/^['"].*['"]$/.test(value)) {
      err(rel(file), `Front matter "${key}" contains ": " but is not quoted. YAML reads this as a nested map and the build fails. Wrap the value in quotes.`);
    }
    keys[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return keys;
}

/* ------------------------------------------------------------------ *
 * Pages: front matter quality, links, images
 * ------------------------------------------------------------------ */

const linkedPages = new Set();
const referencedImages = new Set();

for (const file of rootMarkdown) {
  const name = rel(file);
  const text = read(file);
  const fm = frontMatter(file);

  if (fm && fm !== BROKEN) {
    if (!fm.layout) warn(name, 'Front matter has no "layout: default". With front matter present, do not rely on jekyll-default-layout.');
    if (!fm.description) {
      warn(name, 'No "description" in front matter, so this page inherits the site-wide bio as its meta description and search snippet.');
    } else if (fm.description.length > 160) {
      warn(name, `Description is ${fm.description.length} chars; search results truncate around 155-160.`);
    }
    if (fm.image && !existsSync(join(REPO, fm.image.replace(/^\//, '')))) {
      err(name, `Front matter image "${fm.image}" does not exist. Link previews will show a broken card.`);
    }
    if (!fm.image && !defaultImage) {
      warn(name, 'No "image" in front matter, so shares of this page have no preview thumbnail.');
    } else if (!fm.image) {
      warn(name, `No "image" in front matter, so shares fall back to the site default (${defaultImage}). A page-specific screenshot previews better.`);
    }
  } else if (fm === null && name !== 'index.md') {
    warn(name, 'No front matter, so title comes from the first heading and the meta description falls back to the site-wide bio.');
  }

  // Internal markdown links
  for (const [, href] of text.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    if (/\.(png|jpe?g|gif|svg|pdf|webp)$/i.test(href)) {
      referencedImages.add(href.replace(/^\//, '').split('?')[0]);
      continue;
    }
    if (href.endsWith('.md')) {
      err(name, `Link "${href}" ends in .md. Jekyll publishes these as extensionless URLs; this 404s.`);
      continue;
    }
    const target = href.replace(/^\//, '').replace(/\/$/, '');
    if (target === '') continue;
    if (existsSync(join(REPO, `${target}.md`))) {
      linkedPages.add(`${target}.md`);
    } else if (!existsSync(join(REPO, target))) {
      err(name, `Link "${href}" points at nothing. Expected ${target}.md at the repo root.`);
    }
  }

  // <img> tags
  for (const [tag] of text.matchAll(/<img\b[^>]*>/g)) {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    const alt = tag.match(/alt="([^"]*)"/)?.[1];
    if (!src) { err(name, `<img> tag with no src: ${tag.slice(0, 60)}`); continue; }
    if (src.startsWith('http')) continue;

    if (src.includes('?raw=true')) {
      warn(name, `"${src}" carries a ?raw=true suffix left over from GitHub blob URLs. Harmless but pointless.`);
    }
    if (!src.startsWith('/')) {
      err(name, `Image "${src}" is a relative path. It resolves from the site root only, so it breaks on every page except index.`);
    }
    if (alt === undefined || alt.trim() === '') {
      err(name, `Image "${src}" has no alt text. Screen readers and search both read it.`);
    }
    if (/\b(height|width)="/.test(tag)) {
      warn(name, `Image "${src}" sets fixed height/width. That distorts aspect ratio and overflows on mobile; use style="max-width:100%; height:auto;" instead.`);
    }

    const path = src.replace(/^\//, '').split('?')[0];
    referencedImages.add(path);
    const abs = join(REPO, path);
    if (!existsSync(abs)) {
      err(name, `Image "${src}" does not exist in the repo.`);
    } else {
      const kb = Math.round(statSync(abs).size / 1024);
      if (kb > IMAGE_BUDGET_KB) {
        warn(name, `"${src}" is ${kb} KB, over the ${IMAGE_BUDGET_KB} KB budget. Run the add-project-page prep-image.ps1 script on it.`);
      }
    }
  }

  // Code fences
  const fences = [...text.matchAll(/^```(\w*)/gm)];
  if (fences.length % 2 !== 0) {
    err(name, `Unbalanced code fences (${fences.length} found). An unclosed fence swallows the rest of the page.`);
  } else {
    fences.filter((_, i) => i % 2 === 0).forEach((f) => {
      if (!f[1]) warn(name, 'Code fence with no language tag, so it renders without syntax highlighting.');
    });
  }
}

/* ------------------------------------------------------------------ *
 * Orphans and unused assets
 * ------------------------------------------------------------------ */

for (const file of rootMarkdown) {
  const name = rel(file);
  if (name === 'index.md') continue;
  if (!linkedPages.has(name)) {
    warn(name, 'Nothing links to this page. Jekyll will publish it, but no visitor can reach it — add it to a section of index.md.');
  }
}

const layoutFiles = existsSync(join(REPO, '_layouts'))
  ? readdirSync(join(REPO, '_layouts')).map((f) => join(REPO, '_layouts', f))
  : [];
const otherText = configText + layoutFiles.map(read).join('\n');

for (const dir of ['images', 'pdf', 'assets']) {
  if (!existsSync(join(REPO, dir))) continue;
  for (const f of readdirSync(join(REPO, dir))) {
    const path = `${dir}/${f}`;
    if (statSync(join(REPO, path)).isDirectory()) continue;
    if (!referencedImages.has(path) && !otherText.includes(f)) {
      warn(path, `Not referenced anywhere. ${Math.round(statSync(join(REPO, path)).size / 1024)} KB of dead weight in the repo.`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * _config.yml
 * ------------------------------------------------------------------ */

if (!configText) {
  err('_config.yml', 'Missing. The site will build with defaults and lose its title, theme, and analytics.');
} else {
  const pluginBlock = configText.match(/^plugins:\s*\n((?:\s*-\s*.+\n?)*)/m);
  if (pluginBlock) {
    for (const [, p] of pluginBlock[1].matchAll(/-\s*(\S+)/g)) {
      if (!ALWAYS_ON.includes(p) && !OPT_IN.includes(p)) {
        err('_config.yml', `Plugin "${p}" is not on the GitHub Pages allowlist. The remote build will fail and the site will not update.`);
      } else if (ALWAYS_ON.includes(p)) {
        warn('_config.yml', `Plugin "${p}" is enabled by GitHub Pages automatically; listing it is redundant.`);
      }
    }
  }
  if (/^theme:\s*(.+)$/m.test(configText)) {
    const theme = configText.match(/^theme:\s*(.+)$/m)[1].trim();
    const supported = ['jekyll-theme-minimal', 'jekyll-theme-cayman', 'jekyll-theme-slate',
      'jekyll-theme-architect', 'jekyll-theme-dinky', 'jekyll-theme-hacker',
      'jekyll-theme-leap-day', 'jekyll-theme-merlot', 'jekyll-theme-midnight',
      'jekyll-theme-modernist', 'jekyll-theme-tactile', 'jekyll-theme-time-machine',
      'minima'];
    if (!supported.includes(theme)) {
      err('_config.yml', `theme "${theme}" is not a GitHub Pages supported theme. Use "remote_theme" instead, or the build fails.`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * CNAME and layouts
 * ------------------------------------------------------------------ */

const cnamePath = join(REPO, 'CNAME');
if (!existsSync(cnamePath)) {
  err('CNAME', `Missing. Without it the site drops off ${EXPECTED_DOMAIN} and serves from github.io.`);
} else if (read(cnamePath).trim() !== EXPECTED_DOMAIN) {
  err('CNAME', `Contains "${read(cnamePath).trim()}", expected "${EXPECTED_DOMAIN}".`);
}

for (const file of layoutFiles) {
  const name = rel(file);
  const text = read(file);
  const stack = [];
  for (const [, body] of text.matchAll(/\{%-?\s*(.+?)\s*-?%\}/g)) {
    const tag = body.split(/\s+/)[0];
    if (BLOCK_TAGS.includes(tag)) {
      stack.push(tag);
    } else if (tag.startsWith('end')) {
      const opener = tag.slice(3);
      if (stack.pop() !== opener) {
        err(name, `Liquid {% ${tag} %} does not match the open block. Unbalanced tags fail the build.`);
      }
    } else if (!INLINE_TAGS.includes(tag)) {
      warn(name, `Liquid tag {% ${tag} %} is not one GitHub Pages is known to support. Verify it before pushing.`);
    }
  }
  if (stack.length) {
    err(name, `Unclosed Liquid block(s): ${stack.join(', ')}. The build will fail.`);
  }
  for (const [tag] of text.matchAll(/<img\b[^>]*>/g)) {
    const alt = tag.match(/alt="([^"]*)"/)?.[1];
    if (alt === undefined || alt.trim() === '') {
      warn(name, 'An <img> in the layout has no alt text.');
    }
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const group = (items) => items.reduce((acc, { file, msg }) => {
  (acc[file] ||= []).push(msg);
  return acc;
}, {});

const print = (label, items) => {
  if (!items.length) return;
  console.log(`\n${label} (${items.length})\n`);
  for (const [file, msgs] of Object.entries(group(items))) {
    console.log(`  ${file}`);
    for (const m of msgs) console.log(`      - ${m}`);
  }
};

print('ERRORS — these break the build or ship something broken', errors);
print('WARNINGS — worth fixing, will still publish', warnings);

console.log(
  `\n${errors.length} error(s), ${warnings.length} warning(s) across ` +
  `${rootMarkdown.length} page(s).\n`
);
if (!errors.length && !warnings.length) console.log('Clean.\n');

process.exit(errors.length ? 1 : 0);
