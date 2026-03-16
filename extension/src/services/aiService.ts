import type { ProductAnalysis, AIModel, AIModelId } from "../types";

export const AI_MODELS: AIModel[] = [
    {
        id: 'dalle-3',
        name: 'OpenAI (DALL-E 3)',
        version: 'DALL-E 3',
        description: 'เข้าใจคำสั่ง (Prompt) ที่ซับซ้อนได้ดีมาก เหมาะสำหรับผู้ใช้ทั่วไปที่ไม่เก่งเรื่องการเขียน Prompt',
        tags: ['IMAGE GEN', 'PREMIUM', 'EASY TO USE'],
        latency: '12-20s',
        status: 'READY',
        quote: '"เข้าใจคำสั่งที่ซับซ้อนได้ดีที่สุดสำหรับงานคุณภาพสูง"',
        realModelName: 'dall-e-3'
    },
    {
        id: 'gemini-2-5-pro',
        name: 'Gemini 2.5 Pro',
        version: 'Pro 2.5 Stable',
        description: 'ตัวยอดนิยมสำหรับงานวิเคราะห์เอกสารและวิดีโอยาวๆ',
        tags: ['COMPLEX TASK', 'LONG CONTEXT', 'STABLE'],
        latency: '8-15s',
        status: 'READY',
        quote: '"Deep analysis for complex content."',
        realModelName: 'gemini-1.5-pro'
    },
    {
        id: 'gemini-2-5-flash',
        name: 'Gemini 2.5 Flash',
        version: 'Flash 2.5 Stable',
        description: 'รุ่นที่คุ้มค่าที่สุด เร็วและฉลาดสมดุลกัน',
        tags: ['BALANCED', 'FAST', 'SMART'],
        latency: '400-800ms',
        status: 'READY',
        quote: '"Speed meets intelligence."',
        realModelName: 'gemini-1.5-flash-001'
    },
    {
        id: 'gemini-2-5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        version: 'Flash 2.5 Lite',
        description: 'ออกแบบมาเพื่อลด Latency ให้ต่ำที่สุด สำหรับงานเล็กๆ ที่มีปริมาณมาก',
        tags: ['LOW LATENCY', 'HIGH VOLUME', 'TEXT'],
        latency: '300-500ms',
        status: 'READY',
        quote: '"Ultra-low latency for high volume tasks."',
        realModelName: 'gemini-1.5-flash-8b'
    },
    {
        id: 'gemini-2-5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        version: 'Flash 2.5 Image',
        description: 'ปรับแต่งมาเพื่อการทำงานกับรูปภาพโดยเฉพาะ (Image-first)',
        tags: ['IMAGE FIRST', 'VISION', 'PRECISE'],
        latency: '500-900ms',
        status: 'READY',
        quote: '"Optimized for visual understanding."',
        realModelName: 'gemini-1.5-pro'
    },
    {
        id: 'gemini-flash-lite',
        name: 'Gemini Flash Lite (Legacy)',
        version: 'Flash 1.5 Lite',
        description: 'เน้นความเร็วสูงสุด สำหรับงาน Chat และสรุปความ',
        tags: ['TEXT', 'VISION', 'MULTILINGUAL'],
        latency: '785ms',
        status: 'READY',
        quote: '"Connection established. How can I help you today?"',
        realModelName: 'gemini-1.5-flash'
    },
    {
        id: 'gemini-3-pro-image',
        name: 'Gemini 3 Pro Image Preview',
        version: 'Pro 3.0 Preview',
        description: 'ขีดสุดของงานศิลปะ AI ด้วยการคิดวิเคราะห์ขั้นสูงและคุณภาพระดับสตูดิโอ',
        tags: ['ULTRA QUALITY', 'PREVIEW', 'SOON'],
        latency: '15-30s',
        status: 'READY',
        quote: '"The future of visual creativity is here."',
        realModelName: 'gemini-1.5-pro'
    },
    {
        id: 'imagen-3',
        name: 'Imagen 3 (Pro Image)',
        version: 'Pro Image Gen',
        description: 'สร้างภาพความละเอียดสูง (1K/2K/4K) และแก้ไขภาพ',
        tags: ['IMAGE GEN', 'EDITING', 'HIGH RES'],
        latency: '16082ms',
        status: 'READY',
        quote: '"Advanced Image Gen: Authorized"',
        realModelName: 'imagen-3'
    },
    {
        id: 'veo-3-1',
        name: 'Veo 3.1 (Video Gen)',
        version: 'Video Generation',
        description: 'สร้างวิดีโอจากข้อความ (ต้องใช้บัญชีระดับ Paid)',
        tags: ['VIDEO GEN', '1080P', 'CINEMATIC'],
        latency: '1194ms',
        status: 'READY',
        quote: '"Video Operation Created (Veo Access: OK)"',
        realModelName: 'veo-3.1'
    },
    {
        id: 'gemini-3-pro',
        name: 'Gemini 3 Pro',
        version: 'Advanced Pro',
        description: 'การคิดวิเคราะห์ขั้นสูงและการเขียนโปรแกรมซับซ้อน',
        tags: ['REASONING', 'CODING', 'COMPLEX TASKS'],
        latency: '29736ms',
        status: 'READY',
        quote: '"The current state of AI infrastructure can be described as a **hyper-growth construction phase**..."',
        realModelName: 'gemini-1.5-pro'
    },
    {
        id: 'phaya-ai',
        name: 'Phaya.io',
        version: 'Third Party API',
        description: 'AI Platform จากประเทศไทย รองรับภาษาไทยได้ดีเยี่ยม',
        tags: ['THAI AI', 'THIRD PARTY', 'VISION'],
        latency: 'Custom',
        status: 'READY',
        quote: '"AI ที่เข้าใจบริบทภาษาไทยได้ดีที่สุด"',
        realModelName: 'phaya-gpt',
        isThirdParty: true,
        requiresCustomApiKey: true
    },
    {
        id: 'custom-api',
        name: 'Custom API',
        version: 'Custom Integration',
        description: 'เชื่อมต่อกับ API ของคุณเอง (OpenAI-compatible)',
        tags: ['CUSTOM', 'FLEXIBLE', 'ADVANCED'],
        latency: 'Custom',
        status: 'READY',
        quote: '"Bring your own AI endpoint"',
        realModelName: 'custom',
        isThirdParty: true,
        requiresCustomApiKey: true
    }
];

