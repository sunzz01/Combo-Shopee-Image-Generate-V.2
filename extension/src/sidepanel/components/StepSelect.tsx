import { ArrowLeft, ImageIcon, CheckCircle2, Circle, ChevronRight, Copy, Wand2, Loader2, Sparkles } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useState } from 'react';
import { AI_MODELS } from '../../services/aiService';
import { exportSelectedProductPackage } from '../../services/exportService';

export function StepSelect() {
    const { state, dispatch, goToPrevStep, goToNextStep } = useAppFlow();
    const { scannedImages, selectedImages, selectedModelId } = state;
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExportingPackage, setIsExportingPackage] = useState(false);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

    const toggleImageSelection = (src: string) => {
        dispatch({ type: 'TOGGLE_IMAGE_SELECTION', payload: src });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
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
        const prompt = `# Marketplace Product Image Kit Generator — Shopee / Lazada\n\nคุณคือ Product Listing Visual Director และ Prompt Engineer สำหรับร้านค้า Shopee และ Lazada ในประเทศไทย\n\nงานของคุณคือวิเคราะห์สินค้าและรูปอ้างอิงด้านล่าง แล้วออกแบบ “ชุดภาพหน้าสินค้า 9 ภาพ” ที่ใช้ประกอบ Product Listing จริง ไม่ใช่ภาพสำหรับยิงโฆษณา\n\nเป้าหมายคือทำให้ลูกค้าเห็นสินค้าตรงปก เข้าใจวัสดุ จุดเด่น ขนาด ตัวเลือก และวิธีใช้งานได้จากรูปภาพ โดยลดคำถามก่อนตัดสินใจซื้อ\n\n## ข้อมูลสินค้า\nชื่อสินค้า: ${product.name}\n\nรายละเอียดสินค้า:\n${product.description}\n\nลิงก์หน้าสินค้าต้นทาง:\n${product.productUrl || '(ไม่มีลิงก์)'}\n\nลิงก์รูปอ้างอิงที่ผู้ใช้เลือก:\n${imageLinks}\n\n---\n\n## กฎสำคัญสูงสุด: ความตรงปก\n\n1. ใช้รูปอ้างอิงเป็นแหล่งความจริงสูงสุด สินค้าทุกภาพต้องเป็นสินค้าชิ้นเดียวกัน\n2. รักษารูปทรง สี วัสดุ ผิวสัมผัส ขนาดสัดส่วน มือจับ ปุ่ม ขอบ รอยต่อ โลโก้ และอุปกรณ์ที่เห็นในรูปอ้างอิงให้ตรงที่สุด\n3. หากข้อมูลใดไม่ปรากฏในรูปหรือรายละเอียด ห้ามเดา ห้ามสร้างสเปก ตัวเลข อุปกรณ์ หรือคุณสมบัติขึ้นมาเอง\n4. สินค้าต้องมีสเกลสมจริงเมื่อเทียบกับมือ คน โต๊ะ หรือสภาพแวดล้อม ใช้ standard focal length หลีกเลี่ยงเลนส์มุมกว้างที่ทำให้รูปทรงบิดเบี้ยว\n5. ภาพต้องเป็น realistic commercial product photography เห็นพื้นผิวจริง เช่น ลายโลหะ รอยขัดเงาบาง ๆ ผิวพลาสติก ผิวยาง เงาสะท้อน และน้ำหนักของวัสดุอย่างเป็นธรรมชาติ\n6. หลีกเลี่ยงภาพ 3D render, illustration, สินค้าพลาสติกเงาเกินจริง, ภาพแฟนตาซี, ตัวสินค้าเบลอ, ลายน้ำ และตัวอักษรมั่ว\n\n## ขอบเขตงาน\n\n- ภาพทั้งหมดเป็นภาพประกอบหน้าสินค้า Shopee/Lazada ขนาดสี่เหลี่ยม 1:1\n- ไม่ใช่ Ad Banner: ห้ามใส่ราคา ส่วนลด คูปอง คำว่า “ซื้อเลย”, CTA, ดาวรีวิวปลอม, badge รับประกันปลอม, โลโก้แพลตฟอร์ม หรือข้อความโปรโมชั่น\n- ใส่ข้อความไทยได้เฉพาะภาพที่เป็นข้อมูลสินค้า เช่น จุดเด่น สเปก ขนาด หรือวิธีเลือกตัวเลือก และต้องใช้คำสั้น ๆ ที่ยืนยันได้จากข้อมูลเท่านั้น\n- ถ้าจะมีข้อความไทย ต้องระบุตำแหน่ง, สี, ขนาด และคำที่ให้แสดงแบบเป๊ะ ๆ พร้อมกำชับว่า “no gibberish text; render only the exact Thai words in quotes”\n- องค์ประกอบต้องอ่านง่ายบนมือถือ: สินค้าเด่น, ตัวหนังสือน้อย, พื้นที่ว่างพอ, ข้อมูลไม่แน่นจนอ่านไม่ออก\n\n## ทิศทางภาพรวม\n\nให้เริ่มด้วยหัวข้อ PRODUCT VISUAL DIRECTION เป็นภาษาไทย ไม่เกิน 6 บรรทัด สรุปกลุ่มลูกค้า ลักษณะพื้นผิว แสง ฉาก และโทนสีที่เหมาะกับสินค้าโดยอิงจากข้อมูลจริง\n\nจากนั้นสร้าง Copy-ready English Prompt แยก 9 บล็อกตามรูปแบบด้านล่าง โดยแต่ละภาพต้องมี:\n- วัตถุประสงค์ (ภาษาไทย)\n- สิ่งที่เห็นในภาพ / เลย์เอาต์ (ภาษาไทย)\n- ข้อความไทยบนภาพ ถ้าจำเป็นและยืนยันได้\n- English prompt แบบละเอียด พร้อมข้อกำหนด 1:1 และ negative constraints\n\n---\n\n## โครงสร้างชุดภาพ 9 ภาพสำหรับหน้าสินค้า\n\n### IMAGE 1 — ภาพปกสินค้าตรงปก\nสินค้าเด่นชัดที่สุดเต็มเฟรมในมุมที่แสดงรูปทรงครบ ใช้ฉากที่สัมพันธ์กับการใช้งานจริงแต่ไม่รก แสงธรรมชาติหรือแสงสตูดิโอที่นุ่มและสมจริง ห้ามมีราคา โปรโมชัน หรือข้อความขายเกินจริง\n\n### IMAGE 2 — มุมสินค้าและรายละเอียดวัสดุ\nภาพมุม 45 องศาหรือ macro close-up ที่แสดงวัสดุ งานประกอบ พื้นผิว และส่วนสำคัญของสินค้าอย่างคมชัด ใช้ callout เฉพาะเมื่อข้อมูลยืนยันได้\n\n### IMAGE 3 — จุดเด่นหลักของสินค้า\nจัดภาพสินค้าและ feature callout 3–4 จุดที่อ้างอิงได้จากรายละเอียดสินค้า ใช้เส้นชี้สะอาด อ่านง่าย และข้อความไทยสั้น ๆ เท่านั้น\n\n### IMAGE 4 — ขนาดและสัดส่วน\nสร้างภาพ Dimension Guide เฉพาะเมื่อรายละเอียดมีตัวเลขขนาดจริง ห้ามประดิษฐ์ตัวเลข เส้นวัดต้องชี้ชัด และใช้หน่วยตามข้อมูลต้นทาง\n\n### IMAGE 5 — ตัวเลือกสินค้า / วิธีเลือก\nหากข้อมูลมีขนาด สี หรือรุ่นย่อย ให้แสดงเปรียบเทียบตัวเลือกอย่างเป็นระเบียบ พร้อมคำแนะนำสั้น ๆ ที่ยืนยันได้ หากไม่มีตัวเลือกให้เปลี่ยนเป็นภาพสินค้าหลายมุม\n\n### IMAGE 6 — ภาพการใช้งานจริง\nแสดงสินค้าในการใช้งานที่สอดคล้องกับประเภทสินค้าและรายละเอียดเท่านั้น สเกลสมจริง บรรยากาศจริง ไม่สร้างการใช้งานที่อันตรายหรือไม่มีหลักฐานรองรับ\n\n### IMAGE 7 — วิธีใช้หรือขั้นตอนสำคัญ\nทำเป็นภาพสาธิต 3 ขั้นตอนหรือภาพการจับถือ/การจัดวางที่ช่วยให้ลูกค้าเข้าใจสินค้า ใช้ได้เมื่อสามารถอนุมานจากข้อมูลอย่างปลอดภัยเท่านั้น\n\n### IMAGE 8 — ภาพเปรียบเทียบประโยชน์หรือสถานการณ์ใช้งาน\nแสดงผลลัพธ์หรือบริบทที่ช่วยให้เข้าใจว่าผลิตภัณฑ์เหมาะกับงานใด โดยไม่อ้างผลลัพธ์เกินจริงและไม่ทำ Before/After ที่หลอกลวง\n\n### IMAGE 9 — สิ่งที่ได้รับ / ภาพครบชุด\nแสดงสินค้าและอุปกรณ์ที่ปรากฏหรือระบุชัดเจนในข้อมูลต้นทางเท่านั้น จัดวางแบบ knolling / flat lay อย่างมีระเบียบ หากไม่ทราบอุปกรณ์ ให้ทำเป็นภาพสินค้าหลายมุมแทน\n\n---\n\n## รูปแบบผลลัพธ์ที่ต้องการ\n\nตอบตามลำดับนี้เท่านั้น:\n1. PRODUCT VISUAL DIRECTION\n2. IMAGE 1 ถึง IMAGE 9\n\nสำหรับทุก IMAGE ให้มีหัวข้อ: วัตถุประสงค์, เลย์เอาต์, ข้อความบนภาพ (ถ้ามี), และ ENGLISH IMAGE PROMPT\n\nEnglish prompt ของแต่ละภาพต้องละเอียดพอที่จะคัดลอกไปสร้างภาพได้ทันที และจบด้วย: square 1:1 marketplace listing image, product identity preserved, realistic scale, no price, no promotion, no platform logo, no watermark, no gibberish text.`;
        await navigator.clipboard.writeText(prompt);
        alert('คัดลอก Prompt Grid 3×3 แล้วครับ');
    };

    const copyProductInfo = async () => {
        const product = getProductInfo();
        const imageLinks = selectedImages.map((url, index) => `${index + 1}. ${url}`).join('\n');
        const variants = product.variantGroups.length
            ? product.variantGroups.map(group => `- ${group.name}: ${group.options.map(option => `${option.label}${option.price?.display ? ` (${option.price.display})` : ''}`).join(', ')}`).join('\n')
            : '- ไม่พบตัวเลือกสินค้า';
        await navigator.clipboard.writeText(`ชื่อสินค้า: ${product.name}\nราคา: ${product.price?.display || '-'}\n\nรายละเอียดสินค้า:\n${product.description}\n\nตัวเลือกสินค้า:\n${variants}\n\nลิงก์รูปสินค้า:\n${imageLinks}`);
        alert('คัดลอกข้อมูลสินค้าแล้วครับ');
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

    const copySelectedImage = async (imageUrl: string, imageNumber: number) => {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('ไม่สามารถดาวน์โหลดรูปภาพได้');
            const image = await response.blob();
            if (!image.type.startsWith('image/')) throw new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ');

            // Chrome รองรับรูป PNG บน clipboard เสถียรกว่า JPEG/WebP จึงแปลงก่อนคัดลอก
            const objectUrl = URL.createObjectURL(image);
            const pngImage = await new Promise<Blob>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d')?.drawImage(img, 0, 0);
                    canvas.toBlob((png) => {
                        URL.revokeObjectURL(objectUrl);
                        png ? resolve(png) : reject(new Error('แปลงรูปเป็น PNG ไม่สำเร็จ'));
                    }, 'image/png');
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('เปิดรูปภาพไม่สำเร็จ'));
                };
                img.src = objectUrl;
            });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngImage })]);
            alert(`คัดลอกรูปที่ ${imageNumber} แล้ว — ไปคลิกช่องข้อความใน Gem หรือ ChatGPT แล้วกด Ctrl+V เพื่อวางรูปได้เลยครับ`);
        } catch (error) {
            alert('คัดลอกรูปภาพไม่สำเร็จ: ' + (error as Error).message);
        }
    };

    const ensureDestinationPermission = async (destination: 'gemini' | 'chatgpt') => {
        const origin = destination === 'chatgpt' ? 'https://chatgpt.com/*' : 'https://gemini.google.com/*';
        const hasPermission = await chrome.permissions.contains({ origins: [origin] });
        if (hasPermission) return;
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) throw new Error(`กรุณาอนุญาตให้ Gimi Shopee X เข้าถึง ${destination === 'chatgpt' ? 'ChatGPT' : 'Google Gemini'} แล้วลองอีกครั้ง`);
    };

    const sendToAiChat = async (destination: 'gemini' | 'chatgpt') => {
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
        }
    };

    const handleAnalyze = async () => {
        if (selectedImages.length === 0) return;

        // We start the transition to ANALYZE step. 
        // Ideally, we might want to do the API call HERE, then dispatch result, THEN go to next step?
        // Or go to next step and let that step handle the loading? 
        // The instructions say "UI ... must always align with the current step". 
        // So "Analyzing" is part of the "ANALYZE" step process. 

        // Let's do the API call here for simplicity of error handling, then move.
        // Or better: Move to next step immediately, and let StepAnalyze handle the effect.
        // But then we need to pass the images? They are in the store.

        // We'll try performing the action here to keep "Loading" feedback on the button if we want to stay on this screen?
        // No, usually "Analyzing" means we are entering the analysis phase.

        // Let's try: Perform logic here. If success, save to store, then go next.
        setIsAnalyzing(true);
        try {
            const imageUrl = selectedImages[0];
            let base64Image: string | undefined;

            // Only proxy if it's a remote URL
            if (imageUrl.startsWith('http')) {
                try {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab?.id) {
                        const response = await chrome.tabs.sendMessage(tab.id, {
                            type: 'FETCH_IMAGE_BASE64',
                            imageUrl
                        });
                        if (response?.status === 'OK') {
                            base64Image = response.base64;
                        }
                    }
                } catch (proxyError) {
                    console.warn('Proxy fetch failed, falling back to direct:', proxyError);
                }
            } else if (imageUrl.startsWith('data:')) {
                base64Image = imageUrl;
            }

            // Send to Background Service Worker
            // We need the API Key. The background has it. 
            // But if it's missing? The background throws error.

            const response = await chrome.runtime.sendMessage({
                type: 'ANALYZE_PRODUCT',
                imageUrl,
                base64Override: base64Image,
                modelId: selectedModelId
            });

            if (response.success) {
                dispatch({ type: 'SET_ANALYSIS_RESULT', payload: response.data });
                goToNextStep(); // Move to ANALYZE (Insight) view
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error(error);
            alert((error as Error).message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={goToPrevStep}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800">เลือกรูปสินค้า</h2>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        พบ {scannedImages.length} รูป
                    </span>
                </div>
            </div>

            {scannedImages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="w-12 h-12 text-slate-200" />
                        <p>ไม่พบรูปภาพ</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 pb-24">
                    {scannedImages.map((img, index) => {
                        const isSelected = selectedImages.includes(img.src);
                        return (
                            <div
                                key={index}
                                onClick={() => toggleImageSelection(img.src)}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${isSelected ? 'border-violet-600 ring-2 ring-violet-100' : 'border-slate-100 hover:border-violet-300'}`}
                            >
                                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                                <div className={`absolute top-2 right-2 transition-transform flex flex-col gap-1 ${isSelected ? 'scale-100' : 'scale-90 opacity-0 group-hover:opacity-100'}`}>
                                    {isSelected ? (
                                        <CheckCircle2 className="w-6 h-6 text-violet-600 fill-white drop-shadow-sm" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-white drop-shadow-md" />
                                    )}
                                </div>

                                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.open(img.src, '_blank'); }}
                                        className="p-1.5 bg-white/90 hover:bg-white rounded-md shadow-sm text-slate-600"
                                        title="เปิดรูปขนาดใหญ่"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(img.src); }}
                                        className="p-1.5 bg-white/90 hover:bg-white rounded-md shadow-sm text-slate-600"
                                        title="คัดลอกลิงก์"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                    {img.width}x{img.height}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedImages.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 max-h-[calc(100vh-0.5rem)] overflow-y-auto p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.12)] flex flex-col gap-3">
                    <button
                        onClick={() => setIsControlPanelOpen(open => !open)}
                        className="w-full flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-100 transition-colors"
                    >
                        <span>{isControlPanelOpen ? 'ย่อเมนูตั้งค่าและเครื่องมือ' : 'เปิดเมนูตั้งค่า AI / ส่งต่อ / ดาวน์โหลด'}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isControlPanelOpen ? '-rotate-90' : 'rotate-90'}`} />
                    </button>

                    {isControlPanelOpen && <>
                    {/* AI Model Selection Step */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block flex items-center gap-1">
                                <Wand2 className="w-3 h-3" /> ขั้นตอนที่ 2: เลือก AI โมเดล
                            </label>
                            <div className="relative group">
                                <select
                                    value={selectedModelId}
                                    onChange={(e) => {
                                        dispatch({ type: 'SET_MODEL_ID', payload: e.target.value });
                                        chrome.storage.local.set({ selected_model_id: e.target.value });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all appearance-none cursor-pointer hover:bg-white"
                                >
                                    {AI_MODELS.map(model => (
                                        <option key={model.id} value={model.id}>
                                            {model.name} {model.id === 'dalle-3' ? '🔥 (นิยมที่สุด)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-1 flex items-start gap-2 bg-violet-50/50 p-2 rounded-lg border border-violet-100/50">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-slate-600 leading-tight">
                            <span className="font-bold text-violet-700">{AI_MODELS.find(m => m.id === selectedModelId)?.name}:</span> {AI_MODELS.find(m => m.id === selectedModelId)?.description}
                        </p>
                    </div>

                    {(state.scrapedContent?.price || state.scrapedContent?.variantGroups?.length) && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900 space-y-2">
                            <div className="flex items-center justify-between gap-2"><span className="font-black">ข้อมูลการขายที่ดึงได้</span><span className="rounded-full bg-white px-2 py-0.5 font-bold">{state.scrapedContent?.price?.display || 'ไม่มีราคา'}</span></div>
                            {(state.scrapedContent?.variantGroups || []).map(group => <div key={group.id}><span className="font-bold">{group.name}: </span><span>{group.options.map(option => `${option.label}${option.price?.display ? ` ${option.price.display}` : ''}`).join(' · ')}</span></div>)}
                            <p className="text-[10px] text-emerald-700">ส่งต่อไปแก้ไขราคาและเลือกตัวเลือกที่ต้องการสร้างภาพได้ใน Shopee Master</p>
                        </div>
                    )}

                    <button
                        className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1"
                        onClick={async () => {
                            try {
                                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                                const productUrl = state.sourceProductUrl || tab?.url || '';

                                await chrome.runtime.sendMessage({
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
                            } catch (error) {
                                console.error('Failed to send to Shopee Master:', error);
                                alert('ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
                            }
                        }}
                    >
                        <Sparkles className="w-5 h-5 text-white" />
                        ส่งไป Shopee Master
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            className="bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-all text-xs"
                            onClick={() => sendToAiChat('gemini')}
                        >
                            ส่งไป Google Gem
                        </button>
                        <button
                            className="bg-slate-800 text-white font-semibold py-2.5 rounded-xl hover:bg-slate-900 transition-all text-xs"
                            onClick={() => sendToAiChat('chatgpt')}
                        >
                            ส่งไป ChatGPT
                        </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500">Gemini วางรูปในช่องข้อความเดียวกัน: กดคัดลอกรูป แล้วคลิกช่องแชต Gemini และกด Ctrl+V (วางได้ครั้งละ 1 รูป)</p>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedImages.map((imageUrl, index) => (
                                <button
                                    key={imageUrl}
                                    className="bg-white border border-slate-300 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-all text-[11px]"
                                    onClick={() => copySelectedImage(imageUrl, index + 1)}
                                >
                                    คัดลอกรูป {index + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-2.5 space-y-2">
                        <p className="text-[10px] font-black text-violet-800">เครื่องมือ Prompt และดาวน์โหลด · {selectedImages.length} รูปที่เลือก</p>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                className="min-h-12 rounded-lg bg-violet-600 px-1.5 py-2 text-[10px] font-bold leading-tight text-white hover:bg-violet-700 transition-colors"
                                onClick={copyGridPrompt}
                            >
                                1. Prompt Grid 3×3
                            </button>
                            <button
                                className="min-h-12 rounded-lg border border-violet-200 bg-white px-1.5 py-2 text-[10px] font-bold leading-tight text-violet-700 hover:bg-violet-50 transition-colors"
                                onClick={copyProductInfo}
                            >
                                2. คัดลอกข้อมูล
                            </button>
                            <button
                                className="min-h-12 rounded-lg bg-slate-800 px-1.5 py-2 text-[10px] font-bold leading-tight text-white hover:bg-slate-900 transition-colors disabled:opacity-60"
                                onClick={downloadSelectedPackage}
                                disabled={isExportingPackage}
                            >
                                {isExportingPackage ? 'กำลังสร้าง ZIP...' : '3. โหลด ZIP'}
                            </button>
                        </div>
                    </div>

                    </>}

                    <button
                        className="w-full bg-violet-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                กำลังประมวลผล...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                วิเคราะห์ {selectedImages.length} รูป
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
