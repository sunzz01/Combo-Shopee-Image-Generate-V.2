import { ArrowLeft, ImageIcon, CheckCircle2, Circle, ChevronRight, Copy, Wand2, Loader2, Sparkles } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useState } from 'react';
import { AI_MODELS } from '../../services/aiService';

export function StepSelect() {
    const { state, dispatch, goToPrevStep, goToNextStep } = useAppFlow();
    const { scannedImages, selectedImages, selectedModelId } = state;
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const toggleImageSelection = (src: string) => {
        dispatch({ type: 'TOGGLE_IMAGE_SELECTION', payload: src });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
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
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.12)] flex flex-col gap-3">
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

                    <button
                        className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1"
                        onClick={async () => {
                            try {
                                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                                const productUrl = tab?.url || '';

                                await chrome.runtime.sendMessage({
                                    type: 'SEND_TO_PICSELLER',
                                    payload: {
                                        productUrl,
                                        productName: state.scrapedContent?.productName || state.analysisResult?.product_name || tab?.title?.split('|')[0]?.split('-')[0]?.trim() || '',
                                        productDesc: state.scrapedContent?.productDescription || state.analysisResult?.ideal_lifestyle_setting || '',
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
