# PromptBox

A no-install, local-first library for AI prompts. Save prompts you like, then find them again quickly by keyword, tag, or favorite status.

[中文](./README.md)

![PromptBox screenshot](docs/demo.jpg)

## Why

Useful prompts are usually scattered across chat history, browser tabs, and notes. PromptBox puts saving, organizing, and searching into one page with no account, backend, or build step.

## Features

- Create, edit, and delete prompt snippets
- Full-text search across title, content, and tags
- Filter by tag or favorites
- One-click copy
- Light and dark themes
- JSON import and export for backup
- Data stays in the browser's localStorage by default

## Quick start

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. Add `?demo=1` to the URL to open with sample data.

## Tests

```bash
npm test
```

## Project structure

```text
.
├── index.html          # Page markup
├── css/style.css       # Light and dark themes
├── js/logic.js         # Framework-free data logic
├── js/app.js           # Browser interaction
├── test/logic.test.js  # Unit tests
└── .github/workflows/  # CI and Pages deployment
```

## License

[MIT](./LICENSE)
