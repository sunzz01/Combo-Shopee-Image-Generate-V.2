type GuardDecision = {
  isExternal: boolean;
  shouldBlock: boolean;
  reason: string;
};

const BLOCKED_HOSTS = new Set([
  // AI / image background removal
  'generativelanguage.googleapis.com',
  'api.remove.bg',

  // OAuth / userinfo (should be background-only as well)
  'www.googleapis.com',
  'accounts.google.com',
]);

function tryParseUrl(input: unknown, base?: string): URL | null {
  try {
    if (typeof input === 'string') return new URL(input, base);
    if (input instanceof URL) return input;
    return null;
  } catch {
    return null;
  }
}

function isApiLikeRequest(method: string, headers: HeadersInit | undefined): boolean {
  const m = (method || 'GET').toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') return true;
  if (!headers) return false;

  const h = new Headers(headers as HeadersInit);
  const ct = (h.get('content-type') || '').toLowerCase();
  const auth = h.get('authorization');

  return Boolean(auth) || ct.includes('application/json') || ct.includes('application/x-www-form-urlencoded');
}

function decide(url: URL, method: string, headers?: HeadersInit): GuardDecision {
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
  const isExternal = isHttp && url.origin !== window.location.origin;

  // Only guard external http(s) calls. Ignore chrome-extension/data/blob.
  if (!isExternal) {
    return { isExternal: false, shouldBlock: false, reason: 'same-origin-or-non-http' };
  }

  const apiLike = isApiLikeRequest(method, headers);
  const hostBlocked = BLOCKED_HOSTS.has(url.hostname);

  // Block if:
  // - to known sensitive hosts (AI/OAuth), OR
  // - looks like an API call (non-GET/HEAD, JSON, Authorization) to any external host
  const shouldBlock = hostBlocked || apiLike;
  const reason = hostBlocked ? `blocked-host:${url.hostname}` : apiLike ? 'external-api-like-request' : 'external-non-api';

  return { isExternal: true, shouldBlock, reason };
}

export function installFrontendSecurityGuard() {
  // Avoid double-install in HMR/dev
  const w = window as unknown as { __gimiSecurityGuardInstalled?: boolean };
  if (w.__gimiSecurityGuardInstalled) return;
  w.__gimiSecurityGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = tryParseUrl(input, window.location.href);
    if (url) {
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      const headers = init?.headers || (input instanceof Request ? input.headers : undefined);
      const d = decide(url, method, headers);

      if (d.isExternal) {
        console.warn('[SECURITY] Frontend attempted external request', {
          url: url.toString(),
          method,
          reason: d.reason,
        });
      }

      if (d.shouldBlock) {
        throw new Error(`[SECURITY] Blocked external API call from frontend: ${url.toString()} (${d.reason})`);
      }
    }

    return originalFetch(input, init);
  });

  const OriginalXHR = window.XMLHttpRequest;
  function GuardedXHR(this: XMLHttpRequest) {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open.bind(xhr);
    xhr.open = (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) => {
      const parsed = tryParseUrl(url, window.location.href);
      if (parsed) {
        const d = decide(parsed, method, undefined);
        if (d.isExternal) {
          console.warn('[SECURITY] Frontend attempted external XHR', {
            url: parsed.toString(),
            method,
            reason: d.reason,
          });
        }
        if (d.shouldBlock) {
          throw new Error(`[SECURITY] Blocked external API XHR from frontend: ${parsed.toString()} (${d.reason})`);
        }
      }
      return originalOpen(method, url, async ?? true, username ?? undefined, password ?? undefined);
    };
    return xhr;
  }

  // @ts-expect-error override global constructor
  window.XMLHttpRequest = GuardedXHR;
}

