# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

This is a static SPA with no build step. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no tests, no linter, and no package.json.

## Git Workflow

After every code change, always commit and push to origin/main.
- Commit messages must be in English
- Use conventional commit format: `type: short description`
- After committing, always run `git push origin main`

## Architecture

**Single-page app** using hash-based routing (`#home`, `#stock`, etc.) with ES modules (`type="module"`). No framework, no bundler.

### Module roles

| File | Role |
|---|---|
| `js/main.js` | Entry point — imports all pages and boots the Router |
| `js/router.js` | Hash router: listens for `hashchange`, calls `page.template()` then `page.init()` |
| `js/storage.js` | All localStorage reads/writes via `storage.get()` / `storage.save()` / `storage.reset()`. Key: `StayStockedApp` |
| `js/masterData.js` | Static item master list (`todoMasterList`), quantity calculation logic (`buildCalcParams`, `getCombinedMasterList`) |
| `js/ui.js` | `showToast()` and `showConfirm()` — replacements for `alert`/`confirm` |
| `js/pages/*.js` | One file per route. Each exports `{ template(), init() }` |

### Page contract

Every page module exports an object with:
- `template()` — returns an HTML string; called before `init()`
- `init()` — attaches event listeners, reads storage, mutates the DOM

Pages must not set up listeners in `template()`. The Router replaces `#app-root` innerHTML with the template, then calls `init()`.

### Data flow

1. `storage.get()` returns the full app state (profiles, stockItems, settings, customMasterItems)
2. `buildCalcParams(data)` converts profiles → `{ adults, children, infants, elderly, females, totalPeople, pets }`
3. `getCombinedMasterList(data.customMasterItems)` merges built-in items with user-defined ones
4. Pages compute required quantities via each item's `calc(params, days)` function

### Cross-page navigation with state

`sessionStorage` is used to pass context between pages:
- `newItemFromTodo` — JSON with `{ masterId, name, unit }` when adding from stock list
- `editItemId` — ID of a stock item to edit in the register page

### CSS

`css/style.css` — base styles and shared components. `css/additions.css` — additions/overrides. CSS variables for colors are defined in `:root` in `style.css`.
