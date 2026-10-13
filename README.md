# Shyam's Personal Toolbox

A responsive, lavender-themed collection of useful browser tools.

## Features
- Quick links to official ChatGPT, Google Gemini, and Claude websites.
- Gemini chat endpoint in `api/chat.js`; API key is read only from Vercel server-side environment variables.
- Chat supports text, images, PDFs, TXT, Markdown, CSV, and JSON attachments (2.5 MB maximum). Conversations remain in local browser storage; attachment contents are not saved to chat history.
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
- Gemini requests run through the Vercel serverless endpoint. Configure `GEMINI_API_KEY` in Vercel; never commit it or place it in browser JavaScript.
- Uploaded images/PDFs and text-file contents are sent to Google Gemini for processing. Do not upload private or sensitive material.
- The endpoint includes input validation and best-effort per-instance rate limiting; this is not a substitute for durable abuse protection on a public site.
- Notes use browser local storage on the current device. Avoid entering passwords or sensitive data.
- File conversion runs in the browser and does not upload your files. PDF pages are rendered as images during conversion; this prioritizes appearance over selectable text.
- If AI APIs are added later, route requests through a backend and store provider keys in server-side environment variables. Never place secret API keys in client-side JavaScript.

## Deployment
This site uses Vercel's `/api` serverless functions for Gemini chat. Add `GEMINI_API_KEY` to the Vercel project's Preview and Production environments and redeploy after setting it. Test the preview with a harmless text question and a sample image/PDF before merging to `main`. Keep the API key secret.


### File converter limits
- Supported input: common browser-readable images, PDF, TXT, Markdown, CSV, JSON, and HTML. Unsupported formats are skipped with a message.
- Output: PDF, PPTX, PNG, and JPEG. A multi-page or multi-file PNG/JPEG export is downloaded as a ZIP.
- For privacy and reliability, current conversion is local-only and each input is limited to 25 MB (60 MB total selection). Some large PDFs may be slow.
- This is not a universal conversion engine: DOCX/XLSX and other specialist formats need dedicated parsers or a secure server-side office conversion service. Do not upload sensitive documents to services you do not trust.
- PDF-to-PDF / image-to-PDF output is rendered for visual fidelity, so text in converted pages may not be searchable or selectable.
\n\n### AI image studio status\n- The page builds a detailed prompt and can copy it to the clipboard, then open ChatGPT for image generation.\n- It does not generate images directly inside this site yet. Direct generation requires a compatible image API and a secure server-side endpoint; never put an API key in `script.js`.\n- Prompts can be creatively flexible, but this is not designed to bypass provider safety controls.\n