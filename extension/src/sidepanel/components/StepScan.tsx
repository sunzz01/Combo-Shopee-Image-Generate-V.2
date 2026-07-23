import { Scan, Sparkles } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { AI_MODELS } from '../../services/aiService';
import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function StepScan() {
    const { dispatch, goToNextStep, state } = useAppFlow();
    const { selectedModelId } = state;
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const checkConnection = async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id && tab.url?.startsWith('http')) {
                chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (response) => {
                    if (chrome.runtime.lastError || response?.status !== 'PONG') {
                        setIsConnected(false);
                    } else {
                        setIsConnected(true);
                    }
                });
            }
        };
        checkConnection();
    }, []);

    const handleScan = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab?.id) return;

            // Check if it's a valid web page
            if (!tab.url || !tab.url.startsWith('http')) {
                alert('⚠️ กรุณาเปิดหน้าเว็บไซต์สินค้า (Shopee, Lazada, ฯลฯ) ก่อนเริ่มการสแกนครับ');
                return;
            }

            // เก็บหน้าต้นทางทันที เพื่อไม่ให้ URL ของ Gemini/ChatGPT ที่เปิดภายหลังมาแทนที่
            dispatch({ type: 'SET_SOURCE_PRODUCT_URL', payload: tab.url });

            chrome.tabs.sendMessage(tab.id, { type: 'SCAN_IMAGES' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    alert('🔄 ตรวจพบการอัปเดตระบบ! กรุณากดปุ่ม Refresh หน้าเว็บสินค้า 1 ครั้ง เพื่อให้ระบบเริ่มทำงานใหม่ครับ');
                    return;
                }

                if (response && response.images && response.images.length > 0) {
                    dispatch({ type: 'SET_SCANNED_IMAGES', payload: response.images });

                    if (response.content) {
                        dispatch({ type: 'SET_SCRAPED_CONTENT', payload: response.content });
                    }

                    goToNextStep(); // Go to SELECT
                } else {
                    alert('📸 ไม่พบรูปภาพสินค้าในหน้านี้... ลองเลื่อนหน้าเว็บลงมาให้รูปภาพโหลดขึ้นมา แล้วกดสแกนใหม่อีกครั้งครับ');
                }
            });
        } catch (error) {
            console.error('Scan failed:', error);
            alert('❌ เกิดข้อผิดพลาดในการสแกน: ' + (error as Error).message);
        }
    };

    return (
        <div className="space-y-6">
            {!isConnected && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 animate-pulse">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-xs font-bold text-amber-800">ต้องรีเฟรชหน้าเว็บ</p>
                        <p className="text-[10px] text-amber-700 leading-tight">
                            ระบบตรวจพบว่าหน้าเว็บยังไม่ได้รีเฟรช กรุณากดปุ่ม Refresh ที่เบราว์เซอร์เพื่อให้ตัวช่วยสแกนทำงานได้ครับ
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div
                onClick={handleScan}
                className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow cursor-pointer"
            >
                <div className="relative z-10">
                    <h2 className="text-xl font-bold mb-2">สแกนรูปภาพสินค้า</h2>
                    <p className="text-violet-100 text-sm mb-4">
                        ดึงรูปภาพคุณภาพสูงจากทุกหน้าเว็บเพื่อนำมาวิเคราะห์ด้วย AI
                    </p>
                    <div className="bg-white text-violet-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-opacity-90 transition-all flex items-center gap-2 w-fit">
                        <Scan className="w-4 h-4" />
                        เริ่มการสแกน
                    </div>
                </div>
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                        MODEL: {AI_MODELS.find(m => m.id === selectedModelId)?.name}
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-500/80 px-2 py-0.5 rounded-full">READY</span>
                </div>
                <Sparkles className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
            </div>

            <div className="flex gap-2">
                {['All Websites Support'].map(p => (
                    <span key={p} className="text-[10px] font-medium px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-400 capitalize">{p}</span>
                ))}
            </div>
        </div>
    );
}
