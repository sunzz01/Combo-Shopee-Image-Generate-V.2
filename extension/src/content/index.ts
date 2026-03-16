import type { MessageType, ScannedImage } from '../types';

console.log('Gimi Multi-X Content Script Running');

// Listen for messages from Side Panel
chrome.runtime.onMessage.addListener((message: MessageType, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === 'PING') {
        sendResponse({ status: 'PONG' });
    }

    if (message.type === 'SCAN_IMAGES') {
        const imageList: ScannedImage[] = [];

        // --- PART 1: TEXT SCRAPING ---
        let scrapedName = '';
        let scrapedDesc = '';

        // 1.1 Helper to find input by label/placeholder
        const findInputByKeyword = (keywords: string[]): string => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
            for (const input of inputs) {
                const el = input as HTMLInputElement | HTMLTextAreaElement;
                const label = document.querySelector(`label[for="${el.id}"]`);
                const labelText = label?.textContent || '';
                const placeholder = el.getAttribute('placeholder') || '';

                // Shopee specific: Check modelvalue attribute
                const modelValue = el.getAttribute('modelvalue');

                if (keywords.some(k => labelText.includes(k) || placeholder.includes(k))) {
                    // Prioritize modelvalue if present (Shopee Vue component style)
                    if (modelValue) return modelValue;
                    return el.value;
                }
            }
            return '';
        };

        // 1.2 Try finding via "Shopee Seller" style inputs first (Prioritize User Inputs)
        scrapedName = findInputByKeyword(['ชื่อสินค้า', 'Product Name', 'ชื่อแบรนด์', 'ประเภทสินค้า']);
        scrapedDesc = findInputByKeyword(['รายละเอียดสินค้า', 'Product Description', 'รายละเอียด']);

        // 1.3 Fallback: Try standard e-commerce page structure
        if (!scrapedName) {
            // Common Product Title Selectors
            const h1 = document.querySelector('h1') || document.querySelector('.product-title') || document.querySelector('.QA7i7S') /* Shopee Title Class */;
            if (h1) scrapedName = h1.textContent?.trim() || '';
        }

        if (!scrapedDesc) {
            // Common Description Selectors or Meta Tag
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) scrapedDesc = metaDesc.getAttribute('content') || '';

            // Try Shopee/Lazada Description Containers
            if (!scrapedDesc) {
                const descContainer = document.querySelector('.product-detail') || document.querySelector('.IR3_1O') /* Shopee Desc */;
                if (descContainer) scrapedDesc = descContainer.textContent?.trim() || '';
            }
        }

        console.log('✅ Scraped Content:', { scrapedName, scrapedDesc });


        // --- PART 2: IMAGE SCANNING ---
        // Helper: Clean and upscale image URLs
        const cleanImageUrl = (url: string) => {
            if (!url || typeof url !== 'string') return null;
            let clean = url;
            if (clean.startsWith('//')) clean = 'https:' + clean;
            if (clean.startsWith('/')) clean = window.location.origin + clean;

            // Shopee: Remove thumbnail/resize suffixes
            // Example: ..._tn, ..._v1, ..._xx.jpg_200x200
            clean = clean.replace(/(_tn|_v1|_\d+x\d+).*/, '');

            // Lazada: Remove size suffixes like _120x120q80.jpg
            clean = clean.replace(/_\d+x\d+.*\.jpg$/, '.jpg');
            clean = clean.replace(/_\d+x\d+.*\.png$/, '.png');

            // TikTok: Often has specific patterns, but raw URLs usually work

            return clean;
        };

        const addImage = (src: string, width: number, height: number, alt: string) => {
            const cleaned = cleanImageUrl(src);
            if (cleaned && cleaned.startsWith('http')) {
                imageList.push({
                    src: cleaned,
                    width: width || 0,
                    height: height || 0,
                    alt: alt || ''
                });
            }
        };

        // 1. Scan direct <img> tags including lazy sources
        document.querySelectorAll('img').forEach(img => {
            const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('lazy-src');
            if (src) addImage(src, img.naturalWidth, img.naturalHeight, img.alt);
        });

        // 2. Scan CSS Background Images
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
                const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                if (match && match[1]) {
                    addImage(match[1], (el as HTMLElement).offsetWidth, (el as HTMLElement).offsetHeight, 'BG');
                }
            }
        });

        // 3. Scan Network Requests (Performance Observer)
        const perfImages = performance.getEntriesByType('resource')
            .filter(r => (r as any).initiatorType === 'img' || r.name.match(/\.(jpg|jpeg|png|webp|avif)/i))
            .map(r => r.name);
        perfImages.forEach(src => addImage(src, 0, 0, 'Network'));

        // 4. Scan TikTok/Meta specific attributes
        document.querySelectorAll('[style*="background-image"]').forEach(el => {
            const bg = (el as HTMLElement).style.backgroundImage;
            const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1]) addImage(match[1], (el as HTMLElement).offsetWidth, (el as HTMLElement).offsetHeight, 'Style BG');
        });

        // Unique filter + High fidelity priority
        const uniqueMap = new Map<string, ScannedImage>();
        imageList.forEach(item => {
            const existing = uniqueMap.get(item.src);
            // Prefer items with actual dimensions if possible
            if (!existing || (item.width > existing.width)) {
                uniqueMap.set(item.src, item);
            }
        });

        const finalImages = Array.from(uniqueMap.values())
            .filter(img => {
                // Ignore small trackers/icons
                const isTracker = img.src.includes('analytics') || img.src.includes('pixel') || img.src.includes('tracker');
                return !isTracker && !img.src.includes('data:image');
            });

        sendResponse({
            status: 'OK',
            images: finalImages,
            content: {
                productName: scrapedName,
                productDescription: scrapedDesc
            }
        });
    }

    if (message.type === 'FETCH_IMAGE_BASE64') {
        const fetchAndConvert = async (url: string) => {
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (err) {
                console.error('Content script fetch failed:', err);
                throw err;
            }
        };

        if (message.imageUrl) {
            fetchAndConvert(message.imageUrl)
                .then(base64 => sendResponse({ status: 'OK', base64 }))
                .catch(err => sendResponse({ status: 'ERROR', message: err.message }));
            return true; // Keep channel open
        }
    }

    if (message.type === 'SEND_TO_SHOPEE_MASTER') {
        console.log('[Content Script] Received SEND_TO_SHOPEE_MASTER:', message.payload);
        // Method 1: CustomEvent
        const event = new CustomEvent('SHOPEE_X_DATA_TRANSFER', {
            detail: message.payload
        });
        console.log('[Content Script] Dispatching custom event to window');
        window.dispatchEvent(event);

        // Method 2: postMessage (Backup)
        window.postMessage({
            type: 'SHOPEE_X_DATA_TRANSFER',
            detail: message.payload
        }, '*');

        console.log('[Content Script] Event dispatched successfully via both methods');
        sendResponse({ status: 'OK' });
    }
});
