export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

/**
 * Gets a fresh OAuth token from Chrome Identity API
 * This token is cached by Chrome and auto-refreshed when needed
 */
export const getAuthToken = (interactive: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (result: string | { token?: string }) => {
            const token = typeof result === 'string' ? result : result?.token;

            if (chrome.runtime.lastError || !token) {
                return reject(new Error(chrome.runtime.lastError?.message || 'Failed to get auth token'));
            }

            resolve(token as string);
        });
    });
};

/**
 * Forces a token refresh by removing cached token and getting a new one
 */
export const refreshAuthToken = async (): Promise<string> => {
    try {
        const oldToken = await getAuthToken(false);
        await new Promise<void>((resolve) => {
            chrome.identity.removeCachedAuthToken({ token: oldToken }, () => resolve());
        });
    } catch {
        console.log('No cached token to remove');
    }

    return getAuthToken(true);
};

/**
 * Complete login flow: gets token + user info
 */
export const loginWithGoogle = async (): Promise<{ user: GoogleUser; token: string }> => {
    const token = await getAuthToken(true);

    // Fetch user info using the token
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user info');
    }

    const user = await response.json();

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture
        },
        token
    };
};

/**
 * Logout: revokes token and clears cache
 */
export const logoutGoogle = async (token: string): Promise<void> => {
    return new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ token }, () => {
            // Also revoke the token via Google's API to be thorough
            fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
                .finally(() => resolve());
        });
    });
};
