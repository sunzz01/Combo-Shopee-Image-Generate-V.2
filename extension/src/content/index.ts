import type { MessageType, ProductPrice, ProductVariantGroup, ScannedImage } from '../types';

// ===== SECURITY: Honeypot Detection =====
// ตรวจสอบว่า element มองเห็นได้จริง ไม่ใช่กับดัก (honeypot)
const isElementVisible = (el: HTMLElement): boolean => {
    try {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity) > 0.1 &&
            rect.width > 10 && rect.height > 10 &&   // ไม่ใช่ tracker pixel 1x1
            rect.top > -200 && rect.left > -200 &&     // ไม่ได้ซ่อนนอกจอ
            rect.bottom > 0 && rect.right > 0
        );
    } catch {
        return false;
    }
};

// ===== SECURITY: Tracker URL Detection =====
const isTrackerUrl = (url: string): boolean => {
    const trackerPatterns = [
        'analytics', 'pixel', 'tracker', 'beacon',
        'collect', 'log', 'stat', 'metric',
        'data:image', '.gif', '1x1', 'blank.png',
        'facebook.com/tr', 'google-analytics',
        'doubleclick', 'adsense'
    ];
    const lowerUrl = url.toLowerCase();
    return trackerPatterns.some(p => lowerUrl.includes(p));
};

const toNumber = (value: unknown): number | undefined => {
    const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(numeric) || numeric < 0) return undefined;
    // Shopee item data often stores Thai Baht in 1/100,000 units.
    return numeric >= 1_000_000 ? numeric / 100_000 : numeric;
};

