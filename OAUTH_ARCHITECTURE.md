# Google OAuth 2.0 Integration - Architecture Documentation

## Overview
This Chrome Extension now uses **Google OAuth 2.0** instead of API keys for Gemini API authentication. This provides better security, automatic token management, and a seamless user experience.

---

## OAuth Flow Diagram

```
┌─────────────┐          ┌──────────────────┐          ┌───────────────┐
│   UI (Side  │          │    Background    │          │  Google OAuth │
│    Panel)   │          │  Service Worker  │          │   + Gemini    │
└──────┬──────┘          └────────┬─────────┘          └───────┬───────┘
       │                          │                            │
       │ 1. User clicks          │                            │
       │ "Login with Google"      │                            │
       │─────────────────────────▶│                            │
       │                          │                            │
       │                          │ 2. chrome.identity.        │
       │                          │    getAuthToken()          │
       │                          │───────────────────────────▶│
       │                          │                            │
       │                          │ 3. OAuth 2.0 token         │
       │                          │◀───────────────────────────│
       │                          │   (cached by Chrome)       │
       │ 4. User profile + token │                            │
       │◀─────────────────────────│                            │
       │                          │                            │
       │ 5. User clicks           │                            │
       │ "Analyze Product"        │                            │
       │─────────────────────────▶│                            │
       │                          │                            │
       │                          │ 6. Get cached token        │
       │                          │    from chrome.identity    │
       │                          │                            │
       │                          │ 7. Call Gemini REST API    │
       │                          │    with Bearer token       │
       │                          │───────────────────────────▶│
       │                          │                            │
       │                          │ 8. Analysis result         │
       │                          │◀───────────────────────────│
       │                          │                            │
       │ 9. Display result        │                            │
       │◀─────────────────────────│                            │
       │                          │                            │
```

---

## Key Components

### 1. Manifest Configuration (`public/manifest.json`)

```json
{
  "permissions": ["identity", "storage", ...],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/generative-language",
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

**Key scopes:**
- `generative-language`: Direct access to Gemini API
- `cloud-platform`: Fallback for broader Google Cloud access

### 2. Authentication Service (`src/services/authService.ts`)

**Functions:**
- `getAuthToken(interactive)`: Gets OAuth token from Chrome
- `refreshAuthToken()`: Forces token refresh by removing cached token
- `loginWithGoogle()`: Complete login flow (token + user info)
- `logoutGoogle()`: Revokes and clears token

**Token Management:**
- Chrome caches tokens automatically
- Tokens are auto-refreshed when expired
- No manual token storage needed

### 3. Background Service Worker (`src/background/index.ts`)

**Message Handlers:**
- `ANALYZE_PRODUCT`: Gets token → Calls Gemini API
- `TEST_AUTH`: Tests OAuth connectivity
- `REMOVE_BACKGROUND`: Still uses API key (Remove.bg doesn't support OAuth)

**Auto-retry Logic:**
```typescript
try {
  let token = await getAuthToken(false);
  const result = await analyzeProduct(token, imageUrl);
} catch (error) {
  if (error is 401/403) {
    token = await refreshAuthToken(); // Auto-refresh
    const result = await analyzeProduct(token, imageUrl);
  }
}
```

### 4. AI Service (`src/services/aiService.ts`)

**Changes:**
- Replaced `@google/generative-ai` SDK with direct REST API calls
- Uses `Authorization: Bearer {token}` header
- Calls: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Why REST instead of SDK:**
- The official SDK expects API keys, not OAuth tokens
- REST API provides full OAuth 2.0 support
- More control over request/response handling

---

## Security Benefits

1. **No API Key Exposure**: API keys never stored in extension or localStorage
2. **Automatic Expiration**: Tokens expire after ~1 hour (Google manages this)
3. **Revocable**: Users can revoke access from Google Account settings
4. **Scoped Access**: Extension only gets permissions user explicitly grants
5. **User Context**: API calls are tied to logged-in Google Account

---

## Setup Instructions

### For Developers:

1. **Create OAuth Client ID:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Select your project (Animal-ASMR)
   - Create OAuth 2.0 Client ID
   - Choose "Chrome Extension" as application type
   - Enter your Extension ID (from `chrome://extensions`)

2. **Enable APIs:**
   - Enable "Generative Language API" in [API Library](https://console.cloud.google.com/apis/library)
   - Enable "Cloud Platform" (optional, for broader access)

3. **Add Test Users** (during development):
   - Go to OAuth Consent Screen
   - Add your Gmail to "Test users" list

4. **Update manifest.json:**
   - Paste your Client ID into `oauth2.client_id`

5. **Build and reload:**
   ```bash
   npm run build
   ```
   - Load unpacked extension from `dist/` folder
   - Refresh extension in `chrome://extensions`

### For Users:

1. Click "เชื่อมต่อกับ Google" in Settings tab
2. Approve permissions in Google OAuth screen
3. Use extension normally (no API keys needed)

---

## Troubleshooting

### Error: "OAuth2 request failed: bad client id"
**Solution:** Client ID in manifest.json doesn't match the one in Google Cloud Console

### Error: "PERMISSION_DENIED" or "403"
**Solution:** Generative Language API not enabled in your Google Cloud project

### Error: "Access blocked: This app's request is invalid"
**Solution:** Your Gmail is not in the "Test users" list (for development apps)

### Token expired/invalid during analysis
**Solution:** Auto-handled by the background worker (refresh logic)

---

## Production Checklist

- [x] OAuth scopes configured correctly
- [x] Auto token refresh implemented
- [x] Error handling for all auth states
- [x] User profile display in UI
- [x] Logout functionality
- [x] No API keys in codebase
- [ ] OAuth Consent Screen verified by Google (for public release)
- [ ] Extension published to Chrome Web Store

---

## API Key Migration Note

**Remove.bg still uses API keys** because their service doesn't support OAuth 2.0. This is intentional and secure because:
- Remove.bg keys are separate from Google
- Keys stored in localStorage (extension-only scope)
- Not exposed to web pages

---

## Testing Workflow

1. **Login Test:**
   - Open Settings tab
   - Click "เชื่อมต่อกับ Google"
   - Verify profile displays correctly

2. **Connection Test:**
   - Click "ทดสอบการเชื่อมต่อ" button
   - Should see success message with model name

3. **Analysis Test:**
   - Upload or scan an image
   - Click "วิเคราะห์" button
   - Verify analysis completes without API key

4. **Logout Test:**
   - Click logout icon
   - Verify profile disappears
   - Verify analysis fails with "Please login" prompt

---

## Performance Notes

- **Token caching:** Chrome manages token cache, no network call needed for repeated requests
- **Token lifespan:** ~60 minutes (Google managed)
- **Auto-refresh latency:** ~500ms when token expires (one-time per hour)
- **No quota impact:** OAuth doesn't change Gemini API quota limits

---

## Future Enhancements

1. **Service Account Support:** For server-side deployments
2. **Multi-account:** Allow switching between Google accounts
3. **Offline Mode:** Cache results when network unavailable
4. **Analytics:** Track API usage per account

---

**Last Updated:** 2026-01-22
**Architecture Version:** 2.0 (OAuth-first)
