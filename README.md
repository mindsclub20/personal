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