// Error types for better error handling
interface ApiError {
    type: 'AUTH_ERROR' | 'QUOTA_EXCEEDED' | 'MODEL_NOT_FOUND' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'INVALID_KEY' | 'UNKNOWN';
    message: string;
    solution: string;
}

const parseGeminiError = (error: any): ApiError => {
    const errorMessage = error?.message || error?.toString() || '';

    // API Key Error
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid API key') || errorMessage.includes('400')) {
        return {
            type: 'INVALID_KEY',
            message: '🔑 API Key ไม่ถูกต้อง',
            solution: 'กรุณาตรวจสอบ Gemini API Key ในหน้าตั้งค่าอีกครั้ง หรือสร้าง Key ใหม่จาก Google AI Studio ครับ'
        };
    }

    // Authentication Error
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return {
            type: 'AUTH_ERROR',
            message: '🔐 ไม่ได้รับอนุญาต',
            solution: 'กรุณาตรวจสอบว่า API Key ของคุณมีสิทธิ์เข้าถึง Gemini API หรือยังไม่ได้เปิดใช้งาน Generative Language API ครับ'
        };
    }

    // Quota Exceeded
    if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        return {
            type: 'QUOTA_EXCEEDED',
            message: '📊 โวัต้าหมดแล้ว',
            solution: 'บัญชีฟรีมีการจำกัดจำนวนครั้งต่อนาที กรุณารอสักครู่แล้วลองใหม่ หรือตรวจสอบโควต้าใน Google AI Studio ครับ'
        };
    }

    // Model Not Found
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return {
            type: 'MODEL_NOT_FOUND',
            message: '🤖 ไม่พบ AI Model',
            solution: 'ระบบพยายามเรียกใช้ Model แล้วแต่ไม่สำเร็จ อาจเป็นเพราะ Model นี้ยังไม่เปิดให้ใช้ในประเทศของคุณ หรือ API Key ยังไม่ได้เปิดใช้งานครับ'
        };
    }

    // Network/CORS Error
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('CORS')) {
        return {
            type: 'NETWORK_ERROR',
            message: '🌐 ปัญหาการเชื่อมต่อ',
            solution: 'ไม่สามารถเชื่อมต่อกับ Google API ได้ กรุณาตรวจสอบอินเทอร์เน็ตของคุณ หรือลองรีเฟรชหน้าเว็บแล้วลองใหม่ครับ'
        };
    }

    // Parse Error
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
        return {
            type: 'PARSE_ERROR',
            message: '⚠️ รูปแบบข้อมูลผิดพลาด',
            solution: 'AI ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง กรุณาลองวิเคราะห์รูปภาพอื่นหรือลองใหม่อีกครั้งครับ'
        };
    }

    // Unknown Error
    return {
        type: 'UNKNOWN',
        message: '❌ เกิดข้อผิดพลาดไม่ทราบสาเหตุ',
        solution: `รายละเอียด: ${errorMessage.substring(0, 150)}... กรุณาลองใหม่อีกครั้งหรือติดต่อผู้พัฒนาครับ`
    };
};

