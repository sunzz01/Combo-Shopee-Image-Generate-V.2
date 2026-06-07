import type { ProductAnalysis, ImageStyle, GeneratedPrompt } from "../types";

type JsonObject = Record<string, unknown>;
type PhayaHistoryItem = JsonObject;

const asJsonObject = (value: unknown): JsonObject => (
    value && typeof value === 'object' ? value as JsonObject : {}
);

const getNestedMessage = (value: unknown, fallback: string): string => {
    const obj = asJsonObject(value);
    const error = asJsonObject(obj.error);
    return typeof error.message === 'string' ? error.message : fallback;
};

const STYLE_PROMPTS: Record<ImageStyle, string> = {
    Minimalist: "clean background, soft lighting, minimal props, high key photography, pastel tones",
    Luxury: "dark elegant background, gold accents, dramatic lighting, premium texture, expensive look, 8k resolution",
    Nature: "outdoor setting, natural sunlight, leaves shadow, wooden texture, earth tones, fresh atmosphere",
    Urban: "concrete texture, neon lights, city street background, modern fashion style, street photography",
    Studio: "solid color background, professional studio lighting, sharp focus, commercial photography, high contrast"
};

export const generateSlidePrompts = (
    analysis: ProductAnalysis,
    style: ImageStyle,
    referenceImageUrl?: string
): GeneratedPrompt[] => {
    const baseStyle = STYLE_PROMPTS[style];
    const productContext = `${analysis.product_name}, ${analysis.materials}`;

    // Helper to append reference URL if available (Midjourney format)
    const withRef = (prompt: string) => referenceImageUrl ? `${referenceImageUrl} ${prompt}` : prompt;

    return [
        {
            id: 1,
            type: "Cover Image",
            description: "ภาพปกสินค้า เน้นความสวยงามดึงดูดสายตา",
            prompt: withRef(`Professional product photography of ${productContext}, main cover shot, centered composition, ${baseStyle}, award winning photography, advertisement quality --ar 1:1`)
        },
        {
            id: 2,
            type: "Infographic Base",
            description: "ภาพสำหรับใส่ข้อความจุดเด่น (เว้นพื้นที่ว่าง)",
            prompt: withRef(`Product photography of ${productContext}, placed on the side to leave negative space for text overlays, clean background, ${baseStyle}, soft lighting --ar 1:1`)
        },
        {
            id: 3,
            type: "Close-up Detail",
            description: "เจาะลึกรายละเอียดวัสดุ",
            prompt: withRef(`Macro shot of ${productContext}, focusing on texture and material quality, extreme close-up, depth of field, detailed surface, ${baseStyle} --ar 1:1`)
        },
        {
            id: 4,
            type: "Lifestyle Usage",
            description: "ภาพขณะใช้งานในสถานที่จริง",
            prompt: withRef(`Lifestyle photography of ${productContext} being used in a ${analysis.ideal_lifestyle_setting}, candid shot, natural lighting, real life context, human interaction implied --ar 1:1`)
        },
        {
            id: 5,
            type: "Size Comparison",
            description: "เทียบขนาดกับของใกล้ตัว",
            prompt: withRef(`Product photography of ${productContext} placed next to common everyday objects for size scale, flat lay angle, clear comparison, ${baseStyle} --ar 1:1`)
        },
        {
            id: 6,
            type: "Unboxing / Packaging",
            description: "ภาพสไตล์แกะกล่อง มีแพ็คเกจจิ้ง",
            prompt: withRef(`Unboxing experience shot of ${productContext}, showing packaging box and contents, open box, exciting angle, social media review style, ${baseStyle} --ar 1:1`)
        },
        {
            id: 7,
            type: "Value Set",
            description: "สินค้าพร้อมของแถมทั้งหมด",
            prompt: withRef(`Group shot of ${productContext} and all accessories arranged neatly, knolling photography, overhead view, showing full set contents, ${baseStyle} --ar 1:1`)
        },
        {
            id: 8,
            type: "Instructional",
            description: "ภาพอธิบายการใช้งาน",
            prompt: withRef(`Instructional style photo of ${productContext}, showing how to use the product, clear action, educational purpose, simple background to focus on action, ${baseStyle} --ar 1:1`)
        }
    ];
};

/**
 * Phaya.io Nano Banana Pro - Image Generation & Editing
 */
export const callPhayaImageGen = async (
    apiKey: string,
    prompt: string,
    options: {
        image_input?: string[];
        aspect_ratio?: string;
        resolution?: '1K' | '2K' | '4K';
        output_format?: 'png' | 'jpg';
    } = {}
): Promise<{ job_id: string; status: string }> => {
    try {
        const response = await fetch("https://api.phaya.io/api/v1/nano-banana/create", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                image_input: options.image_input,
                aspect_ratio: options.aspect_ratio || '1:1',
                resolution: options.resolution || '1K',
                output_format: options.output_format || 'png'
            })
        });

        if (!response.ok) {
            const error = asJsonObject(await response.json());
            throw new Error(typeof error.detail === 'string' ? error.detail : 'การสร้างภาพด้วย Phaya.io ล้มเหลว');
        }

        return await response.json();
    } catch (error: unknown) {
        console.error('Phaya API Error:', error);
        throw error;
    }
};

