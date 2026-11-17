# Shyam Personal — Robotics, Electronics & Python Bench

A private learning and engineering workspace focused on robotics, electronics fundamentals, and Python programming. It combines the existing browser tools, VisualRobotics workspace, Python lab, a robotics learning planner, and optional browser-local AI.

## Features
- Quick links to official ChatGPT, Google Gemini, and Claude websites (API integration is not enabled yet).
- AI image studio prompt builder with style/aspect-ratio options; opens ChatGPT for generation (direct API integration is not enabled yet).\n- Calculator with parentheses and keyboard input, using a parser rather than JavaScript eval.
- File converter for common image, PDF, and text files to PDF, PPTX, PNG, or JPEG. Multiple images can be combined into a PDF or PowerPoint; multiple image exports are bundled in a ZIP.
- Quick notes saved locally in the current browser/device.
- Live word/character count and estimated reading time.
- Length, weight, and temperature converter.
- 25-minute focus timer.
- Robotics, Electronics & Python daily planner with quick-add tasks for each learning track.
- Optional browser-local Qwen2.5-Coder 0.5B assistant using WebLLM and WebGPU. Model inference runs in the browser; no Gemini/Groq/OpenAI inference API or user API key is used by this chat.

## Run locally
Open `index.html` in a browser, or start a local static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Privacy and local AI
- The local AI chat runs inference in the browser with WebLLM/WebGPU. It does not send chat prompts to a hosted AI inference API.
- First use downloads the WebLLM runtime and approximately 1 GB of model files; an internet connection is required for this initial setup. WebLLM caches model assets in the browser for later use. Actual performance depends on the device and WebGPU support.
- The current chat history is saved in this browser's local storage. It is not synced to Supabase or other devices.
- Notes use browser local storage on the current device. Avoid entering passwords or sensitive data.
- File conversion runs in the browser and does not upload your files. PDF pages are rendered as images during conversion; this prioritizes appearance over selectable text.
- Other external AI website shortcuts are links only; they are separate from the local model chat.

## Checks
Run the browser-local AI unit tests with `node --test tests/local-llm.test.mjs`. Check JavaScript syntax with `node --check workspace.js` and `node --check local-llm.js`.

## Deployment
This is a static site suitable for Vercel. The browser-local model requires WebGPU and an initial download; it does not require a Supabase project or server-side inference secrets.


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
- Local browser project save/open plus owner-authenticated cloud save/load across devices, search, rename, duplicate, soft-delete, restore, revision history/recovery, and JSON import/export.
- Editable bill of materials with INR estimates (illustrative, not live prices).
- Starter Wokwi `diagram.json` export and separate manual handoff to Wokwi.
- PowerMat V4 conceptual demonstration firmware and project inventory.
- Dedicated responsive PowerMat V4 simulator page with deterministic mechanical/electromagnetic approximation, rectifier/capacitor/LED model, live charts, local configuration, CSV telemetry, editable BOM, and model tests.
- Project/inventory validation and a limited in-browser virtual ESP32 interpreter for a documented Arduino subset; neither is native C++ compilation or electrical safety certification.

### Known limitations — do not mistake these for finished capabilities
- Cloud project storage uses a dedicated `visualrobotics` schema inside the existing Altrav Supabase project. Tables have RLS enabled, no browser-role policies, and are accessed through owner-authenticated server endpoints and service-role-only RPC functions.
- Cloud CRUD/recovery functions and database permissions were tested directly; public browser access to the API correctly returns HTTP 401 without the owner session. Full authenticated browser testing still requires signing in through the site.
- Wokwi remains a manual handoff. The page does not auto-import, control, or read simulation state from Wokwi.
- Generated `diagram.json` is a starter layout with no generated wire connections. Add and verify wiring/pin mappings in the simulator.
- The built-in Virtual ESP32 is a limited interpreter, not hardware-accurate simulation. A native compiler pipeline is now implemented in `.github/workflows/esp32-compile.yml`: GitHub Actions installs Arduino CLI + Espressif ESP32 core, compiles the submitted sketch, assembles a flashable merged `firmware.bin`, and retains diagnostics as a short-lived artifact. The authenticated API dispatches and polls those jobs. **One deployment configuration step remains:** add a fine-grained GitHub token as the encrypted Vercel environment variable `GITHUB_ACTIONS_TOKEN` for `mindsclub20/personal` with Actions read/write and Contents read, then redeploy. Without that secret the endpoint intentionally returns HTTP 503 rather than pretending to compile. The build path has not yet completed a live native build, so confirm it with a real sketch after configuration.
- PowerMat V4 values are not real-world measurements. Never connect a generator/harvesting circuit directly to ESP32 pins without appropriate conditioning, voltage/current limits, and a verified circuit design.
- The dedicated PowerMat V4 page is a simplified mathematical model. Its peak flux and cost inputs are assumptions, its loss accounting is partial, and it is not a hardware-accurate electromagnetic/mechanical simulation or a physical safety validation.
- Run the PowerMat model tests with `node --experimental-default-type=module --test tests/powermat-model.test.mjs` (Node.js 22+).

### Private access and deployment
The site middleware intentionally protects the dashboard and VisualRobotics page with the same owner session. The public homepage link redirects to owner login until a valid session exists. The login endpoint requires the Vercel environment variables `OWNER_USERNAME`, `OWNER_PASSWORD_HASH` (scrypt hash), and `SESSION_SECRET`. Never commit the plain password or secrets. If these variables are missing, login reports that configuration is unavailable.


### VisualRobotics Lab / PowerMat V4 follow-up (2026-10-18)
- **Run vs. Build:** “Run ESP32 + simulation” starts the in-browser teaching interpreter and does not require `GITHUB_ACTIONS_TOKEN`. “Build firmware (.bin)” is a separate native compile workflow and still requires the server-side token described above. Virtual GPIO/Serial values are software-only.
- **Diagram export:** `diagram.json` now includes explicit Wokwi-format connections for the supported demo loop when an ESP32 DevKit, resistor, and LED are present: GPIO 2 → resistor → LED anode; LED cathode → GND. The resistor is represented as 220 Ω in the diagram. This is only a basic LED demonstration, not the PowerMat generator/rectifier/storage electrical model.
- **Project export:** exported VisualRobotics project JSON includes the generated diagram alongside inventory and firmware.
- **Persistence scope:** VisualRobotics has local project save/load and owner-authenticated Supabase cloud save/load. The standalone PowerMat simulator's “Save locally” button persists its numeric configuration only; it does not yet persist the complete simulation history to cloud.
- **Validation boundaries:** these changes have not been verified against a physical ESP32, generator, rectifier, supercapacitor, or LED. Native firmware success must only be reported after the GitHub Actions job completes successfully and returns the binary artifact.
