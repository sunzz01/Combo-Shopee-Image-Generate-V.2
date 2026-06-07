import { analyzeProduct, testApiKey } from '../services/aiService';
import { removeBackground } from '../services/removeBgService';
import { callPhayaImageGen, pollPhayaJobStatus, callPhayaStandardImageGen, callDalleImageGen, callGoogleImagenGen } from '../services/imageGenService';
import type { MessageType } from '../types';

// Background Service Worker

// Enable opening side panel when clicking the extension icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

type StorageKeys = {
    gemini_api_key?: string;
    remove_bg_api_key?: string;
    selected_model_id?: string;
    phaya_api_key?: string;
    phaya_api_url?: string;
    phaya_mode?: 'standard' | 'nano';
    openai_api_key?: string;
    webapp_url?: string;
};

type RuntimeSendResponse = (response?: unknown) => void;
type PicSellerPayload = Extract<MessageType, { type: 'SEND_TO_PICSELLER' }>['payload'];
type TabChangeInfo = { status?: string };

const getErrorMessage = (error: unknown): string => (
    error instanceof Error ? error.message : String(error)
);

function getFromStorage<T extends keyof StorageKeys>(keys: T[]): Promise<Pick<StorageKeys, T>> {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => resolve(result as Pick<StorageKeys, T>));
    });
}

