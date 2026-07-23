import { ArrowLeft, ImageIcon, CheckCircle2, Circle, Copy, Sparkles, Download, CheckSquare, Square } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useState } from 'react';
import { exportSelectedProductPackage } from '../../services/exportService';

export function StepSelect() {
    const { state, dispatch, goToPrevStep } = useAppFlow();
    const { scannedImages, selectedImages } = state;
    const [isSendingPicSeller, setIsSendingPicSeller] = useState(false);
    const [isSendingGemini, setIsSendingGemini] = useState(false);
    const [isSendingChatGPT, setIsSendingChatGPT] = useState(false);
    const [isExportingPackage, setIsExportingPackage] = useState(false);

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

        const prompt = `# Marketplace Product Image Kit Generator — Shopee / Lazada

คุณคือ Product Listing Visual Director และ Prompt Engineer สำหรับร้านค้า Shopee และ Lazada ในประเทศไทย

เป้าหมายคือสร้างภาพประกอบหน้าสินค้า 9 ภาพ สำหรับสินค้าชิ้นนี้:

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

## กฎความตรงปก 1:1
1. ใช้รูปอ้างอิงเป็นแหล่งความจริงสูงสุด สินค้าทุกภาพต้องเป็นสินค้าชิ้นเดียวกัน
2. รักษารูปทรง สี วัสดุ สเกล และขนาดสัดส่วนให้ตรงกับรูปอ้างอิง
3. สร้าง Prompt ละเอียดเรียงตาม IMAGE 1 ถึง IMAGE 9 (ภาพปก, สเปก, จุดเด่น, ตารางขนาด Size Chart, ตัวเลือกสินค้า, การใช้งานจริง, วิธีใช้, บริบทการใช้งาน, อุปกรณ์ในชุด)
4. ท้ายทุก Prompt ให้ลงท้ายด้วย: square 1:1 marketplace listing image, product identity preserved, realistic scale, no watermark, no gibberish text.`;

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

    const ensureDestinationPermission = async (destination: 'gemini' | 'chatgpt') => {
        const origin = destination === 'chatgpt' ? 'https://chatgpt.com/*' : 'https://gemini.google.com/*';
        const hasPermission = await chrome.permissions.contains({ origins: [origin] });
        if (hasPermission) return;
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) throw new Error(`กรุณาอนุญาตให้สิทธิ์เข้าถึง ${destination === 'chatgpt' ? 'ChatGPT' : 'Google Gemini'} แล้วลองอีกครั้ง`);
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

    const sendToAiChat = async (destination: 'gemini' | 'chatgpt') => {
        if (destination === 'gemini') setIsSendingGemini(true);
        if (destination === 'chatgpt') setIsSendingChatGPT(true);

        try {
            await ensureDestinationPermission(destination);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.runtime.sendMessage({
                type: 'SEND_TO_AI_CHAT',
                payload: {
                    destination,
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
            if (destination === 'gemini') setIsSendingGemini(false);
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
                    {scannedImages.map((img, index) => {
                        const isSelected = selectedImages.includes(img.src);
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
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                    {img.width}x{img.height}
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

                {/* Primary Buttons 2 & 3: GEM & CHATGPT */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        disabled={selectedImages.length === 0 || isSendingGemini}
                        onClick={() => sendToAiChat('gemini')}
                        className="bg-blue-600 text-white font-bold py-2.5 px-3 rounded-xl hover:bg-blue-700 active:scale-98 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                    >
                        <span>💎</span>
                        <span>{isSendingGemini ? 'กำลังส่ง...' : 'ส่งไปที่ GEM'}</span>
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
