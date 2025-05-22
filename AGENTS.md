# Project Overview

This repository contains a minimal Node.js server and a small frontend that demonstrate an AI‑based home remodeling assistant. The codebase is designed for rapid prototyping and easy deployment to Google Cloud Run.

## Repository Structure

- **`server.ts`** – HTTP server that exposes API routes and serves static files. The server includes:
  - `/api/store/` routes for saving and retrieving text snippets.
  - `/api/proxy/` for forwarding requests to external services with environment variable interpolation and host allow‑listing.
  - `/api/gemini-key` and `/api/vetted-key` to provide API keys to the frontend.
  - Fallback static file handling for all files under `public/`.
- **`public/`** – Client application with `index.html`, `style.css`, and `main.js`.
  - `main.js` manages the chat UI, tracks uploaded images and conversation history, and orchestrates calls to Gemini models and the Vetted product API.
- **`scripts/`** – Shell scripts for deploying to and removing from Cloud Run.
- **`example.env`** – Sample environment variables showing required API keys and proxy host restrictions.

## Key Concepts

### Server

`server.ts` uses only built‑in Node modules. The proxy route filters headers and replaces `${VAR}` placeholders using `interpolateEnvVars` while checking `${VAR}_ACCESS` to prevent leaking secrets:
```ts
function interpolateEnvVars(value: string, host: string): string {
  return value.replaceAll(/\$\{(.+?)\}/g, (value, envVarName) => {
    const envVarValue = process.env[envVarName];
    const envVarAccess = process.env[`${envVarName}_ACCESS`];
    const envVarAllowed =
      envVarValue !== undefined &&
      (envVarAccess === undefined || envVarAccess === "*" ||
       envVarAccess.split(",").includes(host));
    if (envVarValue === undefined) {
      console.error(`Interpolation error: "${envVarName}" value not defined`);
      return value;
    }
    if (envVarAllowed === false) {
      console.error(
        `Interpolation error: "${envVarName}" value not allowed for host "${host}"`
      );
      return value;
    }
    return envVarValue;
  });
}
```
This ensures only approved hosts receive injected secrets.

### Frontend

`public/main.js` holds most of the client logic. Two objects manage state:
- `imageState` tracks the original upload, generated redesigns, any pasted image, and the current selection for editing.
- `conversationManager` records chat history and formats messages for the Gemini API.

When the user submits a message, the script:
1. Determines which image to attach based on `imageState`.
2. Builds a request containing conversation history and optional image data.
3. Calls the orchestrator model to decide whether to generate a new design or search for products.
4. Executes any returned function calls (image generation or product search) and updates the UI.

### Environment Variables

`example.env` lists the required variables. Each secret has an `_ACCESS` entry specifying allowed hosts:
```env
OPENAI_API_KEY_ACCESS=api.openai.com
GEMINI_API_KEY_ACCESS=generativelanguage.googleapis.com
VETTED_API_KEY_ACCESS=api.vetted.ai
```
These values control which services the proxy may contact using the respective tokens.

## Development

1. Populate `.env` from `example.env` (the project uses 1Password: `op inject -i example.env -o .env`).
2. Start the server with `npm run dev` and open `http://localhost:8080`.
3. Upload a room photo and interact with the chat UI.
4. Deploy to Cloud Run with `npm run deploy` or remove the service with `npm run undeploy`.

## Comment on Prompts
The prompts are all placeholders to streamline the code and will be re-added once the code is cleaned up.

## Next Steps

- Review `public/main.js` to learn how the Gemini models and product search flow are orchestrated.
- Explore the proxy mechanism in `server.ts` if you need to connect additional services.
- Check the deployment scripts under `scripts/` to understand how environment variables and storage are configured for Cloud Run.