/**
 * Analyzes product image using Gemini API Key or Third-party API
 */
export const analyzeProduct = async (
    apiKey: string,
    imageUrl: string,
    base64Override?: string,
    modelId: AIModelId = 'gemini-flash-lite',
    customUrl?: string
): Promise<ProductAnalysis> => {
    const selectedModelConfig = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];

    // Check if it's a Third-party Model (like Phaya.io)
    if (selectedModelConfig.isThirdParty) {
        return analyzeWithThirdParty(apiKey, customUrl || 'https://api.phaya.io/api/v1/chat/completions', imageUrl, base64Override, selectedModelConfig.realModelName);
    }

    const modelsToTry = [selectedModelConfig.realModelName, "gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`🔄 Attempting Gemini analysis with model: ${modelName}`);

            // Prepare image data
            const { base64, mimeType } = await prepareImageData(imageUrl, base64Override);

            // Call Gemini API
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: getAnalysisPrompt() },
                                { inline_data: { mime_type: mimeType, data: base64 } }
                            ]
                        }]
                    })
                }
            );

            return await handleAiResponse(response);
        } catch (error: any) {
            lastError = error;
            console.warn(`❌ Gemini Model ${modelName} failed:`, error.message);
        }
    }

    const apiError = parseGeminiError(lastError);
    throw new Error(`${apiError.message}\n\n${apiError.solution}`);
};

/**
 * Handle Third-party AI Analysis (OpenAI-compatible)
 */
async function analyzeWithThirdParty(
    apiKey: string,
    apiUrl: string,
    imageUrl: string,
    base64Override: string | undefined,
    modelName: string
): Promise<ProductAnalysis> {
    try {
        // Senior Fix: Ensure URL contains /api/v1/ and handle trailing slashes
        let optimizedUrl = apiUrl.trim();
        if (optimizedUrl.includes('phaya.io') && !optimizedUrl.includes('/api/v1')) {
            optimizedUrl = optimizedUrl.replace('phaya.io/v1', 'phaya.io/api/v1');
        }

        console.log(`🚀 Analyzing with Phaya.io (${modelName}) at ${optimizedUrl}`);

        // Prepare image data for Third-party
        const { base64, mimeType } = await prepareImageData(imageUrl, base64Override);
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const response = await fetch(optimizedUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: getAnalysisPrompt() },
                            {
                                type: "image_url",
                                image_url: { url: dataUrl }
                            }
                        ]
                    }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        return await handleAiResponse(response);
    } catch (error: any) {
        console.error('❌ Third-party Analysis Failed:', error);
        throw new Error(`การวิเคราะห์ล้มเหลว: ${error.message}\n(ตรวจสอบว่า API URL ในหน้าตั้งค่าเป็น https://api.phaya.io/api/v1/chat/completions)`);
    }
}

/**
 * Shared Helpers
 */
const getAnalysisPrompt = () => `Analyze this product image for an online listing.
Return a STRICT JSON object with the following fields:
- product_name: (string) A catchy product name in Thai.
- key_features: (array of strings) 3-5 key selling points in Thai.
- materials: (string) Description of materials or texture in Thai.
- ideal_lifestyle_setting: (string) Best context for the product in Thai.
- dimensions_guess: (string) Approximated dimensions.`;

async function prepareImageData(imageUrl: string, base64Override?: string) {
    let base64: string;
    let mimeType: string = "image/jpeg";

    if (base64Override) {
        base64 = base64Override.split(',')[1];
        const match = base64Override.match(/^data:(.*?);/);
        if (match) mimeType = match[1];
    } else {
        const imageResp = await fetch(imageUrl);
        const imageBlob = await imageResp.blob();
        mimeType = imageBlob.type;
        const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
        });
        base64 = base64Data.split(',')[1];
    }
    return { base64, mimeType };
}

async function handleAiResponse(response: Response): Promise<ProductAnalysis> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    // Handle both Gemini and OpenAI response formats
    let text = "";
    if (result.choices) { // OpenAI format
        text = result.choices[0].message.content;
    } else if (result.candidates) { // Gemini format
        text = result.candidates[0].content.parts[0].text;
    }

    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText) as ProductAnalysis;
}

/**
 * Tests API Key connectivity
 */
export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    try {
        console.log(`🧪 Testing API Key`);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Say 'OK' if you can read this."
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        return {
            success: true,
            message: '✅ API Key ใช้งานได้ปกติครับ!'
        };
    } catch (error: any) {
        const apiError = parseGeminiError(error);
        return {
            success: false,
            message: `❌ ${apiError.message}\n\n${apiError.solution}`
        };
    }
};

