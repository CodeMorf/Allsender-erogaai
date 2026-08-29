# AI Engines & Real OCR Processing Pipeline — ErogaAI SaaS

## Supported Engines (BYOK — Bring Your Own Key)

1. **Google Gemini (Vision AI)**:
   - Default primary engine using model `gemini-2.5-flash` or `gemini-2.5-pro`.
   - Direct image base64 analysis extracting RNC, NCF, ITBIS, Subtotal, Total, Goods vs Services, and Line items.

2. **Groq Llama 3.3 (Ultra-Low Latency)**:
   - High-speed LLM processing via `api.groq.com`.

3. **OpenAI GPT-4o Vision**:
   - High accuracy vision extraction via `api.openai.com/v1/chat/completions`.

4. **CodeMorf Cloud**:
   - Cloud integration status check and telemetry.

5. **Tesseract.js (local free fallback)**:
   - Runs on the ErogaAI server without an external AI API key.
   - Uses the Spanish and English language models (`spa` + `eng`).
   - Supports JPG, PNG and WEBP images. PDF extraction still requires an active AI provider.
   - Returns a conservative confidence score and requires the operator to review fiscal fields before approval.

## Fallback Execution Chain

If a primary provider fails due to timeout, invalid credentials, rate limiting or provider availability, the server automatically attempts extraction with the secondary active providers configured for the organization. If none succeeds, the server uses Tesseract.js for supported image formats. If the local OCR also fails, a clean error is returned. **No fake bills or mock data are ever generated.**

The local OCR worker is reused between requests and its work is serialized to avoid concurrent access to the same worker. Trained language data is cached in `TESSERACT_CACHE_PATH` or, by default, `data/tesseract`.

The complete scanner flow and operational checks are documented in [RECEIPT_SCANNER.md](RECEIPT_SCANNER.md).

## AI Provider Status Testing

`/api/ai/providers/:id/test` returns real connectivity statuses:
- `ONLINE`: Ping successful with exact measured latency in ms.
- `INVALID_KEY`: API Key rejected by provider (HTTP 401).
- `INVALID_MODEL`: Model name not found.
- `RATE_LIMIT`: Quota exceeded (HTTP 429).
- `TIMEOUT`: Request timed out.
- `ERROR`: Unhandled API error.
