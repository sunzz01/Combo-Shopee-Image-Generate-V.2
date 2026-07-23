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
    gemini_gem_url?: string;
    gemini_chat_url?: string;
    chatgpt_url?: string;
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

type AiChatPayload = Extract<MessageType, { type: 'SEND_TO_AI_CHAT' }>['payload'];
type AiChatAttachment = { dataUrl: string; name: string };

const waitForTabComplete = (tabId: number, timeoutMs = 10000): Promise<void> => new Promise((resolve) => {
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
    }, timeoutMs);
});

const isAiAccessError = (error: unknown): boolean =>
    /cannot access contents|manifest must request permission|permission/i.test(getErrorMessage(error));

const getAiPermissionOrigin = (destination: AiChatPayload['destination']): string =>
    destination === 'chatgpt' ? 'https://chatgpt.com/*' : 'https://gemini.google.com/*';

const createAiHandoff = (payload: AiChatPayload): string => {
    const imageList = payload.images.length
        ? payload.images.map((url, index) => `${index + 1}. ${url}`).join('\n')
        : '(ไม่มีลิงก์รูป)';
    const features = payload.keyFeatures?.length ? payload.keyFeatures.map(feature => `- ${feature}`).join('\n') : '- กรุณาวิเคราะห์จากข้อมูลและรูปที่ให้';
    const price = payload.price?.display || (typeof payload.price?.current === 'number'
        ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: payload.price.currency || 'THB' }).format(payload.price.current)
        : '(ไม่พบราคา)');
    const variants = payload.variantGroups?.length
        ? payload.variantGroups.map(group => `- ${group.name}: ${group.options.map(option => `${option.label}${option.price?.display ? ` (${option.price.display})` : ''}`).join(', ')}`).join('\n')
        : '- (ไม่พบตัวเลือกสินค้า)';

    return `คุณคือผู้กำกับภาพสินค้า e-commerce สำหรับ Shopee Thailand

เป้าหมายหลัก: สร้างภาพจริงเพียง 1 ภาพ เป็นภาพคอมโพสิต 3x3 แบบ 9-in-1 บนแคนวาสสี่เหลี่ยม 1:1 ไม่ใช่ภาพปก 3 แบบ ไม่ใช่ Prompt 3 ชุด และไม่ใช่ภาพ 9 ไฟล์แยกกัน

ให้วิเคราะห์ข้อมูลสินค้าและรูปอ้างอิง แล้วสร้างภาพเดียวที่แบ่งเป็น 9 ช่องเท่ากันอย่างชัดเจน โดยใช้สินค้ารุ่นเดียวกันในทุกช่อง โครงสร้างต้องเป็น Thai High-Information E-commerce Design คล้ายแนวทาง GEM แต่ต้องรักษาสินค้าจริงเป็นศูนย์กลางและไม่ทำให้ภาพดูเหมือนโปสเตอร์ที่มีกรอบหนา

โครงสร้าง 9 ช่อง:
1. Cover Hero — สินค้าเด่น มุมสามส่วน ฉากขายสินค้า แสงโฆษณา
2. Product Anatomy — แสดงส่วนประกอบและรายละเอียดของสินค้าจริง
3. Specification and Scale — แสดงมุมสินค้าและเทียบสเกลกับมือคนหรือ iPhone โดยใช้เฉพาะขนาดที่ยืนยัน
4. Material Macro — แสดงวัสดุ ผิวสัมผัส รูยึด รอยต่อ และงานประกอบ
5. Feature in Action — แสดงการใช้งานหรือการติดตั้งที่ถูกต้องตามข้อมูล
6. Problem and Solution — แสดงปัญหาที่สินค้าช่วยแก้โดยไม่แต่งผลลัพธ์
7. Thai Lifestyle Use — แสดงบริบทการใช้งานจริงในฉากไทยที่เหมาะกับสินค้า
8. Package and Contents — แสดงสินค้าและสิ่งที่ได้รับตามภาพอ้างอิงเท่านั้น
9. Alternate Product Hero — ภาพปิดท้ายอีกมุมหนึ่งที่เน้นความน่าใช้และประโยชน์จริง

กฎภาพรวม:
- แคนวาสรวมเป็นภาพเดียว 1:1 แบ่ง 3 คอลัมน์ x 3 แถว ช่องเท่ากันและไม่ซ้อนทับกัน
- ใช้แสง โทนสี และสไตล์ร่วมกันทั้ง 9 ช่อง แต่ให้แต่ละช่องมีหน้าที่และมุมภาพแตกต่างกัน
- รักษารูปทรง สี วัสดุ โลโก้ ฉลาก จำนวน และสัดส่วนสินค้าจากภาพอ้างอิงให้ใกล้เคียงที่สุด
- ห้ามเพิ่มสินค้า อุปกรณ์ สี รุ่น ขนาด ราคา โปรโมชัน หรือคุณสมบัติที่ไม่มีข้อมูลยืนยัน
- หากไม่มีขนาดจริง ให้ใช้มือคนหรือ iPhone เป็นตัวเทียบ ห้ามเดาตัวเลข
- ห้ามมีกรอบหนา แผงข้อมูลด้านข้าง UI ของ Shopee ปุ่มปลอม watermark หรือองค์ประกอบแพลตฟอร์ม
- ห้ามสร้างตัวอักษรสุ่ม ภาษาต่างดาว หรือข้อความที่ไม่ได้ให้ไว้ หากจำเป็นต้องมีข้อความ ให้ใช้เฉพาะภาษาไทยสั้น ๆ จากข้อมูลยืนยันและต้องไม่บังสินค้า
- รักษา product identity เดียวกันทุกช่อง และห้ามทำให้จำนวนสินค้าในแพ็กเกจเปลี่ยน
- หากไม่สามารถสร้างข้อความไทยให้ถูกต้อง ให้เน้นภาพและเว้นพื้นที่สะอาดแทนข้อความ

ใช้เฉพาะข้อมูลในส่วนชื่อ รายละเอียด จุดเด่น ราคา และตัวเลือกสินค้า ห้ามนำข้อความระบบหรือเมนูมาสรุปเป็นข้อมูลสินค้า

ข้อมูลสินค้า
ชื่อ: ${payload.productName || '(ไม่พบชื่อสินค้า)'}
รายละเอียด: ${payload.productDesc || '(ไม่พบรายละเอียด)'}
ราคายืนยัน: ${price}
ตัวเลือกสินค้า:
${variants}
จุดเด่น:
${features}
ลิงก์หน้าสินค้าต้นทาง: ${payload.productUrl || '(ไม่มีลิงก์)'}
ลิงก์รูปอ้างอิง:
${imageList}

ให้สร้างภาพ 3x3 9-in-1 นี้ทันทีจากรูปอ้างอิงทั้งหมด และอย่าส่งกลับมาเป็นเพียงคำอธิบายหรือ Prompt หลายชุด`;
};

