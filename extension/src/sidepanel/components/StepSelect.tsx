import { ArrowLeft, ImageIcon, CheckCircle2, Circle, Copy, Sparkles, Download, CheckSquare, Square, ListFilter } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useEffect, useMemo, useState } from 'react';
import { exportSelectedProductPackage } from '../../services/exportService';

export function StepSelect() {
    const { state, dispatch, goToPrevStep } = useAppFlow();
    const { scannedImages, selectedImages } = state;
    const [isSendingPicSeller, setIsSendingPicSeller] = useState(false);
    const [geminiGemUrls, setGeminiGemUrls] = useState<string[]>(['https://gemini.google.com/app']);
    const [sendingGeminiIndex, setSendingGeminiIndex] = useState<number | null>(null);
    const [isSendingGeminiChat, setIsSendingGeminiChat] = useState(false);
    const [isSendingChatGPT, setIsSendingChatGPT] = useState(false);
    const [isExportingPackage, setIsExportingPackage] = useState(false);
    const [sortBy, setSortBy] = useState<'size' | 'png' | 'jpg' | 'webp'>('size');

    useEffect(() => {
        chrome.storage.local.get(['gemini_gem_urls', 'gemini_gem_url'], (result: { gemini_gem_urls?: unknown; gemini_gem_url?: unknown }) => {
            const urls = Array.isArray(result.gemini_gem_urls)
                ? result.gemini_gem_urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 5)
                : [];
            if (urls.length > 0) {
                setGeminiGemUrls(urls);
            } else if (typeof result.gemini_gem_url === 'string' && result.gemini_gem_url.trim()) {
                setGeminiGemUrls([result.gemini_gem_url]);
            }
        });
    }, []);

    const getFileType = (src: string) => {
        const path = src.split('?')[0].split('#')[0].toLowerCase();
        if (path.endsWith('.png')) return 'png';
        if (path.endsWith('.webp')) return 'webp';
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'jpg';
        return 'other';
    };

    const sortedImages = useMemo(() => {
        const images = [...scannedImages];
        return images.sort((a, b) => {
            const areaA = Math.max(0, a.width || 0) * Math.max(0, a.height || 0);
            const areaB = Math.max(0, b.width || 0) * Math.max(0, b.height || 0);
            if (sortBy === 'size') return areaB - areaA;
            const rankA = getFileType(a.src) === sortBy ? 0 : 1;
            const rankB = getFileType(b.src) === sortBy ? 0 : 1;
            return rankA - rankB || areaB - areaA;
        });
    }, [scannedImages, sortBy]);

    const toggleImageSelection = (src: string) => {
        dispatch({ type: 'TOGGLE_IMAGE_SELECTION', payload: src });
    };

    const handleSelectAll = () => {
        if (selectedImages.length === scannedImages.length) {
            // Deselect all
            scannedImages.forEach(img => {
                if (selectedImages.includes(img.src)) {
                    dispatch({ type: 'TOGGLE_IMAGE_SELECTION', payload: img.src });
                }
            });
        } else {
            // Select all
            scannedImages.forEach(img => {
                if (!selectedImages.includes(img.src)) {
                    dispatch({ type: 'TOGGLE_IMAGE_SELECTION', payload: img.src });
                }
            });
        }
    };

    const getProductInfo = () => ({
        name: state.scrapedContent?.productName || state.analysisResult?.product_name || 'สินค้า',
        description: state.scrapedContent?.productDescription || state.analysisResult?.ideal_lifestyle_setting || 'ไม่มีรายละเอียดสินค้า',
        productUrl: state.sourceProductUrl || '',
        price: state.scrapedContent?.price,
        variantGroups: state.scrapedContent?.variantGroups || [],
    });

    const copyGridPrompt = async () => {
        const product = getProductInfo();
        const imageLinks = selectedImages.map((url, index) => `${index + 1}. ${url}`).join('\n');
        const variantsText = product.variantGroups.length
            ? product.variantGroups.map(g => `- ${g.name}: ${g.options.map(o => o.label).join(', ')}`).join('\n')
            : 'ไม่ระบุ';

        const prompt = `# Shopee Thai Product 3x3 / 9-in-1 Image Generator

คุณคือผู้กำกับภาพสินค้า e-commerce สำหรับ Shopee Thailand เป้าหมายคือสร้างภาพจริงเพียง 1 ภาพ เป็นคอมโพสิต 3x3 แบบ 9-in-1 บนแคนวาส 1:1 ไม่ใช่ Prompt 9 ชุด ไม่ใช่ภาพ 9 ไฟล์แยกกัน และไม่ใช่ภาพปก 3 แบบ

แบ่งภาพเดียวออกเป็น 9 ช่องเท่ากัน โดยใช้สินค้ารุ่นเดียวกันในทุกช่อง:
1 Cover Hero, 2 Product Anatomy, 3 Specification and Scale, 4 Material Macro, 5 Feature in Action, 6 Problem and Solution, 7 Thai Lifestyle Use, 8 Package and Contents, 9 Alternate Product Hero

ใช้โครงสร้าง Thai High-Information E-commerce Design แบบ GEM: สินค้าต้องเด่น มีฉากและรายละเอียดจริง มีหน้าที่ภาพต่างกันในแต่ละช่อง แต่ห้ามทำเป็นกรอบหนาหรือแผงข้อมูลด้านข้าง

## ข้อมูลสินค้า
ชื่อสินค้า: ${product.name}
ราคา: ${product.price?.display || 'ไม่ระบุ'}

รายละเอียดและสเปก/ขนาดสินค้า:
${product.description}

ตัวเลือกสินค้า (สี/ขนาด/รุ่น):
${variantsText}

ลิงก์รูปอ้างอิง:
${imageLinks}

---

## กฎความตรงปกและการจัดวาง
1. ใช้รูปอ้างอิงเป็นแหล่งความจริงสูงสุด และรักษาสินค้าชิ้นเดียวกันในทั้ง 9 ช่อง
2. รักษารูปทรง สี วัสดุ โลโก้ ฉลาก จำนวน และสัดส่วนให้ตรงกับรูปอ้างอิง
3. ใช้ขนาดที่ยืนยันแล้วเท่านั้น หากไม่มีขนาดให้เทียบกับมือคนหรือ iPhone และห้ามเดาตัวเลข
4. ห้ามเพิ่มสินค้า อุปกรณ์ สี รุ่น ราคา โปรโมชัน หรือคุณสมบัติที่ไม่มีข้อมูล
5. ห้ามมีกรอบหนา แผงด้านข้าง UI ปุ่มปลอม watermark หรือตัวอักษรสุ่ม/ภาษาต่างดาว
6. ถ้าจำเป็นต้องมีข้อความ ให้ใช้เฉพาะภาษาไทยสั้น ๆ จากข้อมูลยืนยัน และต้องไม่บังสินค้า
7. ใช้แสง โทนสี และสไตล์ร่วมกันทั้ง 9 ช่อง แต่ให้แต่ละช่องแตกต่างกันตามหน้าที่
8. สร้างภาพจริง 1 ภาพทันทีจากรูปอ้างอิงทั้งหมด ไม่ตอบกลับเป็น Prompt หลายชุด`;

        await navigator.clipboard.writeText(prompt);
        alert('คัดลอก Prompt 3×3 Grid สำเร็จ!');
    };

    const copyProductInfo = async () => {
        const product = getProductInfo();
        const imageLinks = selectedImages.map((url, index) => `${index + 1}. ${url}`).join('\n');
        const variants = product.variantGroups.length
            ? product.variantGroups.map(group => `- ${group.name}: ${group.options.map(option => `${option.label}${option.price?.display ? ` (${option.price.display})` : ''}`).join(', ')}`).join('\n')
            : '- ไม่พบตัวเลือกสินค้า';
        await navigator.clipboard.writeText(`ชื่อสินค้า: ${product.name}\nราคา: ${product.price?.display || '-'}\n\nรายละเอียด/สเปก/ขนาดสินค้า:\n${product.description}\n\nตัวเลือกสินค้า (สี/ขนาด):\n${variants}\n\nลิงก์รูปสินค้า:\n${imageLinks}`);
        alert('คัดลอกข้อมูลสินค้า (รวมราคา ตัวเลือก และสเปกขนาด) แล้วครับ');
    };

    const downloadSelectedPackage = async () => {
        setIsExportingPackage(true);
        try {
            const product = getProductInfo();
            await exportSelectedProductPackage(product.name, product.description, product.productUrl, selectedImages);
        } catch (error) {
            alert('ดาวน์โหลดไฟล์ไม่สำเร็จ: ' + (error as Error).message);
        } finally {
            setIsExportingPackage(false);
        }
    };

    const ensureDestinationPermission = async (destination: 'gemini' | 'gemini-chat' | 'chatgpt') => {
        const origin = destination === 'chatgpt' ? 'https://chatgpt.com/*' : 'https://gemini.google.com/*';
        const hasPermission = await chrome.permissions.contains({ origins: [origin] });
        if (hasPermission) return;
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) throw new Error(`กรุณาอนุญาตให้สิทธิ์เข้าถึง ${destination === 'chatgpt' ? 'ChatGPT' : destination === 'gemini-chat' ? 'Gemini Chat' : 'Google Gem'} แล้วลองอีกครั้ง`);
    };

    const sendToPicSeller = async () => {
        setIsSendingPicSeller(true);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const productUrl = state.sourceProductUrl || tab?.url || '';

            const response = await chrome.runtime.sendMessage({
                type: 'SEND_TO_PICSELLER',
                payload: {
                    productUrl,
                    productName: state.scrapedContent?.productName || state.analysisResult?.product_name || tab?.title?.split('|')[0]?.split('-')[0]?.trim() || '',
                    productDesc: state.scrapedContent?.productDescription || state.analysisResult?.ideal_lifestyle_setting || '',
                    images: selectedImages,
                    price: state.scrapedContent?.price,
                    variantGroups: state.scrapedContent?.variantGroups,
                }
            });

            if (!response?.success) {
                throw new Error(response?.error || 'ไม่สามารถส่งข้อมูลไป PicSeller ได้');
            }
        } catch (error) {
            console.error('Failed to send to PicSeller:', error);
            alert('ส่งข้อมูลไป PicSeller ไม่สำเร็จ: ' + (error as Error).message);
        } finally {
            setIsSendingPicSeller(false);
        }
    };

    const sendToAiChat = async (destination: 'gemini' | 'gemini-chat' | 'chatgpt', geminiIndex = 0) => {
        if (destination === 'gemini') setSendingGeminiIndex(geminiIndex);
        if (destination === 'gemini-chat') setIsSendingGeminiChat(true);
        if (destination === 'chatgpt') setIsSendingChatGPT(true);

        try {
            await ensureDestinationPermission(destination);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.runtime.sendMessage({
                type: 'SEND_TO_AI_CHAT',
                payload: {
                    destination,
                    geminiIndex: destination === 'gemini' ? geminiIndex : undefined,
                    productUrl: state.sourceProductUrl || tab?.url || '',
                    productName: state.scrapedContent?.productName || tab?.title || '',
                    productDesc: state.scrapedContent?.productDescription || '',
                    images: selectedImages,
                    price: state.scrapedContent?.price,
                    variantGroups: state.scrapedContent?.variantGroups,
                }
            });
            if (!response?.success) throw new Error(response?.error || 'ส่งข้อมูลไม่สำเร็จ');
        } catch (error) {
            alert((error as Error).message);
        } finally {
            if (destination === 'gemini') setSendingGeminiIndex(null);
            if (destination === 'gemini-chat') setIsSendingGeminiChat(false);
            if (destination === 'chatgpt') setIsSendingChatGPT(false);
        }
    };

    const product = getProductInfo();

    return (
        <div className="space-y-4 pb-48">
            <div className="flex items-center gap-3">
                <button
                    onClick={goToPrevStep}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    title="กลับไปสแกนใหม่"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800">เลือกรูปสินค้า ({selectedImages.length}/{scannedImages.length})</h2>
                    <button
                        onClick={handleSelectAll}
                        className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1"
                    >
                        {selectedImages.length === scannedImages.length ? (
                            <><Square className="w-3.5 h-3.5" /> ยกเลิกทั้งหมด</>
                        ) : (
                            <><CheckSquare className="w-3.5 h-3.5" /> เลือกทั้งหมด</>
                        )}
                    </button>
                </div>
            </div>

            {scannedImages.length > 1 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <ListFilter className="h-4 w-4 text-orange-500" />
                        <span>เรียงรูปภาพ</span>
                    </div>
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        aria-label="เรียงลำดับรูปภาพ"
                    >
                        <option value="size">ขนาดใหญ่สุดก่อน (ค่าเริ่มต้น)</option>
                        <option value="png">PNG ก่อน</option>
                        <option value="jpg">JPG/JPEG ก่อน</option>
                        <option value="webp">WEBP ก่อน</option>
                    </select>
                </div>
            )}

            {/* Product Metadata Summary Badge */}
            {(product.name !== 'สินค้า' || product.price || product.variantGroups.length > 0) && (
                <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-3 text-xs shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 line-clamp-1">{product.name}</span>
                        {product.price?.display && (
                            <span className="shrink-0 font-extrabold text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200 shadow-2xs">
                                {product.price.display}
                            </span>
                        )}
                    </div>
                    {product.variantGroups.length > 0 && (
                        <p className="text-[11px] text-slate-600 font-medium">
                            <span className="font-bold text-orange-700">ตัวเลือก: </span>
                            {product.variantGroups.map(g => `${g.name} (${g.options.length})`).join(' • ')}
                        </p>
                    )}
                    {product.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                            {product.description}
                        </p>
                    )}
                </div>
            )}

            {scannedImages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="w-12 h-12 text-slate-200" />
                        <p className="text-sm font-semibold">ไม่พบรูปภาพบนหน้านี้</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {sortedImages.map((img, index) => {
                        const isSelected = selectedImages.includes(img.src);
                        const fileType = getFileType(img.src).toUpperCase();
                        return (
                            <div
                                key={index}
                                onClick={() => toggleImageSelection(img.src)}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${isSelected ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-100 hover:border-orange-300'}`}
                            >
                                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                                <div className={`absolute top-2 right-2 transition-transform flex flex-col gap-1 ${isSelected ? 'scale-100' : 'scale-90 opacity-0 group-hover:opacity-100'}`}>
                                    {isSelected ? (
                                        <CheckCircle2 className="w-6 h-6 text-orange-500 fill-white drop-shadow-sm" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-white drop-shadow-md" />
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span>{img.width || '?'}x{img.height || '?'}</span><span className="ml-2 font-black">{fileType}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bottom Action Drawer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-2.5 z-40 max-w-md mx-auto">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center justify-between">
                    <span>ส่งออกข้อมูลไปยัง</span>
                    <span className="text-orange-600">{selectedImages.length} รูปที่เลือก</span>
                </p>

                {/* Primary Button 1: PICSELLER */}
                <button
                    disabled={selectedImages.length === 0 || isSendingPicSeller}
                    onClick={sendToPicSeller}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-3 px-4 rounded-xl shadow-md shadow-orange-200 hover:from-orange-600 hover:to-amber-600 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    {isSendingPicSeller ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลไป PICSELLER'}
                </button>

                {/* Primary Buttons: up to five Custom Gems, Gemini Chat & ChatGPT */}
                <div className="grid grid-cols-2 gap-2">
                    {geminiGemUrls.slice(0, 5).map((url, index) => (
                        <button
                            key={`${index}-${url}`}
                            disabled={selectedImages.length === 0 || sendingGeminiIndex !== null}
                            onClick={() => sendToAiChat('gemini', index)}
                            className="bg-blue-600 text-white font-bold py-2.5 px-2 rounded-xl hover:bg-blue-700 active:scale-98 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                            title={url}
                        >
                            <span>💎</span>
                            <span>{sendingGeminiIndex === index ? 'กำลังส่ง...' : `ส่งไป GEM ${index + 1}`}</span>
                        </button>
                    ))}
                    <button
                        disabled={selectedImages.length === 0 || isSendingGeminiChat}
                        onClick={() => sendToAiChat('gemini-chat')}
                        className="bg-emerald-600 text-white font-bold py-2.5 px-2 rounded-xl hover:bg-emerald-700 active:scale-98 transition-all text-[11px] flex items-center justify-center gap-1 disabled:opacity-50 shadow-sm"
                    >
                        <span>💬</span>
                        <span>{isSendingGeminiChat ? 'กำลังส่ง...' : 'Gemini Chat'}</span>
                    </button>
                    <button
                        disabled={selectedImages.length === 0 || isSendingChatGPT}
                        onClick={() => sendToAiChat('chatgpt')}
                        className="bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl hover:bg-slate-900 active:scale-98 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                    >
                        <span>🤖</span>
                        <span>{isSendingChatGPT ? 'กำลังส่ง...' : 'ส่งไป Chat GPT'}</span>
                    </button>
                </div>

                {/* Secondary Quick Utilities */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                    <button
                        onClick={copyProductInfo}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center justify-center gap-1"
                        title="คัดลอกชื่อ ราคา รายละเอียด ตัวเลือก และลิงก์รูปภาพ"
                    >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        คัดลอกข้อมูล
                    </button>
                    <button
                        onClick={copyGridPrompt}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center justify-center gap-1"
                        title="คัดลอก Prompt สำหรับสร้างชุดภาพ 9 ภาพ"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        Prompt 3x3
                    </button>
                    <button
                        disabled={isExportingPackage}
                        onClick={downloadSelectedPackage}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        title="ดาวน์โหลดรูปภาพและรายละเอียดลงเครื่องเป็นไฟล์ ZIP"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        โหลด ZIP
                    </button>
                </div>
            </div>
        </div>
    );
}
