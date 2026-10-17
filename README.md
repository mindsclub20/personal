# Shyam's Personal Toolbox

A responsive, lavender-themed collection of useful browser tools.

## Features
- Quick links to official ChatGPT, Google Gemini, and Claude websites (API integration is not enabled yet).
- AI image studio prompt builder with style/aspect-ratio options; opens ChatGPT for generation (direct API integration is not enabled yet).\n- Calculator with parentheses and keyboard input, using a parser rather than JavaScript eval.
- File converter for common image, PDF, and text files to PDF, PPTX, PNG, or JPEG. Multiple images can be combined into a PDF or PowerPoint; multiple image exports are bundled in a ZIP.
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
- File conversion runs in the browser and does not upload your files. PDF pages are rendered as images during conversion; this prioritizes appearance over selectable text.
- If AI APIs are added later, route requests through a backend and store provider keys in server-side environment variables. Never place secret API keys in client-side JavaScript.

## Deployment
This is a static site suitable for Vercel. No database or environment variables are required for current features.


### File converter limits
- Supported input: common browser-readable images, PDF, TXT, Markdown, CSV, JSON, and HTML. Unsupported formats are skipped with a message.
- Output: PDF, PPTX, PNG, and JPEG. A multi-page or multi-file PNG/JPEG export is downloaded as a ZIP.
- For privacy and reliability, current conversion is local-only and each input is limited to 25 MB (60 MB total selection). Some large PDFs may be slow.
- This is not a universal conversion engine: DOCX/XLSX and other specialist formats need dedicated parsers or a secure server-side office conversion service. Do not upload sensitive documents to services you do not trust.
- PDF-to-PDF / image-to-PDF output is rendered for visual fidelity, so text in converted pages may not be searchable or selectable.
\n\n### AI image studio status\n- The page builds a detailed prompt and can copy it to the clipboard, then open ChatGPT for image generation.\n- It does not generate images directly inside this site yet. Direct generation requires a compatible image API and a secure server-side endpoint; never put an API key in `script.js`.\n- Prompts can be creatively flexible, but this is not designed to bypass provider safety controls.\n

## Public homepage + private owner dashboard

- The public homepage remains accessible at `/`; use **Owner login** to open the private area.
- The dashboard route is protected by Vercel middleware and a signed, HttpOnly session cookie.
- The login accepts exactly one configured owner username and one password hash. There is no registration.
- Dashboard notes are saved only in the current browser/device. They are not server-synced.

### Required Vercel environment variables

Configure these for **Production** (and Preview only if you intend to test there):

1. `OWNER_USERNAME` — your one chosen username.
2. `OWNER_PASSWORD_HASH` — an scrypt hash generated locally; do not paste the plain password into GitHub or chat.
3. `SESSION_SECRET` — a long random secret (at least 32 random bytes). Generate locally, for example with Node's `crypto.randomBytes(32).toString("hex")`.

To generate the password hash on a computer with Node.js, run:

```bash
node scripts/make-password-hash.js 'your-long-unique-password'
```

Use the printed `scrypt:...` value as `OWNER_PASSWORD_HASH`, then remove the password from your shell history if your terminal stores commands. Choose a unique password of at least 12 characters. Never commit the hash or session secret to the repository. After saving the Vercel variables, redeploy Production.

The login will intentionally report “not configured” until all three variables exist. The cookie expires after eight hours. Do not use this dashboard to store highly sensitive information.


## VisualRobotics Lab (ESP32)

Open `/visualrobotics-lab.html` from the authenticated dashboard.

### Implemented in this repository
- Arduino C++ sketch editing and download (`sketch.ino`).
- Local browser project save/open, search, rename, duplicate, delete, Save As, JSON import/export.
- Editable bill of materials with INR estimates (illustrative, not live prices).
- Starter Wokwi `diagram.json` export and separate manual handoff to Wokwi.
- PowerMat V4 conceptual demonstration firmware and project inventory.
- Basic project/inventory validation; this is not C++ compilation, circuit verification, or electrical safety certification.

### Known limitations — do not mistake these for finished capabilities
- Projects currently persist in the current browser/device only; no cloud database sync is configured.
- Wokwi is a manual handoff. The page does not auto-import, control, or read simulation state from Wokwi.
- Generated `diagram.json` is a starter layout with no generated wire connections. Add and verify wiring/pin mappings in the simulator.
- The page does not compile Arduino firmware or run an ESP32 simulator itself.
- PowerMat V4 values are not real-world measurements. Never connect a generator/harvesting circuit directly to ESP32 pins without appropriate conditioning, voltage/current limits, and a verified circuit design.

### Private access and deployment
The site middleware intentionally protects the dashboard and VisualRobotics page with the same owner session. The public homepage link redirects to owner login until a valid session exists. The login endpoint requires the Vercel environment variables `OWNER_USERNAME`, `OWNER_PASSWORD_HASH` (scrypt hash), and `SESSION_SECRET`. Never commit the plain password or secrets. If these variables are missing, login reports that configuration is unavailable.
