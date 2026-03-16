import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Globe,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Upload,
  X,
  AlertCircle,
  LayoutGrid,
  FileArchive,
  Search,
  Eye,
  Info,
  ArrowRightCircle,
  ShoppingBag,
  Zap,
  Target,
  Moon,
  Sun, // เพิ่มไอคอนสำหรับธีม
  RotateCcw,
  Scissors
} from 'lucide-react';
import JSZip from 'jszip';
import { ImageCategory, IMAGE_CATEGORIES_METADATA, ProductData, GeneratedImage } from './types';
import { analyzeProduct, generateProductImage } from './geminiService';
import { useTheme } from './src/contexts/ThemeContext'; // นำเข้า hook สำหรับจัดการธีม

const STYLES = [
  {
    id: 'alibaba',
    name: 'Alibaba Style',
    desc: 'B2B focus, bold design, verified supplier badges, industrial trust',
    promptTemplate: 'Alibaba B2B style: bold badges (Verified Supplier), urgent colors, professional/industrial context, trust-focused.'
  },
  {
    id: 'aliexpress',
    name: 'AliExpress Style',
    desc: 'Global marketplace, clean premium look, high-res angles, free shipping icons',
    promptTemplate: 'AliExpress global style: white background, 360° views, texture close-ups, clean premium aesthetic.'
  },
  {
    id: 'etsy',
    name: 'Etsy Style',
    desc: 'Artisanal & rustic, natural textures, handmade quality, emotional connection',
    promptTemplate: 'Etsy artisan style: warm natural textures, handmade aesthetic, storytelling, emotional connection.'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    desc: 'Apple-like aesthetic, extensive white space, focus on form and design',
    promptTemplate: 'Minimalist premium style: maximum white space, geometric composition, product as hero, no clutter.'
  },
  {
    id: '1688',
    name: '1688 Style',
    desc: 'Wholesale bulk imagery, factory-direct look, price tags and MOQ focus',
    promptTemplate: '1688 wholesale style: shows bulk quantity, large price tags, factory-direct, info-dense B2B focus.'
  },
  {
    id: 'taobao',
    name: 'Taobao Style',
    desc: 'Comprehensive info-graphics, colorful backgrounds, multiple angles in one',
    promptTemplate: 'Taobao comprehensive style: colorful, multiple angles in one image, detailed specs graphics, lively.'
  },
  {
    id: 'pinduoduo',
    name: 'Pinduoduo Style',
    desc: 'Urgent group-buy design, vibrant colors, dramatic price labels, countdowns',
    promptTemplate: 'Pinduoduo group-buy style: vibrant colors, huge discount text, countdown timer, urgency-focused.'
  },
  {
    id: 'xianyu',
    name: 'Xianyu Style',
    desc: 'Second-hand/C2C raw photography, honest real-life settings, ambient light',
    promptTemplate: 'Xianyu second-hand style: raw unedited photo, shows flaws, simple home background, authentic C2C.'
  }
];