// Message Handler for AI Operations
chrome.runtime.onMessage.addListener((message: MessageType, _sender: chrome.runtime.MessageSender, sendResponse: RuntimeSendResponse) => {
    if (message.type === 'ANALYZE_PRODUCT') {
        (async () => {
            try {
                const { gemini_api_key, phaya_api_key, phaya_api_url } = await getFromStorage(['gemini_api_key', 'phaya_api_key', 'phaya_api_url']);

                let apiKeyToUse = gemini_api_key;
                let apiUrlToUse = undefined;

                if (message.modelId === 'phaya-ai') {
                    if (!phaya_api_key || phaya_api_key.trim() === '') {
                        throw new Error('❌ ไม่พบ Phaya.io API Key กรุณาไปที่หน้าตั้งค่าและบันทึก API Key ก่อนครับ');
                    }
                    apiKeyToUse = phaya_api_key;
                    apiUrlToUse = phaya_api_url;
                } else {
                    if (!gemini_api_key || gemini_api_key.trim() === '') {
                        throw new Error('❌ ไม่พบ Gemini API Key กรุณาไปที่หน้าตั้งค่าและบันทึก API Key ก่อนครับ');
                    }
                }

                const result = await analyzeProduct(
                    apiKeyToUse!,
                    message.imageUrl,
                    message.base64Override,
                    message.modelId,
                    apiUrlToUse
                );
                sendResponse({ success: true, data: result });
            } catch (error: unknown) {
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();

        return true;
    }


    if (message.type === 'TEST_API_KEY') {
        (async () => {
            try {
                const { gemini_api_key } = await getFromStorage(['gemini_api_key']);
                if (!gemini_api_key || gemini_api_key.trim() === '') {
                    throw new Error('❌ ไม่พบ Gemini API Key กรุณาไปที่หน้าตั้งค่าและบันทึก API Key ก่อนครับ');
                }

                const result = await testApiKey(gemini_api_key);
                sendResponse({ success: true, data: result });
            } catch (error: unknown) {
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();

        return true; // Keep channel open
    }

    if (message.type === 'REMOVE_BACKGROUND') {
        (async () => {
            try {
                const { remove_bg_api_key } = await getFromStorage(['remove_bg_api_key']);
                if (!remove_bg_api_key || remove_bg_api_key.trim() === '') {
                    throw new Error('❌ ไม่พบ Remove.bg API Key กรุณาไปที่หน้าตั้งค่าและบันทึก API Key ก่อนครับ');
                }

                const blob = await removeBackground(remove_bg_api_key, message.imageUrl);
                const base64 = await blobToBase64(blob);
                sendResponse({ success: true, data: base64 });
            } catch (error: unknown) {
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();

        return true; // Keep channel open
    }

    if (message.type === 'CALL_AI_MODEL') {
        (async () => {
            try {
                const { gemini_api_key, selected_model_id } = await getFromStorage(['gemini_api_key', 'selected_model_id']);
                if (!gemini_api_key || gemini_api_key.trim() === '') {
                    throw new Error('❌ ไม่พบ Gemini API Key กรุณาไปที่หน้าตั้งค่าและบันทึก API Key ก่อนครับ');
                }

                const payload = message.payload || {};
                const images: string[] = Array.isArray(payload.images) ? payload.images : [];
                const style: string = typeof payload.style === 'string' ? payload.style : 'Minimalist';
                const language: 'th' | 'en' = payload.language === 'en' ? 'en' : 'th';
                const slideType: string = payload.slideType || 'All types';
                const customPrompt: string = payload.customPrompt || '';
                const requestedModelId = payload.modelId || selected_model_id;

                if (images.length === 0) {
                    throw new Error('❌ ไม่พบรูปภาพสำหรับส่งเข้า AI');
                }

                // Map Model ID to real model name
                const modelMap: Record<string, string> = {
                    'gemini-flash-lite': 'gemini-1.5-flash',
                    'gemini-2-5-flash-lite': 'gemini-2.0-flash-lite-preview-02-05',
                    'gemini-2-5-flash-image': 'gemini-2.0-flash-exp',
                    'gemini-3-pro-image': 'gemini-2.0-pro-exp-02-05',
                    'gemini-3-pro': 'gemini-1.5-pro'
                };

                const modelName = modelMap[requestedModelId || ''] || 'gemini-1.5-flash';

                const parts: Array<Record<string, unknown>> = [
                    {
                        text: `You are an AI assistant for e-commerce sellers.
Analyze the provided product images and generate a highly detailed prompt for an image generation AI (like DALL-E 3 or Imagen 3).
Return STRICT JSON only (no markdown).

Schema:
{
  "prompts": [{"id": number, "type": string, "description": string, "prompt": string}]
}

Context for this request:
- Language: ${language}
- Background Style: ${style}
- Image Type (Slide): ${slideType}
- User's Custom Edit/Adjustment: ${customPrompt}

Rules:
- Focus on the ${slideType} type specifically.
- Incorporate the user's adjustment: "${customPrompt}" into the final prompt.
- The prompt should describe ${style} aesthetics clearly.
- Provide 1 high quality, very descriptive prompt for this specific slide.
- Return it in the "prompts" array.`
                    }
                ];

                for (const dataUrl of images) {
                    const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
                    if (!match) continue;
                    const mimeType = match[1];
                    const data = match[2];
                    parts.push({
                        inline_data: { mime_type: mimeType, data }
                    });
                }

                const resp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${gemini_api_key}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts }]
                        })
                    }
                );

                if (!resp.ok) {
                    const errorData = await resp.json().catch(() => ({}));
                    throw new Error(errorData?.error?.message || `HTTP ${resp.status}`);
                }

                const result = await resp.json();
                const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const cleanText = String(text).replace(/```json|```/g, '').trim();

                let parsed: { prompts?: unknown[]; images?: unknown[]; raw?: string } = {};
                try {
                    parsed = JSON.parse(cleanText);
                } catch {
                    parsed = { prompts: [], images: [], raw: cleanText };
                }

                sendResponse({ success: true, data: parsed, images: parsed.images || [] });
            } catch (error: unknown) {
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();

        return true;
    }

    if (message.type === 'GENERATE_IMAGE') {
        (async () => {
            try {
                const { selected_model_id, openai_api_key, phaya_api_key, phaya_mode } = await getFromStorage(['selected_model_id', 'openai_api_key', 'phaya_api_key', 'phaya_mode']);
                const { prompt, modelId = selected_model_id } = message.payload;
                const effectiveModelId = modelId || '';

                if (effectiveModelId === 'dalle-3') {
                    if (!openai_api_key) throw new Error('❌ ไม่พบ OpenAI API Key กรุณาตั้งค่าก่อนครับ');
                    const imageUrl = await callDalleImageGen(openai_api_key, prompt);
                    sendResponse({ success: true, data: { imageUrl, model: 'dalle-3' } });
                } else if (effectiveModelId === 'phaya-ai') {
                    if (!phaya_api_key) throw new Error('❌ ไม่พบ Phaya.io API Key');
                    const mode = phaya_mode || 'standard';
                    let createResult;
                    if (mode === 'nano') {
                        createResult = await callPhayaImageGen(phaya_api_key, prompt);
                    } else {
                        createResult = await callPhayaStandardImageGen(phaya_api_key, prompt);
                    }
                    const imageUrl = await pollPhayaJobStatus(phaya_api_key, createResult.job_id);
                    sendResponse({ success: true, data: { imageUrl, model: 'phaya-ai' } });
                } else if (effectiveModelId.startsWith('gemini-') || effectiveModelId === 'imagen-3') {
                    // Gemini/Imagen generation via Google API
                    const { gemini_api_key } = await getFromStorage(['gemini_api_key']);
                    if (!gemini_api_key) throw new Error('❌ ไม่พบ Gemini API Key กรุณาตั้งค่าก่อนครับ');

                    const imageUrl = await callGoogleImagenGen(gemini_api_key, prompt, effectiveModelId);
                    sendResponse({ success: true, data: { imageUrl, model: effectiveModelId } });
                } else {
                    throw new Error('ขออภัย โมเดลนี้ยังไม่รองรับการสร้างภาพโดยตรงจาก Extension ในขณะนี้');
                }
            } catch (error: unknown) {
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();
        return true;
    }

    if (message.type === 'GENERATE_IMAGE_PHAYA') {
        (async () => {
            try {
                const { phaya_api_key, phaya_mode } = await getFromStorage(['phaya_api_key', 'phaya_mode']);
                if (!phaya_api_key || phaya_api_key.trim() === '') {
                    throw new Error('❌ ไม่พบ Phaya.io API Key กรุณาไปที่หน้าตั้งค่าและบันทึก API Key ก่อนครับ');
                }

                const { prompt, options } = message.payload;
                const mode = phaya_mode || 'standard';

                // 1. Create Job based on mode
                let createResult;
                if (mode === 'nano') {
                    createResult = await callPhayaImageGen(phaya_api_key, prompt, options);
                } else {
                    createResult = await callPhayaStandardImageGen(phaya_api_key, prompt, options);
                }

                // 2. Poll for status
                const imageUrl = await pollPhayaJobStatus(phaya_api_key, createResult.job_id);

                sendResponse({ success: true, data: { imageUrl, mode } });
            } catch (error: unknown) {
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();

        return true;
    }

    if (message.type === 'SEND_TO_PICSELLER') {
        (async () => {
            try {
                const tabs = await chrome.tabs.query({});
                const { webapp_url } = await getFromStorage(['webapp_url']);

                let targetHost = '';
                if (webapp_url) {
                    try {
                        targetHost = new URL(webapp_url).hostname;
                    } catch (e) {
                        console.error('Invalid webapp_url:', webapp_url, e);
                    }
                }

                // Priority 1: Find by configured Web App URL or localhost (most reliable)
                let targetTab = tabs.find(t => {
                    if (!t.url) return false;
                    if (targetHost && t.url.includes(targetHost)) return true;
                    return t.url.includes('localhost:8080') ||
                           t.url.includes('127.0.0.1:8080') ||
                           t.url.includes('localhost:8081') ||
                           t.url.includes('127.0.0.1:8081') ||
                           t.url.includes('localhost:3001') ||
                           t.url.includes('127.0.0.1:3001');
                });

                // Priority 2: Find by specific title (PicSeller app title)
                if (!targetTab) {
                    targetTab = tabs.find(t =>
                        t.title?.includes('PICSELLER') ||
                        t.title?.includes('PicSeller')
                    );
                }

                // Helper: Convert image URL to Base64 via fetch in background
                const imageUrlToBase64 = async (url: string): Promise<string> => {
                    if (url.startsWith('data:')) return url; // Already base64
                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        return await blobToBase64(blob);
                    } catch (err) {
                        console.warn('[Background] Failed to convert image to Base64:', url, err);
                        return url; // Return original URL as fallback
                    }
                };

                const injectAndSend = async (tabId: number, payload: PicSellerPayload) => {
                    console.log('[Background] Sending data to content script in tab:', tabId);
                    // ใช้ ISOLATED world + content script relay แทน MAIN world injection
                    // เพื่อหลีกเลี่ยงการถูกตรวจจับโดย Anti-Bot ที่ monitor Global Scope
                    try {
                        await chrome.tabs.sendMessage(tabId, {
                            type: 'SEND_TO_PICSELLER',
                            payload: payload
                        });
                    } catch {
                        // Fallback: inject via ISOLATED world (ยังคงปลอดภัยกว่า MAIN)
                        await chrome.scripting.executeScript({
                            target: { tabId },
                            world: 'ISOLATED',
                            func: (data: PicSellerPayload) => {
                                window.postMessage({
                                    type: '__xfer_msg',
                                    detail: data
                                }, window.location.origin);
                            },
                            args: [payload]
                        });
                    }
                };

                if (targetTab?.id) {
                    let payload = message.payload;

                    // SECURITY: Sequential fetch with randomized delay (anti-burst pattern)
                    if (payload.images && Array.isArray(payload.images)) {
                        const base64Images: string[] = [];
                        for (const img of payload.images) {
                            base64Images.push(await imageUrlToBase64(img));
                            // Randomized delay เลียนแบบการเปิดดูทีละรูป
                            await new Promise(r => setTimeout(r, 600 + Math.random() * 1200));
                        }
                        payload = { ...payload, images: base64Images };
                    }

                    // Check if tab is discarded (unloaded by Chrome)
                    if (targetTab.discarded) {
                        // Activate tab to reload it
                        await chrome.tabs.update(targetTab.id, { active: true });
                        if (targetTab.windowId) {
                            await chrome.windows.update(targetTab.windowId, { focused: true });
                        }

                        // Wait for tab to finish loading
                        const waitForLoad = (tabId: number): Promise<void> => {
                            return new Promise((resolve) => {
                                const listener = (updatedTabId: number, info: TabChangeInfo) => {
                                    if (updatedTabId === tabId && info.status === 'complete') {
                                        chrome.tabs.onUpdated.removeListener(listener);
                                        resolve();
                                    }
                                };
                                chrome.tabs.onUpdated.addListener(listener);
                                // Safety timeout
                                setTimeout(() => {
                                    chrome.tabs.onUpdated.removeListener(listener);
                                    resolve();
                                }, 5000);
                            });
                        };

                        await waitForLoad(targetTab.id);
                        await new Promise(r => setTimeout(r, 500)); // Extra delay for React to mount
                    }

                    await injectAndSend(targetTab.id, payload);
                    chrome.tabs.update(targetTab.id, { active: true });
                    if (targetTab.windowId) {
                        chrome.windows.update(targetTab.windowId, { focused: true });
                    }
                    sendResponse({ success: true, opened: false });
                } else {
                    // ไม่พบ tab ของ Webapp → เปิด tab ใหม่แล้วส่งข้อมูลหลัง page load
                    let payload = message.payload;
                    if (payload.images && Array.isArray(payload.images)) {
                        const base64Images: string[] = [];
                        for (const img of payload.images) {
                            base64Images.push(await imageUrlToBase64(img));
                            await new Promise(r => setTimeout(r, 600 + Math.random() * 1200));
                        }
                        payload = { ...payload, images: base64Images };
                    }

                    const defaultUrl = webapp_url || 'http://localhost:8081/';
                    const newTab = await chrome.tabs.create({ url: defaultUrl, active: true });

                    // รอให้ page load เสร็จ
                    const waitForNewTab = (tabId: number): Promise<void> => {
                        return new Promise((resolve) => {
                            const listener = (updatedTabId: number, info: TabChangeInfo) => {
                                if (updatedTabId === tabId && info.status === 'complete') {
                                    chrome.tabs.onUpdated.removeListener(listener);
                                    resolve();
                                }
                            };
                            chrome.tabs.onUpdated.addListener(listener);
                            setTimeout(() => {
                                chrome.tabs.onUpdated.removeListener(listener);
                                resolve();
                            }, 8000);
                        });
                    };

                    if (newTab.id) {
                        await waitForNewTab(newTab.id);
                        await new Promise(r => setTimeout(r, 1000)); // Wait for React to mount
                        await injectAndSend(newTab.id, payload);
                    }

                    sendResponse({ success: true, opened: true });
                }
            } catch (error: unknown) {
                console.error('[Background] Error:', error);
                sendResponse({ success: false, error: getErrorMessage(error) });
            }
        })();
        return true;
    }
});

/**
 * Helper: Convert Blob to Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return `data:${blob.type};base64,${btoa(binary)}`;
}
