import { X, Save, Key, Globe, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsProps {
    onClose: () => void;
}

type SettingsStorage = {
    gemini_api_key?: string;
    phaya_api_key?: string;
    openai_api_key?: string;
    phaya_api_url?: string;
    webapp_url?: string;
};

export function Settings({ onClose }: SettingsProps) {
    const [geminiKey, setGeminiKey] = useState('');
    const [phayaKey, setPhayaKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [phayaUrl, setPhayaUrl] = useState('https://api.phaya.io/api/v1/chat/completions');
    const [webappUrl, setWebappUrl] = useState('https://webapp-bice-gamma-40.vercel.app/');
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(['gemini_api_key', 'phaya_api_key', 'openai_api_key', 'phaya_api_url', 'webapp_url'], (result: SettingsStorage) => {
            if (result.gemini_api_key) setGeminiKey(result.gemini_api_key);
            if (result.phaya_api_key) setPhayaKey(result.phaya_api_key);
            if (result.openai_api_key) setOpenaiKey(result.openai_api_key);
            if (result.phaya_api_url) setPhayaUrl(result.phaya_api_url);
            if (result.webapp_url) setWebappUrl(result.webapp_url);
        });
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        chrome.storage.local.set({
            gemini_api_key: geminiKey,
            phaya_api_key: phayaKey,
            openai_api_key: openaiKey,
            phaya_api_url: phayaUrl,
            webapp_url: webappUrl
        }, () => {
            setTimeout(() => {
                setIsSaving(false);
                onClose();
            }, 500);
        });
    };

    const toggleShow = (key: string) => {
        setShowKey(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl max-w-sm mx-auto animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4" />
                    </div>
                    ตั้งค่า API
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-5">
                {/* Gemini Key */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Gemini API Key</label>
                    <div className="relative">
                        <input
                            type={showKey['gemini'] ? 'text' : 'password'}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AI Studio API Key"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                        <button onClick={() => toggleShow('gemini')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showKey['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Phaya Key */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phaya.io API Key</label>
                    <div className="relative">
                        <input
                            type={showKey['phaya'] ? 'text' : 'password'}
                            value={phayaKey}
                            onChange={(e) => setPhayaKey(e.target.value)}
                            placeholder="Phaya Platform Key"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                        <button onClick={() => toggleShow('phaya')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showKey['phaya'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* OpenAI Key */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">OpenAI API Key (DALL-E 3)</label>
                    <div className="relative">
                        <input
                            type={showKey['openai'] ? 'text' : 'password'}
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                        <button onClick={() => toggleShow('openai')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showKey['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Phaya URL */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Phaya API URL
                    </label>
                    <input
                        type="text"
                        value={phayaUrl}
                        onChange={(e) => setPhayaUrl(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-mono text-slate-500 focus:outline-none focus:border-slate-400"
                    />
                </div>

                {/* Web App URL */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Web App URL (Vercel / Local)
                    </label>
                    <input
                        type="text"
                        value={webappUrl}
                        onChange={(e) => setWebappUrl(e.target.value)}
                        placeholder="https://webapp-bice-gamma-40.vercel.app/"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-mono text-slate-500 focus:outline-none focus:border-slate-400"
                    />
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-slate-200 hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                บันทึกการตั้งค่า
            </button>
        </div>
    );
}