async function prepareAiChatAttachments(imageUrls: string[]): Promise<AiChatAttachment[]> {
    const attachments: AiChatAttachment[] = [];
    // รองรับห้ารูปที่ผู้ใช้เลือก เพื่อไม่ให้ข้อความระหว่าง extension กับหน้าแชตมีขนาดใหญ่เกินไป
    for (const [index, imageUrl] of imageUrls.slice(0, 5).entries()) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error('ไม่ใช่ไฟล์รูปภาพ');
            const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
            attachments.push({
                dataUrl: await blobToBase64(blob),
                name: `product-reference-${index + 1}.${extension}`
            });
        } catch (error) {
            console.warn('[Background] ไม่สามารถเตรียมรูปสำหรับ AI chat:', imageUrl, error);
        }
    }
    return attachments;
}

async function sendToAiChat(payload: AiChatPayload): Promise<{ opened: boolean; attachedImages: number }> {
    const key = payload.destination === 'gemini'
        ? 'gemini_gem_url'
        : payload.destination === 'gemini-chat'
            ? 'gemini_chat_url'
            : 'chatgpt_url';
    const fallbackUrl = payload.destination === 'chatgpt'
        ? 'https://chatgpt.com/'
        : 'https://gemini.google.com/app';
    const stored = await getFromStorage([key]);
    const targetUrl = (stored[key] || fallbackUrl).trim();
    if (!targetUrl) {
        throw new Error(`กรุณาใส่ URL ของ ${payload.destination === 'gemini' ? 'Google Gem' : payload.destination === 'gemini-chat' ? 'Gemini Chat' : 'ChatGPT'} ในหน้าตั้งค่าก่อนครับ`);
    }
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(targetUrl);
    } catch {
        throw new Error('URL ปลายทางไม่ถูกต้อง กรุณาตรวจสอบในหน้าตั้งค่า');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('รองรับเฉพาะ URL ที่ขึ้นต้นด้วย http:// หรือ https://');
    }

    // Check the effective permission in the service worker as well. This catches
    // an old unpacked build or a user-revoked site access before executeScript
    // emits Chrome's opaque "Cannot access contents of the page" error.
    const permissionOrigin = getAiPermissionOrigin(payload.destination);
    const hasPermission = await chrome.permissions.contains({ origins: [permissionOrigin] });
    if (!hasPermission) {
        const destinationName = payload.destination === 'chatgpt'
            ? 'ChatGPT'
            : payload.destination === 'gemini-chat' ? 'Gemini Chat' : 'Google Gem';
        throw new Error(`ยังไม่ได้รับสิทธิ์เข้าถึง ${destinationName} กรุณาเปิด chrome://extensions กด Reload ที่ Gimi Shopee X แล้วกดส่งอีกครั้ง`);
    }

    const tabs = await chrome.tabs.query({});
    const gemId = payload.destination !== 'chatgpt'
        ? parsedUrl.pathname.match(/\/gem\/([^/]+)/)?.[1]
        : undefined;
    let targetTab = tabs.find(tab => {
        if (!tab.url) return false;
        if (tab.url.startsWith(targetUrl)) return true;
        // Google may normalize a Custom Gem URL to /u/0/gem/<id> after login.
        // Match the stable Gem id so we reuse the right tab instead of opening
        // a second tab with a stale URL.
        if (!gemId) return false;
        try {
            const tabUrl = new URL(tab.url);
            return tabUrl.origin === parsedUrl.origin && tabUrl.pathname.includes(`/gem/${gemId}`);
        } catch {
            return false;
        }
    });
    let opened = false;
    if (!targetTab?.id) {
        targetTab = await chrome.tabs.create({ url: targetUrl, active: true });
        opened = true;
        if (targetTab.id) await waitForTabComplete(targetTab.id);
        await new Promise(resolve => setTimeout(resolve, 700));
    }
    if (!targetTab?.id) throw new Error('ไม่สามารถเปิดแท็บปลายทางได้');

    const handoff = createAiHandoff(payload);
    const attachments = await prepareAiChatAttachments(payload.images);
    const injectIntoTab = (tabId: number) => chrome.scripting.executeScript({
        target: { tabId },
        func: async (text: string, imageFiles: AiChatAttachment[]) => {
            const selectors = [
                '#prompt-textarea',
                'textarea[placeholder*="Message"]',
                'textarea[placeholder*="ถาม"]',
                '[contenteditable="true"][role="textbox"]',
                '[contenteditable="true"]'
            ];
            const input = selectors.map(selector => document.querySelector(selector)).find(Boolean) as HTMLElement | null;
            if (!input) return { inserted: false, attachedImages: 0 };
            input.focus();
            if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
                input.value = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                input.textContent = text;
                input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
            }
            let fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
            // Gemini ซ่อน input ไฟล์ไว้จนผู้ใช้กดปุ่ม "เพิ่มไฟล์" / "อัปโหลด"
            if (!fileInput && imageFiles.length > 0) {
                const attachButton = Array.from(document.querySelectorAll('button')).find((button) => {
                    const label = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''} ${button.textContent || ''}`.toLowerCase();
                    return label.includes('เพิ่มไฟล์') || label.includes('อัปโหลด') || label.includes('แนบ') || label.includes('upload') || label.includes('attach');
                }) as HTMLButtonElement | undefined;
                attachButton?.click();
                await new Promise(resolve => setTimeout(resolve, 250));
                fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
            }
            if (!fileInput || imageFiles.length === 0) return { inserted: true, attachedImages: 0 };
            const transfer = new DataTransfer();
            for (const image of imageFiles) {
                const [header, encoded] = image.dataUrl.split(',', 2);
                const mimeType = /^data:(.*?);base64$/.exec(header)?.[1] || 'image/png';
                const binary = atob(encoded);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                transfer.items.add(new File([bytes], image.name, { type: mimeType }));
            }
            fileInput.files = transfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            return { inserted: true, attachedImages: imageFiles.length };
        },
        args: [handoff, attachments]
    });
    let injection;
    try {
        injection = await injectIntoTab(targetTab.id);
    } catch (error) {
        // A tab opened before the permission/build update can retain a stale
        // restricted state. Retry once in a fresh Gemini/ChatGPT tab.
        if (!isAiAccessError(error)) throw error;
        const retryTab = await chrome.tabs.create({ url: targetUrl, active: true });
        if (!retryTab.id) throw error;
        opened = true;
        await waitForTabComplete(retryTab.id);
        await new Promise(resolve => setTimeout(resolve, 1200));
        try {
            injection = await injectIntoTab(retryTab.id);
            targetTab = retryTab;
        } catch {
            const destinationName = payload.destination === 'chatgpt'
                ? 'ChatGPT'
                : payload.destination === 'gemini-chat' ? 'Gemini Chat' : 'Google Gem';
            throw new Error(`Chrome ยังไม่อนุญาตให้ Extension อ่านหน้า ${destinationName} กรุณาเปิด chrome://extensions → Gimi Shopee X → รายละเอียด → Site access แล้วเลือก Allow on ${destinationName === 'ChatGPT' ? 'chatgpt.com' : 'gemini.google.com'} จากนั้น Reload Extension`);
        }
    }
    if (!injection[0]?.result?.inserted) {
        throw new Error('เปิดหน้า AI แล้ว แต่ยังไม่พบช่องพิมพ์ โปรดล็อกอินหรือคลิกช่องพิมพ์ก่อน แล้วลองส่งอีกครั้ง');
    }
    await chrome.tabs.update(targetTab.id, { active: true });
    return { opened, attachedImages: injection[0]?.result?.attachedImages || 0 };
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

    if (message.type === 'SEND_TO_AI_CHAT') {
        (async () => {
            try {
                const result = await sendToAiChat(message.payload);
                sendResponse({ success: true, ...result });
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
