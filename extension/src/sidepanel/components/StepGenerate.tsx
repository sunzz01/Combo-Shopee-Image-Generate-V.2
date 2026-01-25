import { ChevronRight, Copy, Wand2, Plus, Minus, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { useState, useEffect } from 'react';
import { AI_MODELS } from '../../services/aiService';

export function StepGenerate() {
    const { state, dispatch, goToPrevStep, goToNextStep } = useAppFlow();
    const { generatedPrompts, generatedImages, selectedGenModel } = state;

    const [selectedPromptId, setSelectedPromptId] = useState<number>(
        generatedPrompts.length > 0 ? generatedPrompts[0].id : 0
    );

    const [counts, setCounts] = useState<Record<number, number>>(
        generatedPrompts.reduce((acc, p) => ({ ...acc, [p.id]: 1 }), {})
    );

    const [isGenerating, setIsGenerating] = useState(false);
    const [localGenModel, setLocalGenModel] = useState(selectedGenModel);

    // Sync local model when global state changes or on mount
    useEffect(() => {
        setLocalGenModel(selectedGenModel);
    }, [selectedGenModel]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const updateCount = (delta: number) => {
        setCounts(prev => ({
            ...prev,
            [selectedPromptId]: Math.max(1, Math.min(4, (prev[selectedPromptId] || 1) + delta))
        }));
    };

    const handleGenerate = async () => {
        const prompt = generatedPrompts.find(p => p.id === selectedPromptId);
        if (!prompt) return;

        const count = counts[selectedPromptId] || 1;
        setIsGenerating(true);

        try {
            const results: string[] = [];
            for (let i = 0; i < count; i++) {
                const response = await chrome.runtime.sendMessage({
                    type: 'GENERATE_IMAGE',
                    payload: {
                        prompt: prompt.prompt,
                        modelId: localGenModel
                    }
                });

                if (response.success && response.data?.imageUrl) {
                    results.push(response.data.imageUrl);
                } else {
                    throw new Error(response.error || 'Generation failed');
                }
            }

            dispatch({ type: 'ADD_GENERATED_IMAGES', payload: results });

        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการสร้างภาพ: ' + (error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Only show models that support generation (simplified for this extension)
    const genModels = AI_MODELS.filter(m => ['dalle-3', 'imagen-3', 'phaya-ai', 'gemini-2-5-flash-image', 'gemini-3-pro-image'].includes(m.id));

    return (
        <div className="space-y-4 pb-80">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={goToPrevStep} className="text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="font-bold text-slate-800">แผนการสร้างรูป ({generatedPrompts.length})</h2>
            </div>

            {/* Prompts Gallery */}
            <div className="space-y-4">
                {generatedPrompts.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedPromptId(item.id)}
                        className={`bg-white rounded-2xl border transition-all cursor-pointer ${selectedPromptId === item.id ? 'border-violet-600 ring-2 ring-violet-50 shadow-md' : 'border-slate-200 opacity-80 hover:opacity-100'}`}
                    >
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${selectedPromptId === item.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    IMAGE PROMPT {item.id}
                                </span>
                                <div className="flex items-center gap-2">
                                    {selectedPromptId === item.id && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
                                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(item.prompt); }} className="text-slate-400 hover:text-violet-600 transition-colors">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">{item.type}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.description}</p>
                            <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed break-words max-h-40 overflow-y-auto transition-colors ${selectedPromptId === item.id ? 'bg-violet-50/50 border-violet-100 text-violet-900' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                {item.prompt}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Results Section */}
            {generatedImages.length > 0 && (
                <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-violet-500" />
                            ภาพที่สร้างสำเร็จ ({generatedImages.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {generatedImages.map((src, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-sm">
                                <img src={src} className="w-full h-full object-cover" alt={`Generated ${idx}`} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => window.open(src, '_blank')}
                                        className="p-2 bg-white rounded-lg text-slate-800 hover:bg-slate-50 transition-colors shadow-lg"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Interactive Generation Panel (at the bottom but not fixed) */}
            <div className="mt-8 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-4">
                {/* Step 1: Model Selection */}
                <div>
                    <label className="text-xs font-bold text-violet-600 uppercase flex items-center gap-1.5 mb-2">
                        <Wand2 className="w-3.5 h-3.5" /> เลือกโมเดล AI
                    </label>
                    <div className="relative">
                        <select
                            value={localGenModel}
                            onChange={(e) => {
                                setLocalGenModel(e.target.value);
                                dispatch({ type: 'SET_GEN_MODEL', payload: e.target.value });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                        >
                            {genModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Step 2: Generation Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !selectedPromptId}
                        className="flex-1 bg-violet-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                กำลังสร้าง {counts[selectedPromptId]} ภาพ...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                สร้างภาพ (Image {generatedPrompts.find(p => p.id === selectedPromptId)?.id || ''})
                            </>
                        )}
                    </button>

                    <div className="flex items-center bg-slate-100 rounded-2xl p-1.5 border border-slate-200">
                        <button
                            onClick={() => updateCount(-1)}
                            className="p-2 hover:bg-white rounded-xl text-slate-500 transition-colors"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <span className="w-10 text-center font-bold text-slate-800 text-lg">
                            {counts[selectedPromptId] || 1}
                        </span>
                        <button
                            onClick={() => updateCount(1)}
                            className="p-2 hover:bg-white rounded-xl text-slate-500 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center italic">
                    * คลิกเลือกภาพด้านบนที่ต้องการใช้ Prompt เพื่อทำการสร้างภาพ
                </p>
            </div>

            {/* Final Action Bar (Fixed at the very bottom) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.1)] z-20">
                <button
                    className="w-full bg-slate-800 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={goToNextStep}
                >
                    <div className="flex items-center gap-2">
                        <span>ไปที่หน้าดาวน์โหลด</span>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </button>
            </div>
        </div>
    );
}

// Simple Helper Icon if Sparkles is missing or want specific one
function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    )
}
