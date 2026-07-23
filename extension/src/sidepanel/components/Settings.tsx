import { X, Save, Globe, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsProps {
    onClose: () => void;
}

type SettingsStorage = {
    webapp_url?: string;
    gemini_gem_url?: string;
    gemini_gem_urls?: string[];
    gemini_chat_url?: string;
    chatgpt_url?: string;
};

export function Settings({ onClose }: SettingsProps) {
    const [webappUrl, setWebappUrl] = useState('https://sunzz01-webapp.vercel.app/');
    const [geminiGemUrls, setGeminiGemUrls] = useState<string[]>(['https://gemini.google.com/app']);
    const [geminiChatUrl, setGeminiChatUrl] = useState('https://gemini.google.com/app');
    const [chatGptUrl, setChatGptUrl] = useState('https://chatgpt.com/');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(['webapp_url', 'gemini_gem_urls', 'gemini_gem_url', 'gemini_chat_url', 'chatgpt_url'], (result: SettingsStorage) => {
            if (result.webapp_url) setWebappUrl(result.webapp_url);
            if (Array.isArray(result.gemini_gem_urls) && result.gemini_gem_urls.length > 0) {
                setGeminiGemUrls(result.gemini_gem_urls.filter((url): url is string => typeof url === 'string').slice(0, 5));
            } else if (result.gemini_gem_url) {
                setGeminiGemUrls([result.gemini_gem_url]);
            }
            if (result.gemini_chat_url) setGeminiChatUrl(result.gemini_chat_url);
            if (result.chatgpt_url) setChatGptUrl(result.chatgpt_url);
        });
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        chrome.storage.local.set({
            webapp_url: webappUrl,
            // Keep the old key as a compatibility fallback for older builds.
            gemini_gem_url: geminiGemUrls[0] || '',
            gemini_gem_urls: geminiGemUrls.map(url => url.trim()).filter(Boolean).slice(0, 5),
            gemini_chat_url: geminiChatUrl,
            chatgpt_url: chatGptUrl
        }, () => {
            setTimeout(() => {
                setIsSaving(false);
                onClose();
            }, 400);
        });
    };

    return (
        <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl max-w-sm mx-auto animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center shadow-md shadow-orange-200">
                        <Globe className="w-4 h-4" />
                    </div>
                    ตั้งค่าลิงก์เชื่อมต่อ
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Web App URL */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-orange-500" /> PicSeller WebApp URL
                    </label>
                    <input
                        type="url"
                        value={webappUrl}
                        onChange={(e) => setWebappUrl(e.target.value)}
                        placeholder="https://sunzz01-webapp.vercel.app/"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 px-1">ลิงก์หน้าเว็บ PicSeller ของคุณที่เปิดไว้ให้ Extension ส่งข้อมูลสินค้าไปหา</p>
                </div>

                {/* Custom Gems (up to five) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Globe className="w-3 h-3 text-blue-500" /> Google Gem URL (สูงสุด 5 GEM)
                        </label>
                        <span className="text-[10px] font-bold text-blue-500">{geminiGemUrls.length}/5</span>
                    </div>
                    {geminiGemUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="w-12 shrink-0 text-center text-[10px] font-black text-blue-600 bg-blue-50 rounded-lg py-2">GEM {index + 1}</span>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setGeminiGemUrls(current => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                                placeholder="https://gemini.google.com/gem/..."
                                className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            {geminiGemUrls.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setGeminiGemUrls(current => current.filter((_, itemIndex) => itemIndex !== index))}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title={`ลบ GEM ${index + 1}`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {geminiGemUrls.length < 5 && (
                        <button
                            type="button"
                            onClick={() => setGeminiGemUrls(current => [...current, ''])}
                            className="w-full border border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl py-2 text-xs font-bold transition-colors"
                        >
                            + เพิ่ม GEM อีกอัน
                        </button>
                    )}
                    <p className="text-[10px] text-slate-400 px-1">ใส่ลิงก์ Custom Gem เช่น https://gemini.google.com/gem/7f83a662689a</p>
                </div>

                {/* Gemini Chat URL */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-emerald-500" /> Gemini Chat URL
                    </label>
                    <input
                        type="url"
                        value={geminiChatUrl}
                        onChange={(e) => setGeminiChatUrl(e.target.value)}
                        placeholder="https://gemini.google.com/app"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 px-1">แชต Gemini ปกติ แยกจาก Custom Gem</p>
                </div>

                {/* ChatGPT URL */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-700" /> ChatGPT URL
                    </label>
                    <input
                        type="url"
                        value={chatGptUrl}
                        onChange={(e) => setChatGptUrl(e.target.value)}
                        placeholder="https://chatgpt.com/"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700 transition-all"
                    />
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกการตั้งค่า
            </button>
        </div>
    );
}