const App: React.FC = () => {
  const [productUrl, setProductUrl] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [productDesc, setProductDesc] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('aliexpress');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isScrapingOnly, setIsScrapingOnly] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [regenerationAttempts, setRegenerationAttempts] = useState<{ [key: string]: number }>({});
  const [step, setStep] = useState<number>(1);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // เพิ่ม state สำหรับจัดการการแก้ไข prompt
  const [editingPrompt, setEditingPrompt] = useState<{ [key: string]: boolean }>({});
  const [promptInputs, setPromptInputs] = useState<{ [key: string]: string }>({});

  // เพิ่ม state สำหรับเลือก Lifestyle สำหรับ Regenerate
  const [selectedLifestyle, setSelectedLifestyle] = useState<{ [key: string]: ImageCategory }>({});

  // Lifestyle options สำหรับ dropdown
  const LIFESTYLE_OPTIONS = [
    { id: ImageCategory.LIFESTYLE_A, name: 'Home (ในบ้าน)', desc: 'Indoor / Cozy setting' },
    { id: ImageCategory.LIFESTYLE_B, name: 'Outdoor (กลางแจ้ง)', desc: 'Nature / Outside setting' },
    { id: ImageCategory.LIFESTYLE_C, name: 'Professional (ออฟฟิศ)', desc: 'Office / Urban setting' },
    { id: ImageCategory.LIFESTYLE_THAI_STREET_FOOD, name: 'Thai Street Food', desc: 'สตรีทฟู้ดไทย / รถเข็น' },
    { id: ImageCategory.LIFESTYLE_THAI_MARKET, name: 'Thai Market', desc: 'ตลาดสดไทย / ตลาดนัด' },
    { id: ImageCategory.LIFESTYLE_THAI_KITCHEN, name: 'Thai Kitchen', desc: 'ครัวไทย / ทำอาหารไทย' },
    { id: ImageCategory.LIFESTYLE_ISAN_KITCHEN, name: 'Isan Kitchen', desc: 'ครัวอีสาน / ส้มตำ' },
    { id: ImageCategory.LIFESTYLE_THAI_LOCAL_RESTAURANT, name: 'Thai Local Restaurant', desc: 'ร้านอาหารท้องถิ่นไทย' },
  ];

  const { theme, toggleTheme } = useTheme(); // ใช้ hook สำหรับจัดการธีม

  const fileInputRef = useRef<HTMLInputElement>(null);

  // สื่อสารกับ Extension
  useEffect(() => {
    const handleExtensionData = (event: any) => {
      console.log("=== SHOPEE MASTER: Received data from extension ===");
      console.log("Full event.detail:", event.detail);
      console.log("productUrl:", event.detail?.productUrl);
      console.log("productName:", event.detail?.productName);
      console.log("productDesc:", event.detail?.productDesc);
      console.log("images:", event.detail?.images);
      console.log("images length:", event.detail?.images?.length);

      const { productUrl, productName, productDesc, images } = event.detail || {};

      if (productUrl) {
        console.log("Setting productUrl:", productUrl);
        setProductUrl(productUrl);
      }
      if (productName) {
        console.log("Setting productName:", productName);
        setProductName(productName);
      }
      if (productDesc) {
        console.log("Setting productDesc:", productDesc);
        setProductDesc(productDesc);
      }
      if (images && Array.isArray(images) && images.length > 0) {
        console.log("Setting scrapedImages:", images.length, "images");
        setScrapedImages(images);
      } else {
        console.warn("No images received or images array is empty");
      }

      setStep(1);
      alert(`รับข้อมูลจาก Gimi Shopee X เรียบร้อยแล้ว!\n\nชื่อสินค้า: ${productName || 'ไม่มี'}\nจำนวนรูป: ${images?.length || 0} รูป`);
    };

    // Method 1: Custom Event Listener
    window.addEventListener('SHOPEE_X_DATA_TRANSFER', handleExtensionData);

    // Method 2: Message Event Listener (for postMessage)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SHOPEE_X_DATA_TRANSFER') {
        handleExtensionData({ detail: event.data.detail });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('SHOPEE_X_DATA_TRANSFER', handleExtensionData);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Helper to convert URL to Base64 (using proxy to avoid CORS)
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      // Return data URL directly if it's already one
      if (url.startsWith('data:')) return url;

      let blob: Blob;

      // Handle local blob URLs directly without proxy
      if (url.startsWith('blob:')) {
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        // Use proxy for remote URLs
        const imgRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url as string)}`);
        blob = await imgRes.blob();
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to convert image:", url, e);
      return "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeLocalImage = (index: number) => {
    setLocalImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeScrapedImage = (index: number) => {
    setScrapedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreviewScrape = async () => {
    if (!productUrl) {
      alert("กรุณาใส่ Shopee Product URL ก่อนกดเรียกดู");
      return;
    }
    setIsScrapingOnly(true);
    setScrapeError(null);
    try {
      // Cast productUrl to string explicitly to resolve 'unknown' type errors
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(productUrl as string)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json() as any;
      const html = data.contents;
      const foundImages: string[] = [];
      const imgRegex = /https:\/\/cf\.shopee\.co\.th\/file\/[a-z0-9]+/gi;
      const matches = html.match(imgRegex);
      if (matches) {
        foundImages.push(...Array.from(new Set(matches as string[])).slice(0, 5));
      }
      if (foundImages.length === 0) {
        setScrapedImages([
          'https://picsum.photos/400/400?random=101',
          'https://picsum.photos/400/400?random=102',
          'https://picsum.photos/400/400?random=103',
        ]);
      } else {
        setScrapedImages(foundImages);
      }
    } catch (e) {
      setScrapeError("ไม่สามารถดึงภาพจริงได้เนื่องจากระบบป้องกันของ Shopee");
    } finally {
      setIsScrapingOnly(false);
    }
  };

  const handleScrape = async () => {
    if (!productUrl && !productName && localImages.length === 0) {
      alert("กรุณาระบุข้อมูลสินค้าหรืออัปโหลดรูปภาพอย่างน้อย 1 อย่าง");
      return;
    }
    setIsAnalyzing(true);
    try {
      // Prepare images for analysis
      const imagesToAnalyze = await Promise.all(
        [...localImages, ...scrapedImages].map(url => imageUrlToBase64(url))
      );
      const validImages = imagesToAnalyze.filter(img => img && img !== "");

      const analysis = await analyzeProduct(`${productUrl} ${productName} ${productDesc}`, validImages);
      setProductName(prev => prev || analysis.name);
      setProductDesc(prev => prev || analysis.visualDescription);
      if (productUrl && scrapedImages.length === 0) await handlePreviewScrape();
      setStep(2);
    } catch (error) {
      console.error("Analysis Error:", error);
      alert("Analysis failed. Please check your inputs or try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    const sortedCategories = Object.keys(IMAGE_CATEGORIES_METADATA).sort(
      (a, b) => IMAGE_CATEGORIES_METADATA[a as ImageCategory].order - IMAGE_CATEGORIES_METADATA[b as ImageCategory].order
    ) as ImageCategory[];

    const initialGenerated: GeneratedImage[] = sortedCategories.map(cat => ({
      id: Math.random().toString(36).substr(2, 9),
      category: cat,
      url: '',
      prompt: '',
      status: 'idle'
    }));

    setGeneratedImages(initialGenerated);
    setStep(3);

    // CRITICAL FIX: Convert scraped URLs to Base64 so Gemini can read them
    console.log("Processing images for AI...");
    // Process BOTH local and scraped images
    const allImages = [...localImages, ...scrapedImages];
    const processedImages = await Promise.all(
      allImages.map(url => imageUrlToBase64(url))
    );
    const validImages = processedImages.filter(img => img && img !== "");

    const productData: ProductData = {
      name: productName || "สินค้าใหม่",
      description: productDesc || "ไม่มีรายละเอียด",
      images: validImages,
      features: ["คุณภาพพรีเมียม", "ทนทาน", "ดีไซน์ทันสมัย"]
    };

    for (const cat of sortedCategories) {
      setGeneratedImages(prev => prev.map(p => p.category === cat ? { ...p, status: 'generating' } : p));
      try {
        const url = await generateProductImage(cat, productData, selectedStyle);
        setGeneratedImages(prev => prev.map(p => p.category === cat ? { ...p, url, status: 'completed' } : p));
      } catch (err) {
        setGeneratedImages(prev => prev.map(p => p.category === cat ? { ...p, status: 'error' } : p));
      }
    }
    setIsGenerating(false);
  };

  // ฟังก์ชัน Regenerate สำหรับภาพเดี่ยว
  const regenerateImage = async (category: ImageCategory, customPrompt?: string) => {
    // อัปเดตจำนวนครั้งที่พยายามสร้างใหม่
    setRegenerationAttempts(prev => ({
      ...prev,
      [category]: (prev[category] || 0) + 1
    }));

    // อัปเดตสถานะเป็นกำลังสร้างใหม่
    setGeneratedImages(prev => prev.map(img =>
      img.category === category ? {
        ...img,
        status: 'generating',
        error: undefined
      } : img
    ));

    try {
      // แปลงรูปภาพที่เกี่ยวข้องให้เป็น Base64 เพื่อใช้กับ Gemini
      const imagesToProcess = [...localImages, ...scrapedImages];
      const processedImages = await Promise.all(
        imagesToProcess.map(url => imageUrlToBase64(url))
      );
      const validImages = processedImages.filter(img => img !== "");

      const productData: ProductData = {
        name: productName || "สินค้าใหม่",
        description: productDesc || "ไม่มีรายละเอียด",
        images: validImages,
        features: ["คุณภาพพรีเมียม", "ทนทาน", "ดีไซน์ทันสมัย"]
      };

      // สร้างภาพใหม่เฉพาะหมวดที่เลือก โดยใช้จำนวนครั้งที่พยายามสร้างใหม่เพื่อปรับ prompt
      const attemptCount = regenerationAttempts[category] || 1;
      const newImageUrl = await generateProductImage(category, productData, selectedStyle, customPrompt);

      // อัปเดตเฉพาะภาพที่เลือก
      setGeneratedImages(prev => prev.map(img =>
        img.category === category ? {
          ...img,
          url: newImageUrl,
          status: 'completed'
        } : img
      ));
    } catch (err) {
      // ถ้ามีข้อผิดพลาด ให้ตั้งสถานะเป็น error และบันทึกข้อความแสดงข้อผิดพลาด
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างภาพ";

      setGeneratedImages(prev => prev.map(img =>
        img.category === category ? {
          ...img,
          status: 'error',
          error: errorMessage
        } : img
      ));
    }
  };

  const downloadSingleImage = (url: string, categoryName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${productName || 'product'}_${categoryName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder((productName || 'product').replace(/\s+/g, '_'));
      generatedImages.filter(img => img.status === 'completed').forEach(img => {
        const base64Data = img.url.split(',')[1];
        folder?.file(`${IMAGE_CATEGORIES_METADATA[img.category].order}_${img.category}.png`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "shopee_images.zip";
      link.click();
    } catch (e) {
      alert("ZIP error");
    } finally {
      setIsZipping(false);
    }
  };

  const completedCount = generatedImages.filter(i => i.status === 'completed').length;
  const progressPercent = (completedCount / 9) * 100;
  const totalImages = localImages.length + scrapedImages.length;

  const getStrategyLabel = (order: number) => {
    if (order === 1) return { text: 'Hook', color: 'bg-red-500', icon: <Target className="w-3 h-3" /> };
    if (order >= 2 && order <= 3) return { text: 'Logic', color: 'bg-blue-500', icon: <Zap className="w-3 h-3" /> };
    if (order >= 4 && order <= 6) return { text: 'Emotion', color: 'bg-pink-500', icon: <Sparkles className="w-3 h-3" /> };
    return { text: 'Trust', color: 'bg-green-500', icon: <CheckCircle2 className="w-3 h-3" /> };
  };

  // ฟังก์ชันจัดการการแก้ไข prompt
  const startEditingPrompt = (category: string) => {
    setEditingPrompt(prev => ({ ...prev, [category]: true }));
  };

  const cancelEditingPrompt = (category: string) => {
    setEditingPrompt(prev => ({ ...prev, [category]: false }));
  };

  const saveEditedPrompt = (category: ImageCategory) => {
    const customPrompt = promptInputs[category];
    setEditingPrompt(prev => ({ ...prev, [category]: false }));
    regenerateImage(category, customPrompt);
  };

  const handlePromptInputChange = (category: string, value: string) => {
    setPromptInputs(prev => ({ ...prev, [category]: value }));
  };

  // เพิ่ม state สำหรับแสดงรายละเอียดสไตล์
  const [showStyleDetails, setShowStyleDetails] = useState<string | null>(null);

  // เพิ่ม state สำหรับภาพหลัก
  const [mainImageIndex, setMainImageIndex] = useState<number | null>(null);

  // ฟังก์ชัน Remove Background โดยใช้ remove.bg API
  const removeBackground = async (imageSrc: string, index: number) => {
    try {
      // แปลง data URL เป็น Blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();

      // สร้าง FormData สำหรับส่งภาพไปยัง remove.bg API
      const formData = new FormData();
      formData.append('image_file', blob, 'image.png');

      // เรียกใช้ remove.bg API
      const apiResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': (import.meta as any).env.VITE_REMOVE_BG_API_KEY || 'QXnQtJFLb4JJ2uM74xnpR17N' // ใช้ env variable ถ้ามี ไม่งั้นใช้ค่าเดิม
        },
        body: formData
      });

      if (!apiResponse.ok) {
        throw new Error(`Remove.bg API error: ${apiResponse.status}`);
      }

      // แปลงผลลัพธ์เป็น blob แล้วอ่านเป็น base64
      const resultBlob = await apiResponse.blob();
      // Use FileReader to convert Blob to Base64 safely
      const reader = new FileReader();
      const resultUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });

      // อัปเดตรายการภาพที่อัปโหลด
      const updatedLocalImages = [...localImages];
      updatedLocalImages[index] = resultUrl;
      setLocalImages(updatedLocalImages);

      return resultUrl;
    } catch (error) {
      console.error("Error removing background:", error);

      // ให้ข้อเสนอแนะแก่ผู้ใช้ตามประเภทของข้อผิดพลาด
      if (error instanceof TypeError) {
        alert("ไม่สามารถประมวลผลภาพได้เนื่องจากข้อมูลภาพไม่ถูกต้อง กรุณาตรวจสอบภาพที่อัปโหลด");
      } else if (error instanceof SyntaxError) {
        alert("มีข้อผิดพลาดในการตีความคำสั่ง กรุณาลองอัปโหลดภาพอีกครั้ง");
      } else {
        alert("เกิดข้อผิดพลาดในการลบพื้นหลังของภาพ กรุณาลองใหม่อีกครั้ง");
      }
    }
  };

  const selectedStyleName = STYLES.find(s => s.id === selectedStyle)?.name || 'Available Style';

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-2">
          <div className={`${theme === 'dark' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-orange-500 hover:bg-orange-600'} p-2 rounded-xl cursor-pointer transition-all shadow-orange-100 shadow-lg`} onClick={() => setStep(1)}>
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div className="cursor-pointer group" onClick={() => setStep(1)}>
            <h1 className="font-black text-xl tracking-tight group-hover:text-orange-500 transition-colors uppercase">Shopee Master</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} text-[10px] font-bold uppercase tracking-[0.2em]`}>Visual Commerce Suite</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl dark:bg-gray-700">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${step === s ? (theme === 'dark' ? 'bg-gray-600 text-orange-400' : 'bg-white text-orange-600') : (theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-slate-400 hover:text-slate-600')}`}
            >
              <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] ${step === s ? (theme === 'dark' ? 'bg-orange-500 text-white' : 'bg-orange-500 text-white') : (theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-slate-200 text-slate-500')}`}>{s}</span>
              {s === 1 ? 'ANALYZE' : s === 2 ? 'CONFIGURE' : 'RESULTS'}
            </button>
          ))}
        </nav>

        {/* ปุ่มสลับธีม */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'} transition-colors`}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {step === 1 && (
          <div className="max-w-4xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden`}>
              <div className="p-12">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className={`text-4xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight`}>เพิ่มข้อมูลสินค้า</h2>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'} font-medium`}>เริ่มต้นเปลี่ยนสินค้าธรรมดา ให้เป็นสินค้าขายดีด้วย AI</p>
                  </div>
                  <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center rotate-3 shadow-inner">
                    <ShoppingBag className="text-orange-500 w-10 h-10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <label className={`block text-xs font-black ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} mb-4 uppercase tracking-[0.15em]`}>
                        <Globe className="w-4 h-4 text-orange-500 inline mr-2" />
                        Shopee Product Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="วางลิงก์หน้าสินค้า Shopee ของคุณ..."
                          className={`flex-1 px-6 py-5 ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600 focus:border-orange-500 focus:bg-gray-600' : 'bg-slate-50 border-slate-100 focus:border-orange-500 focus:bg-white'} border-2 rounded-2xl focus:outline-none transition-all font-bold text-slate-700 shadow-inner placeholder:${theme === 'dark' ? 'text-gray-400' : 'text-slate-300'}`}
                          value={productUrl}
                          onChange={(e) => setProductUrl(e.target.value)}
                        />
                        <button
                          onClick={handlePreviewScrape}
                          disabled={isScrapingOnly || !productUrl}
                          className="px-8 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95"
                        >
                          {isScrapingOnly ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className={`block text-xs font-black ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} mb-3 uppercase tracking-[0.15em]`}>
                          ชื่อสินค้า
                        </label>
                        <input
                          type="text"
                          placeholder="ระบุชื่อสินค้า (Optional)"
                          className={`w-full px-6 py-5 ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600 focus:border-orange-500' : 'bg-slate-50 border-slate-100 focus:border-orange-500'} border-2 rounded-2xl focus:outline-none transition-all font-bold text-slate-700 shadow-inner`}
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-black ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} mb-3 uppercase tracking-[0.15em]`}>
                          รายละเอียดสินค้า
                        </label>
                        <textarea
                          rows={3}
                          placeholder="สรุปจุดขาย หรือสิ่งที่ต้องการให้ AI เน้นเป็นพิเศษ..."
                          className={`w-full px-6 py-5 ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600 focus:border-orange-500' : 'bg-slate-50 border-slate-100 focus:border-orange-500'} border-2 rounded-2xl focus:outline-none transition-all font-bold text-slate-700 shadow-inner resize-none`}
                          value={productDesc}
                          onChange={(e) => setProductDesc(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <label className={`block text-xs font-black ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} mb-4 uppercase tracking-[0.15em]`}>
                      <Upload className="w-4 h-4 text-orange-500 inline mr-2" />
                      Manual Upload
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`${theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:bg-gray-700' : 'border-slate-100 bg-slate-50/50 hover:bg-white'} border-4 border-dashed rounded-[3rem] p-12 flex flex-col items-center justify-center gap-5 transition-all cursor-pointer group h-full min-h-[300px] shadow-inner`}
                    >
                      <div className="w-20 h-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-slate-300 group-hover:text-orange-500 transition-all group-hover:scale-110 group-hover:-rotate-3">
                        <Plus className="w-10 h-10" />
                      </div>
                      <div className="text-center">
                        <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-800'} font-black text-lg`}>ลากไฟล์มาวางที่นี่</p>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} text-xs mt-2 font-bold uppercase tracking-widest`}>รองรับ PNG, JPG, WEBP</p>
                      </div>
                      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>

                  </div>
                </div>

                {/* New Unified Preview Section */}
                {(localImages.length > 0 || scrapedImages.length > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12">
                    {[...localImages, ...scrapedImages].map((src, i) => {
                      // ตรวจสอบว่าเป็นภาพที่อัปโหลดจากผู้ใช้หรือไม่
                      const isLocalImage = i < localImages.length;

                      return (
                        <div key={i} className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 animate-in zoom-in duration-500`}>
                          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
                            <img src={src} className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                if (i < localImages.length) removeLocalImage(i);
                                else removeScrapedImage(i - localImages.length);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>

                            {/* ปุ่มเลือกภาพหลักสำหรับภาพที่อัปโหลด */}
                            {isLocalImage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMainImageIndex(i);
                                }}
                                className={`absolute top-2 left-2 p-1.5 rounded-full ${mainImageIndex === i
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-white/90 text-gray-500'
                                  } opacity-0 group-hover:opacity-100 transition-opacity`}
                                title="ตั้งเป็นภาพหลัก"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </button>
                            )}

                            {/* ปุ่มลบพื้นหลังสำหรับภาพที่อัปโหลด */}
                            {isLocalImage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBackground(src, i);
                                }}
                                className="absolute bottom-2 left-2 p-1.5 bg-white/90 rounded-full text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="ลบพื้นหลัง"
                              >
                                <Scissors className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-24">
                  <button
                    onClick={handleScrape}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black py-6 rounded-[2rem] transition-all shadow-2xl shadow-orange-200 flex items-center justify-center gap-4 text-xl tracking-tight active:scale-95"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                    เริ่มวิเคราะห์สินค้าด้วย AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="lg:col-span-2 space-y-8">
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'} p-10 rounded-[3rem] border shadow-sm`}>
                <div className="flex items-center justify-between mb-8">
                  <h3 className={`text-2xl font-black flex items-center gap-4 uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    <ImageIcon className="text-orange-500 w-8 h-8" />
                    คลังภาพต้นฉบับ ({totalImages})
                  </h3>
                </div>
                {totalImages > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-5">
                    {[...localImages, ...scrapedImages].map((src, i) => (
                      <div key={i} className={`relative group aspect-square rounded-[2rem] overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-slate-50'} border-2 shadow-sm hover:shadow-xl transition-all`}>
                        <img src={src} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white text-orange-500 rounded-full p-2 shadow-2xl">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-100'} py-24 text-center rounded-[2.5rem] border-4 border-dashed`}>
                    <AlertCircle className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} font-black uppercase tracking-widest`}>ไม่มีรูปภาพที่จะใช้เป็นต้นแบบ</p>
                  </div>
                )}
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'} p-10 rounded-[3rem] border shadow-sm`}>
                <h3 className={`text-2xl font-black mb-8 flex items-center gap-4 uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  <Layers className="text-orange-500 w-8 h-8" />
                  แผนผังการสร้างชุดภาพ 9 หมวดหมู่
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Object.entries(IMAGE_CATEGORIES_METADATA).sort(([, a], [, b]) => a.order - b.order).map(([key, meta]) => (
                    <div key={key} className={`flex flex-col gap-4 p-6 rounded-[2rem] border-2 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-[#F8FAFC] hover:bg-white border-slate-50'} hover:border-orange-200 hover:shadow-xl hover:shadow-orange-50 transition-all group`}>
                      <div className={`w-10 h-10 rounded-2xl bg-white shadow-md text-orange-500 font-black flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-all text-sm ${theme === 'dark' ? 'bg-gray-700' : ''}`}>{meta.order}</div>
                      <div>
                        <p className={`font-black text-sm uppercase tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{meta.title}</p>
                        <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} font-bold leading-relaxed`}>{meta.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700 ring-gray-700' : 'bg-white border-slate-100 ring-slate-100'} p-10 rounded-[3rem] border shadow-2xl sticky top-24 ring-1`}>
                <h3 className={`text-2xl font-black mb-8 uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>สไตล์ที่ต้องการ</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`text-left p-6 rounded-[2rem] border-4 transition-all ${selectedStyle === style.id ? (theme === 'dark' ? 'border-orange-500 bg-orange-900/30 shadow-lg shadow-orange-900/30 scale-[1.02]' : 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100 scale-[1.02]') : (theme === 'dark' ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700' : 'border-slate-50 hover:border-slate-100 hover:bg-slate-50')}`}
                      >
                        <p className={`font-black text-lg tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{style.name}</p>
                        <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} font-black uppercase tracking-widest mt-2`}>{style.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className={`${theme === 'dark' ? 'border-gray-700' : 'border-slate-100'} pt-8 border-t mt-6`}>
                    <button
                      onClick={startGeneration}
                      disabled={isGenerating}
                      className="w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[2rem] transition-all flex items-center justify-center gap-4 shadow-2xl group active:scale-95"
                    >
                      {isGenerating ? <Loader2 className="animate-spin w-6 h-6" /> : <Sparkles className="w-7 h-7 text-orange-400 group-hover:scale-125 transition-transform" />}
                      สร้างภาพทั้งหมด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Results Dashboard Header */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700 ring-gray-700' : 'bg-white border-slate-100 ring-slate-50'} rounded-[3.5rem] p-12 border shadow-2xl mb-12 overflow-hidden relative ring-1`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-100/30 rounded-full -mr-40 -mt-40 blur-[100px] -z-10"></div>

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-slate-900'} text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-slate-200`}>Processing Engine</span>
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-orange-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <h2 className={`text-5xl font-black flex items-center gap-4 tracking-tighter mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    ชุดภาพลำดับการขาย
                  </h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} font-bold text-lg max-w-2xl leading-relaxed`}>
                    สร้างสำเร็จสำหรับ <span className={`font-black ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`}>"{productName || 'Unnamed Product'}"</span> <br />
                    เน้นสไตล์ <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{selectedStyleName}</span> เพื่อเพิ่มยอดขาย
                  </p>
                </div>

                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-100'} p-8 rounded-[2.5rem] flex flex-col gap-5 min-w-[320px] shadow-inner border`}>
                  <div className="flex items-center justify-between w-full text-[12px] font-black uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500" /> ความคืบหน้า</span>
                    <span className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{completedCount} / 9</span>
                  </div>
                  <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden border-4 border-white shadow-sm">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-orange-600 h-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex gap-3 w-full mt-2">
                    <button onClick={() => setStep(2)} className={`flex-1 px-6 py-4 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white border-2 border-slate-200 hover:bg-slate-50'} font-black text-xs transition-all shadow-sm active:scale-95`}>ย้อนกลับ</button>
                    <button
                      onClick={handleDownloadAll}
                      disabled={isGenerating || isZipping || completedCount === 0}
                      className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-black font-black text-xs flex items-center justify-center gap-3 shadow-xl disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95"
                    >
                      {isZipping ? <Loader2 className="animate-spin w-5 h-5" /> : <FileArchive className="w-5 h-5" />}
                      โหลด ZIP
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Grid Section Header */}
            <div className="flex items-center gap-6 mb-10 px-4">
              <h3 className={`text-xl font-black uppercase tracking-tighter flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                <Target className="text-orange-500 w-6 h-6" />
                โครงสร้าง 9 ภาพเพื่อการปิดการขาย (Strategic Sequence)
              </h3>
              <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-slate-200'} h-[2px] flex-1`}></div>
              <div className="flex gap-4">
                {['Hook', 'Logic', 'Emotion', 'Trust'].map(label => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${label === 'Hook' ? 'bg-red-500' : label === 'Logic' ? 'bg-blue-500' : label === 'Emotion' ? 'bg-pink-500' : 'bg-green-500'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured 9-Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
              {Object.entries(IMAGE_CATEGORIES_METADATA)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([catKey, meta]) => {
                  const img = generatedImages.find(g => g.category === catKey);
                  const strategy = getStrategyLabel(meta.order);
                  const isHero = meta.order === 1;

                  return (
                    <div key={catKey} className={`group flex flex-col ${isHero ? 'lg:scale-105 z-10' : ''}`}>
                      <div className={`aspect-square relative rounded-[3rem] overflow-hidden border-4 transition-all duration-700 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${img?.status === 'completed' ? (theme === 'dark' ? 'border-gray-700 shadow-2xl ring-gray-700' : 'border-white shadow-2xl ring-slate-100') : (theme === 'dark' ? 'border-gray-700 border-dashed bg-gray-800/50 hover:bg-gray-700 hover:border-orange-500' : 'border-slate-200 border-dashed bg-slate-50/50 hover:bg-white hover:border-orange-200')}`}>

                        {/* Status: Completed */}
                        {img?.status === 'completed' && (
                          <div className="w-full h-full relative animate-in fade-in duration-1000">
                            <img src={img.url} alt={meta.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-10">
                              <div className="flex flex-col gap-4 w-full">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                  <p className="text-white text-[10px] font-black uppercase tracking-widest mb-1">PROMPT USED</p>
                                  {!editingPrompt[catKey] ? (
                                    <>
                                      <p className="text-white/70 text-[10px] italic line-clamp-2">"High-quality commercial render, ${selectedStyle} style, master lighting..."</p>
                                      <button
                                        onClick={() => startEditingPrompt(catKey)}
                                        className="mt-2 text-[9px] text-blue-300 hover:text-white font-black underline"
                                      >
                                        Edit Prompt
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <textarea
                                        value={promptInputs[catKey] || `High-quality commercial render, ${selectedStyle} style, master lighting..., ${meta.title}`}
                                        onChange={(e) => handlePromptInputChange(catKey, e.target.value)}
                                        className="w-full text-[10px] p-2 rounded bg-white/20 text-white placeholder:text-white/50 border border-white/30"
                                        rows={3}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => saveEditedPrompt(catKey as ImageCategory)}
                                          className="text-[9px] text-green-300 hover:text-white font-black underline"
                                        >
                                          Save & Regenerate
                                        </button>
                                        <button
                                          onClick={() => cancelEditingPrompt(catKey)}
                                          className="text-[9px] text-red-300 hover:text-white font-black underline ml-2"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Lifestyle Dropdown - แสดงเฉพาะ Lifestyle categories */}
                                {catKey.startsWith('LIFESTYLE_') && (
                                  <div className="mb-2">
                                    <select
                                      value={selectedLifestyle[catKey] || catKey}
                                      onChange={(e) => setSelectedLifestyle(prev => ({
                                        ...prev,
                                        [catKey]: e.target.value as ImageCategory
                                      }))}
                                      className="w-full text-[10px] p-2 rounded-xl bg-white/20 text-white border border-white/30 backdrop-blur-md font-bold"
                                    >
                                      {LIFESTYLE_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id} className="bg-slate-800 text-white">
                                          {opt.name} - {opt.desc}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => downloadSingleImage(img.url, meta.title)}
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl text-[12px] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                                  >
                                    <Download className="w-5 h-5" /> บันทึกภาพ
                                  </button>
                                  <button
                                    onClick={() => regenerateImage(
                                      catKey.startsWith('LIFESTYLE_')
                                        ? (selectedLifestyle[catKey] || catKey) as ImageCategory
                                        : catKey as ImageCategory
                                    )}
                                    className="p-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl text-[12px] shadow-2xl flex items-center justify-center transition-all active:scale-95"
                                    title="Regenerate Image"
                                  >
                                    <RotateCcw className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-6 right-6">
                              <div className="bg-white/90 backdrop-blur shadow-xl p-2 rounded-2xl text-green-500 ring-4 ring-green-50">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status: Generating */}
                        {img?.status === 'generating' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center">
                            <div className="relative">
                              <div className="w-20 h-20 border-8 border-orange-50 rounded-[2rem] animate-spin border-t-orange-500"></div>
                              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-orange-400 animate-pulse" />
                            </div>
                            <div>
                              <p className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>กำลังรังสรรค์ภาพ...</p>
                              <p className={`text-[10px] font-black uppercase mt-2 tracking-[0.2em] ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>{meta.title}</p>
                            </div>
                          </div>
                        )}

                        {/* Status: Idle / Blueprint */}
                        {(!img || img.status === 'idle') && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center opacity-40 group-hover:opacity-100 transition-all">
                            <div className={`w-24 h-24 rounded-[2.5rem] ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} flex items-center justify-center text-slate-200 group-hover:bg-orange-50 group-hover:text-orange-400 transition-all border-4 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-slate-100'} shadow-inner group-hover:rotate-12`}>
                              <ImageIcon className="w-12 h-12" />
                            </div>
                            <div>
                              <p className={`text-sm font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`}>โครงสร้างภาพที่ {meta.order}</p>
                              <p className={`text-[10px] font-bold leading-relaxed px-6 italic ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>พิมพ์เขียวพร้อมใช้งาน <br />รอคิวประมวลผลถัดไป</p>
                            </div>
                          </div>
                        )}

                        {/* Status: Error */}
                        {img?.status === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-12 text-center bg-red-50/30">
                            <div className="bg-white p-4 rounded-3xl shadow-xl">
                              <AlertCircle className="w-10 h-10 text-red-400" />
                            </div>
                            <p className={`text-sm font-black leading-tight ${theme === 'dark' ? 'text-red-300' : 'text-red-500'}`}>เกิดข้อผิดพลาดในการสร้างภาพ</p>
                            {img.error && (
                              <p className="text-xs text-red-300 text-center px-4" title={img.error}>
                                {img.error.length > 50 ? `${img.error.substring(0, 50)}...` : img.error}
                              </p>
                            )}
                            {/* Lifestyle Dropdown ใน Error state */}
                            {catKey.startsWith('LIFESTYLE_') && (
                              <select
                                value={selectedLifestyle[catKey] || catKey}
                                onChange={(e) => setSelectedLifestyle(prev => ({
                                  ...prev,
                                  [catKey]: e.target.value as ImageCategory
                                }))}
                                className={`w-4/5 text-[10px] p-2 rounded-xl ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-slate-800 border-slate-200'} border font-bold`}
                              >
                                {LIFESTYLE_OPTIONS.map(opt => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.name} - {opt.desc}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              onClick={() => regenerateImage(
                                catKey.startsWith('LIFESTYLE_')
                                  ? (selectedLifestyle[catKey] || catKey) as ImageCategory
                                  : catKey as ImageCategory
                              )}
                              className="px-6 py-2 bg-blue-500 text-white text-[10px] font-black rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" /> สร้างภาพใหม่ ({(regenerationAttempts[catKey] || 0) + 1} ครั้ง)
                            </button>
                          </div>
                        )}

                        {/* Slot Strategy Badge */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[9px] font-black uppercase tracking-widest shadow-lg ${strategy.color}`}>
                            {strategy.icon}
                            {strategy.text}
                          </div>
                          {isHero && (
                            <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-slate-900 text-white'}`}>
                              <Target className="w-3 h-3 text-orange-400" /> HERO
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Info Footer */}
                      <div className="mt-8 px-4 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                          <h4 className={`font-black text-lg group-hover:text-orange-600 transition-colors uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{meta.title}</h4>
                        </div>
                        <p className={`text-xs font-bold leading-relaxed line-clamp-2 h-10 italic ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>
                          " {meta.desc} "
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${strategy.color} shadow-sm`}></div>
                          <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-slate-100'} h-[1px] flex-1`}></div>
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-300'}`}>
                            SLOT {meta.order}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Empty State Guard */}
            {generatedImages.length === 0 && !isGenerating && (
              <div className={`py-40 flex flex-col items-center justify-center ${theme === 'dark' ? 'text-gray-400 bg-gray-800' : 'text-slate-400 bg-white'} rounded-[4rem] border-4 border-dashed max-w-3xl mx-auto shadow-sm ${theme === 'dark' ? 'border-gray-700' : 'border-slate-50'}`}>
                <div className={`p-12 rounded-[3rem] mb-8 shadow-inner rotate-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-[#F8FAFC]'}`}>
                  <LayoutGrid className="w-20 h-20 opacity-10 text-orange-500" />
                </div>
                <h3 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>ยังไม่มีประวัติการสร้างภาพ</h3>
                <p className={`text-lg text-center px-16 mt-4 max-w-lg font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'} leading-relaxed`}>
                  AI พร้อมที่จะเนรมิตภาพสินค้าทั้ง 9 หมวดหมู่ <br /> กรุณากลับไปกดปุ่ม <span className={`font-black ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`}>"เริ่มสร้างภาพทั้งหมด"</span> ในหน้า Configure
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="mt-12 px-10 py-5 bg-orange-500 text-white rounded-[2rem] hover:bg-orange-600 transition-all font-black text-lg flex items-center gap-4 shadow-2xl shadow-orange-100 active:scale-95"
                >
                  <ArrowRightCircle className="w-6 h-6 rotate-180" />
                  กลับไปหน้าตั้งค่า
                </button>
              </div>
            )}
          </div>
        )
        }
      </main >

      <footer className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'} border-t py-16 px-8 mt-24`}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-12 text-slate-400">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${theme === 'dark' ? 'bg-gray-700' : 'bg-[#F8FAFC]'}`}>
              <Sparkles className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Shopee Master AI Suite</p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>Powered by Gemini 2.5 Flash Rendering</p>
            </div>
          </div>
          <div className="flex gap-8 items-center">
            <div className={`h-10 w-[1px] ${theme === 'dark' ? 'bg-gray-700' : 'bg-slate-100'} hidden lg:block`}></div>
            <div className={`text-[10px] font-black uppercase tracking-[0.25em] text-center lg:text-right leading-loose ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>
              v2.5.0 STABLE <br />
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-slate-300'}>© 2024 Intelligent Design Engine</span>
            </div>
          </div>
        </div>
      </footer>
    </div >
  );
};

export default App;