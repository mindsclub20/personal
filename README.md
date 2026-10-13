# Shyam's Personal Toolbox

A responsive, lavender-themed collection of useful browser tools.

## Features
- Quick links to official ChatGPT, Google Gemini, and Claude websites (API integration is not enabled yet).
- Calculator with parentheses and keyboard input, using a parser rather than JavaScript eval.
- PDF document maker using the browser print dialog; choose **Save as PDF** as the destination.
- Quick notes saved locally in the current browser/device.
- Live word/character count and estimated reading time.
- Length, weight, and temperature converter.
- 25-minute focus timer.

## Run locally
Open `index.html` in a browser, or start a local static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Privacy and API readiness
- The site does not call AI APIs or ask for API keys.
- Notes use browser local storage on the current device. Avoid entering passwords or sensitive data.
- PDF creation uses the browser print dialog and does not upload the document.
- If AI APIs are added later, route requests through a backend and store provider keys in server-side environment variables. Never place secret API keys in client-side JavaScript.

## Deployment
This is a static site suitable for Vercel. No database or environment variables are required for current features.