const makePrice = (values: unknown[], currency = 'THB', original?: unknown): ProductPrice | undefined => {
    const prices = values.map(toNumber).filter((value): value is number => value !== undefined && value > 0);
    if (!prices.length) return undefined;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const originalValue = toNumber(original);
    const display = min === max
        ? `฿${min.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`
        : `฿${min.toLocaleString('th-TH', { maximumFractionDigits: 2 })} - ฿${max.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
    return { currency, current: min === max ? min : undefined, min, max, original: originalValue, display };
};

const findCatalogNode = (value: unknown, depth = 0): Record<string, any> | undefined => {
    if (!value || typeof value !== 'object' || depth > 10) return undefined;
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findCatalogNode(item, depth + 1);
            if (found) return found;
        }
        return undefined;
    }
    const node = value as Record<string, any>;
    if (Array.isArray(node.tier_variations) && (Array.isArray(node.models) || node.price !== undefined || node.price_min !== undefined)) return node;
    for (const child of Object.values(node)) {
        const found = findCatalogNode(child, depth + 1);
        if (found) return found;
    }
    return undefined;
};

const extractCatalog = (value: unknown): { price?: ProductPrice; variantGroups: ProductVariantGroup[] } => {
    const item = findCatalogNode(value);
    if (!item) return { variantGroups: [] };
    const models = Array.isArray(item.models) ? item.models : [];
    const price = makePrice([item.price, item.price_min, item.price_max, ...models.map((model: any) => model.price)], item.currency || 'THB', item.price_before_discount);
    const variantGroups = (Array.isArray(item.tier_variations) ? item.tier_variations : [])
        .slice(0, 3)
        .map((tier: any, tierIndex: number): ProductVariantGroup | null => {
            const options = Array.isArray(tier.options) ? tier.options : [];
            const mapped = options.map((label: unknown, optionIndex: number) => {
                const matchingModels = models.filter((model: any) => Number(model?.tier_index?.[tierIndex]) === optionIndex);
                const optionPrice = makePrice(matchingModels.map((model: any) => model.price), item.currency || 'THB');
                const stockValues = matchingModels.map((model: any) => Number(model.stock)).filter((stock: number) => Number.isFinite(stock));
                return { id: `${tierIndex}-${optionIndex}`, label: String(label).trim(), price: optionPrice, stock: stockValues.length ? Math.max(...stockValues) : undefined };
            }).filter((option: ProductVariantGroup['options'][number]) => option.label);
            return mapped.length ? { id: String(tier.id || `tier-${tierIndex}`), name: String(tier.name || `ตัวเลือก ${tierIndex + 1}`).trim(), options: mapped } : null;
        })
        .filter((group: ProductVariantGroup | null): group is ProductVariantGroup => Boolean(group));
    return { price, variantGroups };
};

const extractPriceFromVisiblePage = (): ProductPrice | undefined => {
    const selectors = '[class*="price" i], [data-sqe*="price" i], [data-testid*="price" i], meta[property="product:price:amount"], meta[itemprop="price"]';
    const values: string[] = [];
    document.querySelectorAll(selectors).forEach((element) => {
        const meta = element as HTMLMetaElement;
        const text = meta.content || element.textContent || '';
        values.push(...(text.match(/(?:฿|THB\s*)?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) || []));
    });
    return makePrice(values, 'THB');
};

const extractVariantGroupsFromVisiblePage = (): ProductVariantGroup[] => {
    const keyword = /(สี|ขนาด|ไซซ์|รุ่น|แบบ|ตัวเลือก|Color|Size|Model|Style|Variation)/i;
    const selector = '[class*="variation" i], [class*="variant" i], [data-sqe*="variation" i], [data-testid*="variation" i]';
    const seen = new Set<string>();
    const groups: ProductVariantGroup[] = [];
    document.querySelectorAll(selector).forEach((element, index) => {
        const container = element as HTMLElement;
        if (!isElementVisible(container)) return;
        const text = (container.textContent || '').replace(/\s+/g, ' ').trim();
        if (!keyword.test(text) || text.length > 700) return;
        const name = text.match(/(สี|ขนาด|ไซซ์|รุ่น|แบบ|ตัวเลือก|Color|Size|Model|Style|Variation)\s*[:：-]?\s*[^\n]{0,40}/i)?.[0]
            ?.replace(/\s+/g, ' ').trim() || `ตัวเลือก ${index + 1}`;
        const options = Array.from(container.querySelectorAll('button, [role="button"]'))
            .filter(option => isElementVisible(option as HTMLElement))
            .map(option => (option.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(option => option.length > 0 && option.length <= 80 && !/ซื้อ|add to cart|เพิ่มลง|ส่ง|share/i.test(option));
        const uniqueOptions = Array.from(new Set(options)).slice(0, 30);
        const key = `${name}|${uniqueOptions.join('|')}`;
        if (uniqueOptions.length && !seen.has(key)) {
            seen.add(key);
            groups.push({ id: `dom-${index}`, name, options: uniqueOptions.map((label, optionIndex) => ({ id: `dom-${index}-${optionIndex}`, label })) });
        }
    });
    return groups.slice(0, 3);
};

// Listen for messages from Side Panel / Background
chrome.runtime.onMessage.addListener((message: MessageType, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    if (message.type === 'PING') {
        sendResponse({ status: 'PONG' });
    }

    if (message.type === 'SCAN_IMAGES') {
        const imageList: ScannedImage[] = [];

        // --- PART 1: TEXT SCRAPING (Targeted Selectors & Metadata fallbacks) ---
        let scrapedName = '';
        let scrapedDesc = '';
        let scrapedPrice: ProductPrice | undefined;
        let scrapedVariantGroups: ProductVariantGroup[] = [];

        const applyCatalog = (catalog: ReturnType<typeof extractCatalog>) => {
            if (catalog.price && !scrapedPrice) scrapedPrice = catalog.price;
            if (catalog.variantGroups.length > scrapedVariantGroups.length) scrapedVariantGroups = catalog.variantGroups;
        };

        // 1.0 SECURITY: ดึงข้อมูลจาก JSON-LD / Next Data ก่อน (ไม่ทิ้ง DOM footprint)
        try {
            const jsonLds = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of jsonLds) {
                const data = JSON.parse(script.textContent || '{}');
                const findInObj = (obj: any): { name?: string, desc?: string } => {
                    if (!obj || typeof obj !== 'object') return {};
                    if (obj.name && (obj.description || obj['@type'] === 'Product')) {
                        return { name: obj.name, desc: obj.description };
                    }
                    if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const res = findInObj(item);
                            if (res.name) return res;
                        }
                    }
                    for (const key of Object.keys(obj)) {
                        const res = findInObj(obj[key]);
                        if (res.name) return res;
                    }
                    return {};
                };
                const res = findInObj(data);
                if (res.name && !scrapedName) scrapedName = res.name;
                if (res.desc && !scrapedDesc) scrapedDesc = res.desc;
                applyCatalog(extractCatalog(data));
            }
        } catch { /* ignore parse errors */ }

        // 1.0b Try __NEXT_DATA__ (Next.js / Shopee SPA)
        if (!scrapedName || !scrapedDesc) {
            try {
                const nextDataScript = document.getElementById('__NEXT_DATA__');
                if (nextDataScript) {
                    const nextData = JSON.parse(nextDataScript.textContent || '{}');
                    const props = nextData?.props?.pageProps?.product || nextData?.props?.pageProps?.item;
                    if (props?.name && !scrapedName) scrapedName = props.name;
                    if (props?.description && !scrapedDesc) scrapedDesc = props.description;
                    applyCatalog(extractCatalog(nextData));
                }
            } catch { /* ignore */ }
        }

        // 1.1 Helper to find input by label/placeholder (targeted, not brute-force - mostly for Seller Centre)
        const findInputByKeyword = (keywords: string[]): string => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
            for (const input of inputs) {
                const el = input as HTMLInputElement | HTMLTextAreaElement;
                if (!isElementVisible(el)) continue; // SECURITY: Skip hidden inputs (honeypot)
                const label = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
                const labelText = label?.textContent || '';
                const placeholder = el.getAttribute('placeholder') || '';
                const modelValue = el.getAttribute('modelvalue');

                if (keywords.some(k => labelText.includes(k) || placeholder.includes(k))) {
                    if (modelValue) return modelValue;
                    return el.value;
                }
            }
            return '';
        };

        // 1.2 Fallback: Try Seller Centre input selectors if JSON methods failed
        if (!scrapedName) {
            scrapedName = findInputByKeyword(['ชื่อสินค้า', 'Product Name', 'ชื่อแบรนด์', 'ประเภทสินค้า']);
        }
        if (!scrapedDesc) {
            scrapedDesc = findInputByKeyword(['รายละเอียดสินค้า', 'Product Description', 'รายละเอียด']);
        }

        // 1.7 Shopee commonly embeds tier_variations/models in a JSON state script.
        // Inspect only bounded inline JSON; never execute page scripts.
        if (!scrapedPrice || !scrapedVariantGroups.length) {
            document.querySelectorAll('script:not([src])').forEach((script) => {
                const source = script.textContent?.trim() || '';
                if (source.length < 20 || source.length > 1_500_000 || !/(tier_variations|"models"|"price_min")/i.test(source)) return;
                try { applyCatalog(extractCatalog(JSON.parse(source))); } catch { /* state may be JavaScript, not JSON */ }
            });
        }
        if (!scrapedPrice) scrapedPrice = extractPriceFromVisiblePage();
        if (!scrapedVariantGroups.length) scrapedVariantGroups = extractVariantGroupsFromVisiblePage();

        // Seller Centre มักเก็บรายละเอียดสินค้าไว้ใน textarea โดย label ไม่ได้ผูกกับ field
        // ให้ใช้ค่าจาก field โดยตรงก่อนอ่าน text ของทั้งหน้าซึ่งมีเมนูและข้อความระบบปะปน
        if (!scrapedDesc) {
            const textareaValues = Array.from(document.querySelectorAll('textarea'))
                .map(textarea => textarea as HTMLTextAreaElement)
                .filter(textarea => isElementVisible(textarea))
                .map(textarea => textarea.value.trim())
                .filter(value => value.length >= 30 && value.length <= 6000)
                .sort((a, b) => b.length - a.length);
            if (textareaValues[0]) scrapedDesc = textareaValues[0];
        }

        // 1.3 Fallback: standard page structure & meta tags for Shopee/Lazada buyer page
        if (!scrapedName) {
            const nameSelectors = [
                'h1',
                '.product-title',
                '.QA7i7S', // Shopee Buyer title class
                '.pdp-mod-product-title', // Lazada title class
                '[class*="product-title" i]',
                '[class*="productTitle" i]',
                '[class*="productName" i]',
                '[class*="product_title" i]'
            ];
            for (const sel of nameSelectors) {
                const el = document.querySelector(sel);
                if (el && isElementVisible(el as HTMLElement)) {
                    scrapedName = el.textContent?.trim() || '';
                    if (scrapedName) break;
                }
            }
        }

        // 1.4 Metadata search for Name
        if (!scrapedName) {
            const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                              document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
            if (metaTitle) {
                scrapedName = metaTitle.replace(/\s*\|\s*Shopee\s*.*/i, '').replace(/\s*\|\s*Lazada\s*.*/i, '').trim();
            }
        }
        if (!scrapedName) {
            scrapedName = document.title.replace(/\s*\|\s*Shopee\s*.*/i, '').replace(/\s*\|\s*Lazada\s*.*/i, '').trim();
        }

        // 1.5 Metadata search for Description
        // หน้า Seller Centre มีคำว่า description อยู่ใน UI หลายจุด จึงไม่ใช้ DOM fallback ที่กว้าง
        const isSellerCentre = /seller\.shopee\./i.test(window.location.hostname);
        if (!scrapedDesc && !isSellerCentre) {
            const metaDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                             document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                             document.querySelector('meta[name="twitter:description"]')?.getAttribute('content');
            if (metaDesc) scrapedDesc = metaDesc;
        }

        // 1.6 DOM search for Description
        if (!scrapedDesc) {
            const descSelectors = [
                '.product-detail',
                '.IR3_1O', // Shopee Buyer description class
                '.pdp-product-detail', // Lazada description class
                '[class*="product-detail" i]',
                '[class*="productDetail" i]',
                '[class*="description" i]',
                '[class*="Description" i]'
            ];
            for (const sel of descSelectors) {
                const el = document.querySelector(sel);
                if (el && isElementVisible(el as HTMLElement)) {
                    scrapedDesc = el.textContent?.trim() || '';
                    if (scrapedDesc) break;
                }
            }
        }


        // --- PART 2: IMAGE SCANNING (with Honeypot Protection) ---
        const cleanImageUrl = (url: string) => {
            if (!url || typeof url !== 'string') return null;
            let clean = url;
            if (clean.startsWith('//')) clean = 'https:' + clean;
            if (clean.startsWith('/')) clean = window.location.origin + clean;

            // Shopee: Remove thumbnail/resize suffixes
            clean = clean.replace(/(_tn|_v1|_\d+x\d+).*/, '');

            // Lazada: Remove size suffixes
            clean = clean.replace(/_\d+x\d+.*\.jpg$/, '.jpg');
            clean = clean.replace(/_\d+x\d+.*\.png$/, '.png');

            return clean;
        };

        const addImage = (src: string, width: number, height: number, alt: string) => {
            const cleaned = cleanImageUrl(src);
            if (cleaned && cleaned.startsWith('http') && !isTrackerUrl(cleaned)) {
                imageList.push({
                    src: cleaned,
                    width: width || 0,
                    height: height || 0,
                    alt: alt || ''
                });
            }
        };

        // 1. Scan <img> tags — SECURITY: skip hidden/invisible elements
        document.querySelectorAll('img').forEach(img => {
            if (!isElementVisible(img)) return; // ← Honeypot protection
            const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('lazy-src');
            if (src) addImage(src, img.naturalWidth, img.naturalHeight, img.alt);
        });

        // 2. SECURITY: Targeted background-image scan (NOT querySelectorAll('*'))
        // สแกนเฉพาะ selectors ที่ e-commerce ใช้จริง แทนการ brute-force ทุก element
        const bgSelectors = [
            '.product-image', '.item-image', '.shopee-image',
            '.carousel-item', '.slider-image', '.product-img',
            '[data-sqe="item"]', '.pdp-image', '.gallery-image',
            '.image-container', '.main-image', '.thumb',
            '[style*="background-image"]'
        ].join(', ');

        document.querySelectorAll(bgSelectors).forEach(el => {
            if (!isElementVisible(el as HTMLElement)) return; // ← Honeypot protection
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
                const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                if (match && match[1]) {
                    addImage(match[1], (el as HTMLElement).offsetWidth, (el as HTMLElement).offsetHeight, 'BG');
                }
            }
        });

        // 3. Scan Network Requests (Performance API — low footprint)
        const perfImages = performance.getEntriesByType('resource')
            .filter((r): r is PerformanceResourceTiming => r instanceof PerformanceResourceTiming)
            .filter(r => r.initiatorType === 'img' || r.name.match(/\.(jpg|jpeg|png|webp|avif)/i))
            .map(r => r.name);
        perfImages.forEach(src => addImage(src, 0, 0, 'Network'));

        // Unique filter + High fidelity priority
        const uniqueMap = new Map<string, ScannedImage>();
        imageList.forEach(item => {
            const existing = uniqueMap.get(item.src);
            if (!existing || (item.width > existing.width)) {
                uniqueMap.set(item.src, item);
            }
        });

        const finalImages = Array.from(uniqueMap.values());

        sendResponse({
            status: 'OK',
            images: finalImages,
            content: {
                productName: scrapedName,
                productDescription: scrapedDesc,
                price: scrapedPrice,
                variantGroups: scrapedVariantGroups,
            }
        });
    }

    if (message.type === 'FETCH_IMAGE_BASE64') {
        const fetchAndConvert = async (url: string) => {
            const resp = await fetch(url);
            const blob = await resp.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        };

        if (message.imageUrl) {
            fetchAndConvert(message.imageUrl)
                .then(base64 => sendResponse({ status: 'OK', base64 }))
                .catch(err => sendResponse({ status: 'ERROR', message: err.message }));
            return true; // Keep channel open
        }
    }

    // SECURITY: เปลี่ยนชื่อ event เป็น generic + ใช้ origin-specific postMessage
    if (message.type === 'SEND_TO_PICSELLER') {
        // Method 1: postMessage with origin-specific target (ไม่ใช้ '*')
        window.postMessage({
            type: '__xfer_msg',
            detail: message.payload
        }, window.location.origin);

        sendResponse({ status: 'OK' });
    }
});
