import { GoogleGenAI, Type } from "@google/genai";
import { ImageCategory, ProductData } from "./types";

// Interface for the product analysis result from Gemini
export interface ProductAnalysis {
  name: string;
  summary: string;
  features: string[];
  visualDescription: string;
}

// Analyze product info and extract key selling points using Gemini 3 Flash
// Analyze product info and extract key selling points using Gemini
export const analyzeProduct = async (productInfo: string, images?: string[]): Promise<ProductAnalysis> => {
  // ตรวจสอบว่า API key มีอยู่จริง
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare content parts
  const parts: any[] = [];

  // Add images if available
  if (images && images.length > 0) {
    images.forEach(img => {
      // Handle both base64 string (data:image/...) and raw base64
      const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: base64Data
        }
      });
    });
  }

  // Add text prompt
  parts.push({
    text: `Analyze this Shopee product based on the provided ${images?.length ? 'images and ' : ''}description. 
    Product Info: ${productInfo || "No text description provided, please analyze the images."}
    Extract 3-5 key selling points (features) and a concise visual description of the product for image generation.
    Return as JSON with keys: "name", "summary", "features" (array of strings), "visualDescription".`
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            summary: { type: Type.STRING },
            features: { type: Type.ARRAY, items: { type: Type.STRING } },
            visualDescription: { type: Type.STRING }
          },
          required: ["name", "summary", "features", "visualDescription"]
        }
      }
    });

    // Ensure we return a typed object from JSON response
    const text = response.text || "{}";
    return JSON.parse(text) as ProductAnalysis;
  } catch (error) {
    console.error("Error during product analysis:", error);
    throw new Error(`Product analysis failed: ${error.message}`);
  }
};

