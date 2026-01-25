import { ChevronRight, Sparkles, Loader2, Copy } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useState } from 'react';
import type { SellingContent, ContentStyle } from '../../types';

export function StepContent() {
    const { state, dispatch, goToPrevStep, goToNextStep } = useAppFlow();
    const { analysisResult, sellingContent, selectedGenModel } = state;
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<ContentStyle>('fun');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleGenerateContent = async () => {
        if (!analysisResult) return;

        setIsGenerating(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'CALL_AI_MODEL',
                payload: {
                    images: state.selectedImages, // Just for context, though text based is enough
                    customPrompt: `Generate selling content for this product. 
                    Style: ${selectedStyle}. 
                    Output JSON format with fields: headline, content (product description), hashtags (array).`,
                    modelId: selectedGenModel
                }
            });

            if (response.success && response.data) {
                // The prompt might need to be more specific to get back the SellingContent structure
                // But let's assume the background worker can handle it or we refine the prompt here.

                // Refined prompt for reliability:
                const promptParts = [
                    "You are a professional e-commerce copywriter.",
                    `Product: ${analysisResult.product_name}`,
                    `Features: ${analysisResult.key_features.join(', ')}`,
                    `Style: ${selectedStyle}`,
                    "Return STRICT JSON with keys: headline, content, hashtags."
                ];

                const finalResponse = await chrome.runtime.sendMessage({
                    type: 'CALL_AI_MODEL',
                    payload: {
                        images: [],
                        customPrompt: promptParts.join('\n'),
                        modelId: selectedGenModel
                    }
                });

                if (finalResponse.success && finalResponse.data) {
                    const data = finalResponse.data;
                    // If the AI returns multiple fields, try to extract them
                    const result: SellingContent = {
                        style: selectedStyle,
                        headline: data.headline || data.product_name || "Product Headline",
                        content: data.content || data.description || "Product Description",
                        hashtags: Array.isArray(data.hashtags) ? data.hashtags : ["#shopee", "#lazada"]
                    };
                    dispatch({ type: 'SET_SELLING_CONTENT', payload: result });
                }
            } else {
                throw new Error(response.error || 'Content generation failed');
            }
        } catch (error) {
            console.error(error);
            alert('ล้มเหลวในการสร้างเนื้อหา: ' + (error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={goToPrevStep} className="text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="font-bold text-slate-800">สร้างเนื้อหาการขาย</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <label className="text-xs font-bold text-violet-600 uppercase flex items-center gap-1.5 mb-3">
                        <Sparkles className="w-3.5 h-3.5" /> เลือกสไตล์การเขียน
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'fun', name: 'ขี้เล่น/เป็นกันเอง' },
                            { id: 'story', name: 'เน้นเล่าเรื่อง' },
                            { id: 'formal', name: 'ทางการ/เชื่อถือได้' }
                        ].map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id as ContentStyle)}
                                className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${selectedStyle === style.id ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-violet-300'}`}
                            >
                                {style.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                    className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            กำลังคิดแคปชั่น...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            สร้างเนื้อหาใหม่ด้วย AI
                        </>
                    )}
                </button>
            </div>

            {sellingContent && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Headline Box */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">ชื่อสินค้าที่แนะนำ</label>
                        <h3 className="text-lg font-bold text-slate-800 pr-8">{sellingContent.headline}</h3>
                        <button
                            onClick={() => copyToClipboard(sellingContent.headline)}
                            className="absolute right-4 top-10 p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-violet-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content Box */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">รายละเอียดสินค้า</label>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed pr-8">
                            {sellingContent.content}
                        </p>
                        <button
                            onClick={() => copyToClipboard(sellingContent.content)}
                            className="absolute right-4 top-10 p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-violet-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Hashtags Box */}
                    <div className="bg-violet-50 rounded-2xl border border-violet-100 p-4">
                        <label className="text-[10px] font-bold text-violet-600 uppercase mb-2 block">Hashtags ที่แนะนำ</label>
                        <div className="flex flex-wrap gap-2">
                            {sellingContent.hashtags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-violet-700 border border-violet-200 shadow-sm">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.1)] z-20">
                <button
                    className="w-full bg-slate-800 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={goToNextStep}
                >
                    <div className="flex items-center gap-2">
                        <span>ขั้นตอนสุดท้าย: ส่งออกข้อมูล</span>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </button>
            </div>
        </div>
    );
}
