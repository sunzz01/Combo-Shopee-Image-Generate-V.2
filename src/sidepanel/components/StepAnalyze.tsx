import { ChevronRight, Eraser, Loader2, CheckCircle2, Wand2, Sparkles } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useState, useEffect } from 'react';
import type { ImageStyle, GeneratedPrompt } from '../../types';

export function StepAnalyze() {
    const { state, dispatch, goToPrevStep, goToNextStep } = useAppFlow();
    const {
        analysisResult,
        selectedImages,
        processedImage,
        selectedSlideType,
        selectedStyle,
        customPrompt,
        selectedGenModel
    } = state;

    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [removeBgApiKey, setRemoveBgApiKey] = useState('');

    useEffect(() => {
        chrome.storage.local.get(['remove_bg_api_key'], (result) => {
            if (result.remove_bg_api_key) {
                setRemoveBgApiKey(result.remove_bg_api_key as string);
            }
        });
    }, []);

    const handleRemoveBg = async () => {
        if (selectedImages.length === 0) return;
        if (!removeBgApiKey) {
            alert('กรุณาใส่ Remove.bg API Key ในหน้าตั้งค่าก่อนครับ');
            // Ideally redirect to settings, but for now alert.
            return;
        }

        setIsRemovingBg(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'REMOVE_BACKGROUND',
                imageUrl: selectedImages[0]
            });

            if (response.success) {
                dispatch({ type: 'SET_PROCESSED_IMAGE', payload: response.data });
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error(error);
            alert('ลบพื้นหลังไม่สำเร็จ: ' + (error as Error).message);
        } finally {
            setIsRemovingBg(false);
        }
    };

    const handleGeneratePrompts = async () => {
        if (!analysisResult) return;

        setIsGeneratingPrompts(true);
        dispatch({ type: 'SET_IS_GENERATING', payload: true });

        try {
            const base64Images: string[] = [];
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            for (const imgSrc of selectedImages) {
                if (imgSrc.startsWith('data:')) {
                    base64Images.push(imgSrc);
                } else if (imgSrc.startsWith('http') && tab?.id) {
                    try {
                        const response = await chrome.tabs.sendMessage(tab.id, {
                            type: 'FETCH_IMAGE_BASE64',
                            imageUrl: imgSrc
                        });
                        if (response?.status === 'OK' && response.base64) {
                            base64Images.push(response.base64 as string);
                        }
                    } catch (error) {
                        console.warn('Failed to convert image to base64:', error);
                    }
                }
            }

            if (base64Images.length === 0) {
                alert('ไม่สามารถเตรียมรูปภาพสำหรับ AI ได้');
                return;
            }

            const response = await chrome.runtime.sendMessage({
                type: 'CALL_AI_MODEL',
                payload: {
                    images: base64Images,
                    style: selectedStyle,
                    language: 'th',
                    fidelity: 'strict',
                    slideType: selectedSlideType,
                    customPrompt: customPrompt,
                    modelId: selectedGenModel
                }
            });

            if (response?.success) {
                const prompts = (response.data?.prompts || []) as GeneratedPrompt[];
                dispatch({ type: 'SET_GENERATED_PROMPTS', payload: prompts });
                goToNextStep(); // Proceed to GENERATE (Prompts View)
            } else {
                throw new Error(response?.error || 'AI model call failed');
            }
        } catch (error) {
            console.error('CALL_AI_MODEL failed:', error);
            alert('การสร้างแผนรูปภาพด้วย AI ล้มเหลว: ' + (error as Error).message);
        } finally {
            setIsGeneratingPrompts(false);
            dispatch({ type: 'SET_IS_GENERATING', payload: false });
        }
    };

    if (!analysisResult) return <div className="p-8 text-center text-slate-400">No analysis result</div>;

    return (
        <div className="space-y-4 pb-20">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={goToPrevStep} className="text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="font-bold text-slate-800">ผลการวิเคราะห์</h2>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{analysisResult.product_name}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                        {selectedImages.length} รูป
                    </span>
                </div>

                {/* Image Gallery Scroll */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
                    {/* Main Image (First one) */}
                    <div className="relative w-24 h-24 rounded-lg bg-slate-100 flex-shrink-0 border-2 border-indigo-100 overflow-hidden group shadow-sm">
                        {processedImage ? (
                            <img src={processedImage} alt="Processed" className="w-full h-full object-contain bg-[url('https://media.istockphoto.com/id/1226500742/vector/transparent-pattern-grid-seamless-background.jpg?s=612x612&w=0&k=20&c=v2s8T7Qz1Xm1vLd0Qh_kL1d_kL1d_kL1d_kL1d')] bg-cover" />
                        ) : (
                            <img src={selectedImages[0]} alt="Original" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            MAIN
                        </div>
                    </div>

                    {/* Other Selected Images */}
                    {selectedImages.slice(1).map((img, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-lg bg-slate-50 flex-shrink-0 border border-slate-200 overflow-hidden">
                            <img src={img} alt={`Selected ${idx + 2}`} className="w-full h-full object-cover" />
                            <div className="absolute top-1 right-1 w-5 h-5 bg-black/40 backdrop-blur-sm rounded-full text-white flex items-center justify-center text-[10px] font-bold">
                                {idx + 2}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controls for Main Image */}
                <div>
                    {!processedImage ? (
                        <button
                            onClick={handleRemoveBg}
                            disabled={isRemovingBg}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200 border-dashed"
                        >
                            {isRemovingBg ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังลบพื้นหลัง...
                                </>
                            ) : (
                                <>
                                    <Eraser className="w-3.5 h-3.5" /> ลบพื้นหลัง (ภาพหลัก)
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ลบพื้นหลังเรียบร้อย
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">ชื่อสินค้าแนะนำ</label>
                    <h3 className="text-lg font-bold text-violet-700">{analysisResult.product_name}</h3>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">จุดเด่น</label>
                    <ul className="mt-1 space-y-1">
                        {analysisResult.key_features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ... Other analysis details (Materials, Dimensions) ... */}

                <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase">1. เลือกประเภทภาพที่ต้องการสร้าง</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {[
                            { id: 'Cover', name: 'ภาพปกสินค้า' },
                            { id: 'Features', name: 'คุณสมบัติเด่น' },
                            { id: 'Lifestyle', name: 'ภาพการใช้งาน' },
                            { id: 'Spec', name: 'สเปก/ขนาด' },
                            { id: 'Promotion', name: 'โปรโมชั่น' },
                            { id: 'Comparison', name: 'เปรียบเทียบ' },
                            { id: 'Reviews', name: 'รีวิวลูกค้า' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => dispatch({ type: 'SET_SLIDE_TYPE', payload: type.id })}
                                className={`px-3 py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-2 ${selectedSlideType === type.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${selectedSlideType === type.id ? 'bg-white' : 'bg-slate-300'}`} />
                                {type.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">2. สไตล์ภาพที่แนะนำ</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {(['Minimalist', 'Luxury', 'Nature', 'Urban', 'Studio'] as ImageStyle[]).map(style => (
                            <button
                                key={style}
                                onClick={() => dispatch({ type: 'SET_STYLE', payload: style })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedStyle === style ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">3. ปรับแต่ง Prompt (ถ้าต้องการ)</label>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => dispatch({ type: 'SET_CUSTOM_PROMPT', payload: e.target.value })}
                        placeholder="เช่น เพิ่มแสงสีส้มแบบพระอาทิตย์ตก หรือ ใส่เงาสะท้อนที่พื้น..."
                        className="w-full mt-2 p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px] bg-slate-50/50"
                    />
                </div>

                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 mt-2">
                    <label className="text-xs font-bold text-violet-700 uppercase flex items-center gap-1.5 mb-2">
                        <Wand2 className="w-3.5 h-3.5" /> 4. เลือกโมเดล AI สำหรับสร้างรูป
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: 'dalle-3', name: 'DALL-E 3', desc: 'คุณภาพดีที่สุด เข้าใจภาษาคนเก่ง' },
                            { id: 'imagen-3', name: 'Imagen 3', desc: 'ภาพสมจริง แก้ไขรูปภาพได้ดี' },
                            { id: 'gemini-2-5-flash-image', name: 'Gemini 2.5 Flash', desc: 'เร็วมาก และวิเคราะห์รูปต้นฉบับได้แม่น' }
                        ].map(model => (
                            <button
                                key={model.id}
                                onClick={() => dispatch({ type: 'SET_GEN_MODEL', payload: model.id })}
                                className={`p-3 rounded-lg border text-left transition-all ${selectedGenModel === model.id ? 'bg-white border-violet-500 ring-2 ring-violet-500/10 shadow-sm' : 'bg-white/50 border-slate-200 opacity-70 hover:opacity-100 hover:border-violet-300'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-bold ${selectedGenModel === model.id ? 'text-violet-700' : 'text-slate-700'}`}>{model.name}</span>
                                    {selectedGenModel === model.id && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">{model.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-2">
                <button
                    className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={async () => {
                        try {
                            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                            const productUrl = tab?.url || '';

                            await chrome.runtime.sendMessage({
                                type: 'SEND_TO_SHOPEE_MASTER',
                                payload: {
                                    productUrl,
                                    productName: analysisResult?.product_name || '',
                                    productDesc: `Features: ${analysisResult?.key_features.join(', ')}. Setting: ${analysisResult?.ideal_lifestyle_setting}`,
                                    images: selectedImages
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

                <button
                    className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    onClick={handleGeneratePrompts}
                    disabled={isGeneratingPrompts}
                >
                    {isGeneratingPrompts ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            กำลังสร้างแผนรูปภาพ...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-5 h-5" />
                            วางแผนรูปภาพ ({selectedStyle})
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
