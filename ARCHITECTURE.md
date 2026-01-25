# System Architecture: Gimi Multi-X PRO

## Overview
The extension uses a **Service-Worker-Centric** architecture to ensure stability, bypass CORS restrictions, and adhere to Manifest V3 security best practices.

## Components

### 1. UI Layer (Side Panel)
- **File**: `src/sidepanel/App.tsx`
- **Role**: Handles user interaction, rendering, and state management.
- **Constraints**: Logic is strictly "dumb". It does not make direct external API calls for analysis.
- **Communication**: Sends formatted messages to the Background worker via `chrome.runtime.sendMessage`.

### 2. Logic Layer (Background Service Worker)
- **File**: `src/background/index.ts`
- **Role**: Acts as the central controller and API gateway.
- **Capabilities**:
    - Listen for `ANALYZE_PRODUCT` and `TEST_API_KEY` messages.
    - Executes business logic in `src/services/aiService.ts`.
    - Makes secure `fetch` requests to `generativelanguage.googleapis.com`.
    - Returns structured data or errors back to the UI.

### 3. Content Scripts
- **File**: `src/content/index.ts`
- **Role**: DOM interaction only (scraping images).
- **Network**: Can fetch images to bypass simple CORS (via `fetch` in content context) if needed, but primarily relies on the Background for heavy lifting.

## Message Protocol

### `ANALYZE_PRODUCT`
- **Input**: `{ apiKey, imageUrl, base64Override? }`
- **Output**: `{ success: true, data: ProductAnalysis }` or `{ success: false, error: string }`

### `TEST_API_KEY`
- **Input**: `{ apiKey }`
- **Output**: `{ success: true, data: { message, model } }`

## Security & Permissions
- **Manifest**: `host_permissions` explicitly allows `https://generativelanguage.googleapis.com/*`.
- **API Keys**: Stored in `localStorage` in the Side Panel (Extension Storage) and passed to the background on demand. usually keys should be in `chrome.storage.local` but localStorage in sidepanel is persistent enough for this use case.

## Why this architecture?
1.  **CORS**: Background workers have privileged network access compared to content scripts or UI pages.
2.  **Stability**: Long-running AI requests won't be interrupted if the user clicks away from the popup (though Side Panel is persistent, this is good practice).
3.  **Clean Code**: Decouples UI code from Business Logic.
