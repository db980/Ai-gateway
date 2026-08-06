# Playground - Chat UI

The Playground provides an interactive chat interface for testing AI models. It supports both **built-in backend models** and **custom external API endpoints**.

## Access

Navigate to **Playground** in the sidebar. You must be logged in.

---

## Using Built-in Models

1. Select a model from the dropdown at the top.
2. Models are tagged with **Free** / **Paid** chips and show their provider name.
3. Type a message and press **Enter** (or click Send).
4. Use the **System Prompt** panel on the right to set the system message.

---

## Using a Custom API

Select **Custom API...** from the top of the model dropdown. A configuration panel appears on the left.

### Fields

| Field | Description | Example |
|---|---|---|
| **Base URL** | The root URL of any OpenAI-compatible chat completions API. | `https://api.openai.com/v1` |
| **API Key** | Your authentication key for the service. | `sk-...` |
| **Model** | The model identifier to use. | `gpt-4o`, `claude-3-opus-20240229`, `llama-3.1-70b` |

### Supported Providers (OpenAI-compatible)

Any API that implements the standard `/chat/completions` endpoint works:

- **OpenAI** — `https://api.openai.com/v1`
- **OpenRouter** — `https://openrouter.ai/api/v1`
- **Ollama** (local) — `http://localhost:11434/v1`
- **Anthropic via proxy** — use an OpenAI-compatible proxy layer
- **Any custom endpoint** that follows the OpenAI chat completions schema

### How It Works

1. The frontend calls your custom endpoint **directly** from your browser — the request does not go through the backend gateway.
2. Your API key stays in your browser's localStorage and is sent only to the endpoint you specify.
3. **Streaming** (real-time token-by-token output) is supported when the toggle is enabled in settings.

### Security Notes

- Your API key is stored in **localStorage** in your browser. It is never sent to the application's backend server.
- Only send your key to endpoints you trust.
- Clear the fields or use **Clear chat** to remove the configuration.

---

## Settings Panel

The left panel contains generation parameters:

| Parameter | Description |
|---|---|
| **Temperature** (0–2) | Controls randomness. Lower = more deterministic. |
| **Top P** (0–1) | Nucleus sampling threshold. |
| **Max Tokens** | Maximum response length. |
| **Streaming** | Toggle real-time streaming output. |
| **JSON Mode** | Request structured JSON output (supported by some models). |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| **Enter** | Send message |
| **Shift+Enter** | New line in input |