/**
 * Poll Phaya.io job status until completed or failed
 */
export const pollPhayaJobStatus = async (
    apiKey: string,
    jobId: string,
    onProgress?: (status: string) => void
): Promise<string> => {
    const maxAttempts = 30; // 30 attempts * 5 seconds = 150 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`https://api.phaya.io/api/v1/nano-banana/status/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) throw new Error('ไม่สามารถตรวจสอบสถานะงานได้');

            const result = await response.json();

            if (result.status === 'completed') {
                return result.image_url;
            } else if (result.status === 'failed') {
                throw new Error(result.error || 'การประมวลผลล้มเหลว');
            }

            if (onProgress) onProgress(result.status);

            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        } catch (error: unknown) {
            console.warn('Polling error:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }
    }

    throw new Error('เกิดข้อผิดพลาด: การประมวลผลใช้เวลานานเกินไป');
};

/**
 * Phaya.io Standard Text-to-Image (1 Credit)
 */
export const callPhayaStandardImageGen = async (
    apiKey: string,
    prompt: string,
    options: {
        aspect_ratio?: string;
    } = {}
): Promise<{ job_id: string; status: string }> => {
    try {
        const response = await fetch("https://api.phaya.io/api/v1/text-to-image/generate", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                aspect_ratio: options.aspect_ratio || '1:1'
            })
        });

        if (!response.ok) {
            const error = asJsonObject(await response.json());
            throw new Error(typeof error.detail === 'string' ? error.detail : 'การสร้างภาพด้วย Phaya.io Standard ล้มเหลว');
        }

        return await response.json();
    } catch (error: unknown) {
        console.error('Phaya Standard API Error:', error);
        throw error;
    }
};

/**
 * Fetch Phaya.io Image Generation History
 */
export const getPhayaHistory = async (
    apiKey: string,
    limit: number = 10,
    statusFilter: string = 'completed'
): Promise<PhayaHistoryItem[]> => {
    try {
        const response = await fetch(`https://api.phaya.io/api/v1/text-to-image/history?limit=${limit}&status_filter=${statusFilter.toUpperCase()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('ไม่สามารถดึงประวัติการสร้างภาพได้');
        }

        const result = asJsonObject(await response.json());
        return Array.isArray(result.history) ? result.history as PhayaHistoryItem[] : [];
    } catch (error) {
        console.error('Fetch History Error:', error);
        throw error;
    }
};
/**
 * OpenAI DALL-E 3 Image Generation
 */
export const callDalleImageGen = async (
    apiKey: string,
    prompt: string,
    options: {
        size?: '1024x1024' | '1024x1792';
        quality?: 'standard' | 'hd';
    } = {}
): Promise<string> => {
    try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: options.size || "1024x1024",
                quality: options.quality || "standard"
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(getNestedMessage(error, 'การสร้างภาพด้วย DALL-E 3 ล้มเหลว'));
        }

        const result = asJsonObject(await response.json());
        const data = Array.isArray(result.data) ? result.data : [];
        const first = asJsonObject(data[0]);
        if (typeof first.url !== 'string') {
            throw new Error('DALL-E response did not include an image URL');
        }
        return first.url;
    } catch (error: unknown) {
        console.error('DALL-E API Error:', error);
        throw error;
    }
};

/**
 * Google Imagen 3 Image Generation
 */
export const callGoogleImagenGen = async (
    apiKey: string,
    prompt: string,
    modelId: string = 'imagen-3.0-generate-001'
): Promise<string> => {
    try {
        // Map model IDs to real API names
        const modelMap: Record<string, string> = {
            'imagen-3': 'imagen-3.0-generate-001',
            'gemini-2-5-flash-image': 'imagen-3.0-generate-001', // Fallback for generation
            'gemini-3-pro-image': 'imagen-3.0-generate-001'
        };

        const modelName = modelMap[modelId] || modelId;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1"
                }
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(getNestedMessage(error, `Google Imagen error: ${response.status}`));
        }

        const result = asJsonObject(await response.json());
        const predictions = Array.isArray(result.predictions) ? result.predictions : [];
        const firstPrediction = asJsonObject(predictions[0]);
        const base64Image = firstPrediction.bytesBase64Encoded;

        if (typeof base64Image !== 'string') {
            throw new Error('No image was generated in the response.');
        }

        return `data:image/png;base64,${base64Image}`;
    } catch (error: unknown) {
        console.error('Google Imagen API Error:', error);
        throw error;
    }
};

