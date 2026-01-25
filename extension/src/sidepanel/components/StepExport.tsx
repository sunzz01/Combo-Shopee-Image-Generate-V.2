import { ChevronRight, Download, Loader2 } from 'lucide-react';
import { useAppFlow } from '../hooks/useFlowStore';
import { exportPackage } from '../../services/exportService';
import { useState } from 'react';

export function StepExport() {
    const { state, goToPrevStep } = useAppFlow();
    const { analysisResult, generatedPrompts, selectedImages, processedImage, generatedImages, sellingContent } = state;
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!analysisResult) return;

        setIsExporting(true);
        try {
            await exportPackage(
                analysisResult,
                generatedPrompts,
                selectedImages[0],
                processedImage,
                generatedImages,
                sellingContent
            );
        } catch (error) {
            console.error(error);
            alert('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={goToPrevStep} className="text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="font-bold text-slate-800">ส่งออกข้อมูล</h2>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Download className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">พร้อมดาวน์โหลด</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        คุณมี {generatedPrompts.length} แผนรูปภาพ และข้อมูลสินค้าที่วิเคราะห์แล้ว
                    </p>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button
                    className="w-full bg-slate-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            กำลังสร้างไฟล์ Zip...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            ดาวน์โหลดข้อมูลทั้งหมด (Zip)
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
