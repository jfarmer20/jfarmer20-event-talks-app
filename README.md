# BigQuery Release Notes Viewer

*Prompt was: Please build a web application for me using Python Flask and plain vanilla HTML, TypeScript and CSS that fetches the BigQuery Release notes from (https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) and shows them to me. A simple refresh button with a spinner is good enough, anytime I'd like to refresh the details. I would also like the ability to take any specific update, select it and then Tweet about it.*  

> A dark-themed web app that fetches and displays the latest Google BigQuery release notes with one-click tweeting.

---

## Features

- **Live feed** — Fetches the [BigQuery Atom XML feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) via a Flask proxy and parses it into structured entries
- **Typed sections** — Each release note is split into labelled sections (Feature, Announcement, Issue, Breaking Change, Deprecated, Fix, Security…) with colour-coded badges
- **Refresh button** — Spinning icon while loading; last-updated timestamp shown after each fetch
- **Animated cards** — Staggered `fadeInUp` entrance on load, blue glow on hover
- **Tweet any section** — Every section has an `𝕏 Tweet` button that opens a modal with:
  - Pre-filled tweet text (category + date + summary + link)
  - Live character counter (0 / 280) with colour warnings at 240 and 280
  - Editable textarea
  - Direct **Post on X / Twitter** link via the Twitter Web Intent API

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Python · Flask · requests · lxml · BeautifulSoup4 |
| Frontend   | Vanilla HTML · TypeScript · CSS     |
| Fonts      | Inter · JetBrains Mono (Google Fonts) |

---

## Project Structure

```
bq-releases-notes/
├── app.py                  # Flask backend — proxies & parses the Atom XML feed
├── requirements.txt        # Python dependencies
├── package.json            # Node devDependencies (TypeScript)
├── tsconfig.json           # TypeScript compiler config
├── templates/
│   └── index.html          # Jinja2 HTML template
├── static/
│   ├── style.css           # Full design system (dark theme, badges, modal)
│   ├── main.ts             # TypeScript source
│   └── main.js             # Compiled JS served by Flask
└── .venv/                  # Python virtual environment (not committed)
```

---

## Setup & Running

### 1. Create the virtual environment

```bash
python3 -m venv .venv
```

### 2. Install Python dependencies

```bash
.venv/bin/pip install -r requirements.txt
```

### 3. Install Node dependencies & compile TypeScript

```bash
npm install
npx tsc
```

> To watch for TypeScript changes during development:
> ```bash
> npx tsc --watch
> ```

### 4. Start the Flask dev server

```bash
.venv/bin/python app.py
```

Open **http://127.0.0.1:5000** in your browser.

---

## API

| Endpoint              | Method | Description                                      |
|-----------------------|--------|--------------------------------------------------|
| `/`                   | GET    | Serves the main HTML page                        |
| `/api/release-notes`  | GET    | Returns parsed release notes as JSON             |

### Example `/api/release-notes` response

```json
{
  "ok": true,
  "entries": [
    {
      "title": "June 17, 2026",
      "date": "June 17, 2026",
      "date_raw": "2026-06-17T00:00:00-07:00",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026",
      "sections": [
        {
          "category": "Feature",
          "category_class": "feature",
          "body": "<p>You can enable autonomous embedding generation...</p>"
        }
      ]
    }
  ]
}
```

---

## Badge Categories

| Badge           | Colour    |
|-----------------|-----------|
| Feature         | Green     |
| Announcement    | Purple    |
| Breaking Change | Red       |
| Deprecated      | Orange    |
| Issue           | Amber     |
| Fixed           | Teal      |
| Security        | Blue      |
| Preview         | Sky       |
| Libraries       | Slate     |

---

## Notes

- The Flask server runs in **debug mode** — do not use it in production. Use a WSGI server like `gunicorn` for production deployments.
- The Twitter Web Intent link opens a new tab pre-populated with the tweet text; no API keys or OAuth are required.