// Generate product images using Gemini 2.5 Flash Image model
export const generateProductImage = async (
  category: ImageCategory,
  productData: ProductData,
  style: string,
  customPrompt?: string  // เพิ่มพารามิเตอร์สำหรับ custom prompt
): Promise<string> => {
  // ตรวจสอบว่า API key มีอยู่จริง
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let promptSuffix = "";
  switch (category) {
    case ImageCategory.COVER:
      // อัปเดตเพื่อรองรับสไตล์ใหม่
      switch (style) {
        case 'alibaba':
          promptSuffix = `A B2B-focused product photo in Alibaba style. Bold, authoritative design with vibrant "Verified Supplier" or "Gold Supplier" badges on a solid-color background. Professional product shot with industrial context. Emphasizes trust, scale, and business reliability for wholesale buyers. Use urgent-colored badges (red/yellow).`;
          break;
        case 'aliexpress':
          promptSuffix = `A global marketplace product photo in AliExpress style. Clean, premium aesthetic with pure white background. Multiple high-resolution angles (360° view) and extreme close-ups showing texture. Elegant "Free Shipping" and "Warranty" icons. Professional, trustworthy look for cross-border shoppers.`;
          break;
        case 'etsy':
          promptSuffix = `An artisanal product photo in Etsy style. Warm, rustic aesthetic with natural textures (wood, linen, paper) as background. Soft natural lighting. Shows handmade quality, possibly with creator's hands in frame. Evokes storytelling, authenticity, and emotional connection. Lifestyle context, not studio shot.`;
          break;
        case 'minimalist':
          promptSuffix = `A premium product photo in Minimalist/Apple-like style. Extensive white space, geometric composition. Product perfectly lit to highlight form and materials. No text, badges, or decorations. Sparse elegant typography only if absolutely necessary. Focuses purely on product design and quality.`;
          break;
        case '1688':
          promptSuffix = `A wholesale bulk product photo in 1688 style. Shows product variations in grid or pallets/warehouse setting. Large bold price tags showing unit cost and MOQs. Factory-direct aesthetic with QR code contact. High-contrast background (blue/red). Information-dense, no-nonsense B2B focus.`;
          break;
        case 'taobao':
          promptSuffix = `A comprehensive product photo in Taobao style. Colorful background, multiple angles (front/back/side/close-up) in one composite image. Detailed info graphics showing specs, materials, dimensions. Includes promotional text and KOL endorsements. Lively, information-rich, all-in-one visual.`;
          break;
        case 'pinduoduo':
          promptSuffix = `A group-buy focused product photo in Pinduoduo style. Vibrant single-color background with huge bold contrasting text. Shows dramatic price drop from original to group-buy price. Includes countdown timer and participant counter. Urgent, eye-catching, designed for impulse purchases.`;
          break;
        case 'xianyu':
          promptSuffix = `A second-hand product photo in Xianyu style. Raw, unedited photography with natural ambient lighting. Simple real-life background (home setting). Shows any flaws or wear clearly for transparency. Minimal text overlay. Authentic, honest C2C transaction aesthetic.`;
          break;
        default:
          promptSuffix = `A professional commercial product photography cover in ${style} style. Clean lighting, e-commerce catalog look, white background.`;
          break;
      }
      break;
    case ImageCategory.INFOGRAPHIC:
      promptSuffix = `A product infographic showing the product with 3 icons representing these features: ${productData.features.join(", ")}. Minimalist background, professional marketing layout.`;
      break;
    case ImageCategory.CLOSE_UP:
      promptSuffix = `Macro extreme close-up shot of the product focusing on its material texture, stitching, and high-quality details. Soft bokeh background, professional studio lighting.`;
      break;
    case ImageCategory.LIFESTYLE_A:
      promptSuffix = `Lifestyle photography of the product being used by a person inside a cozy home environment. Warm natural light coming through a window, realistic living room or kitchen setting.`;
      break;
    case ImageCategory.LIFESTYLE_B:
      promptSuffix = `Lifestyle photography of the product in an outdoor nature setting (park, garden, or beach). Bright sunny day, organic textures, adventurous and fresh feel.`;
      break;
    case ImageCategory.LIFESTYLE_C:
      promptSuffix = `Lifestyle photography of the product in a professional urban setting. Modern architecture, clean lines, corporate or city background, sophisticated lighting.`;
      break;
    case ImageCategory.SIZE_CHART:
      promptSuffix = `A product size comparison shot. The product placed next to a common object like a smartphone or held in a human hand for scale. Clear visibility of dimensions.`;
      break;
    case ImageCategory.SOCIAL_PROOF:
      promptSuffix = `A scene showing the product nicely packaged as received by a customer, with a warm, authentic aesthetic. Suggesting high quality and customer satisfaction.`;
      break;
    case ImageCategory.TUTORIAL:
      promptSuffix = `A clean visual guide or step-by-step arrangement showing how to use the product or what items come in the box as gifts. Organized and clear.`;
      break;
  }

  // ใช้ custom prompt หากมีการส่งมา ไม่งั้นใช้ prompt ปกติ
  const prompt = customPrompt || `Generate a new ${category} image. Product: ${productData.name}. Description: ${productData.description}. Style requirements: ${promptSuffix}. Use the provided source images to ensure the product looks accurate and consistent.`;

  // Filter and format images for multimodal input (Ensuring we only send base64 data)
  // ให้ภาพที่อัปโหลดจากผู้ใช้ (local images) มีลำดับความสำคัญสูงสุด
  const imageParts = productData.images
    .filter(img => img && img.includes('base64'))
    .map(img => {
      const parts = img.split(',');
      const mimePart = parts[0];
      const dataPart = parts[1];
      const mimeType = mimePart.match(/:(.*?);/)?.[1] || 'image/png';
      return {
        inlineData: {
          data: dataPart,
          mimeType: mimeType
        }
      };
    })
    // จำกัดเฉพาะ 3 ภาพแรกที่มีความสำคัญสูงสุด
    .slice(0, 3); // Limit to 3 images to manage payload size

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Extract the generated image from parts
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Failed to generate image - no image data returned");
  } catch (error) {
    console.error("Error generating product image:", error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
};