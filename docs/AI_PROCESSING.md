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

## Fallback Execution Chain

If a primary provider fails due to timeout or rate limit, the server automatically attempts real extraction with secondary active providers configured for the organization. If all providers fail, a clean error is returned. **No fake bills or mock data are ever generated.**

## AI Provider Status Testing

`/api/ai/providers/:id/test` returns real connectivity statuses:
- `ONLINE`: Ping successful with exact measured latency in ms.
- `INVALID_KEY`: API Key rejected by provider (HTTP 401).
- `INVALID_MODEL`: Model name not found.
- `RATE_LIMIT`: Quota exceeded (HTTP 429).
- `TIMEOUT`: Request timed out.
- `ERROR`: Unhandled API error.
