export interface ScannedImage {
    src: string;
    width: number;
    height: number;
    alt?: string;
}

export type AIModelId = 'dalle-3' | 'gemini-flash-lite' | 'gemini-2-5-flash-lite' | 'gemini-2-5-flash-image' | 'imagen-3' | 'veo-3-1' | 'gemini-3-pro' | 'gemini-3-pro-image' | 'phaya-ai' | 'custom-api';

export interface AIModel {
    id: AIModelId;
    name: string;
    version: string;
    description: string;
    tags: string[];
    latency: string;
    status: 'READY' | 'LOADING' | 'ERROR';
    quote: string;
    realModelName: string;
    isThirdParty?: boolean;
    requiresCustomApiKey?: boolean;
}

export interface ThirdPartyApiConfig {
    apiKey: string;
    apiUrl: string;
    modelName?: string;
}

export type MessageType =
    | { type: 'PING' }
    | { type: 'SCAN_IMAGES' }
    | { type: 'IMAGES_FOUND'; images: ScannedImage[] }
    | { type: 'FETCH_IMAGE_BASE64'; imageUrl: string }
    | { type: 'ANALYZE_PRODUCT'; apiKey: string; imageUrl: string; base64Override?: string; modelId?: AIModelId }
    | { type: 'TEST_API_KEY'; apiKey: string }
    | { type: 'REMOVE_BACKGROUND'; apiKey: string; imageUrl: string }
    | {
        type: 'SEND_TO_SHOPEE_MASTER';
        payload: {
            productUrl: string;
            productName: string;
            productDesc: string;
            images: string[];
        };
    }
    | {
        type: 'CALL_AI_MODEL';
        payload: {
            images: string[]; // base64 strings
            style: string;
            language: 'th' | 'en';
            fidelity: 'strict';
        };
    };

export interface ProductAnalysis {
    product_name: string;
    key_features: string[];
    materials: string;
    ideal_lifestyle_setting: string;
    dimensions_guess: string;
}

export interface SellingContent {
    style: 'fun' | 'story' | 'formal';
    headline: string;
    content: string;
    hashtags: string[];
}

export type ContentStyle = 'fun' | 'story' | 'formal';

export interface GeneratedPrompt {
    id: number;
    type: string;
    description: string;
    prompt: string;
}

export type ImageStyle = 'Minimalist' | 'Luxury' | 'Nature' | 'Urban' | 'Studio';

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export type AppStep = 'SCAN' | 'SELECT' | 'ANALYZE' | 'GENERATE' | 'CONTENT' | 'EXPORT';

export interface AppState {
    currentStep: AppStep;
    scannedImages: ScannedImage[];
    selectedImages: string[];
    analysisResult: ProductAnalysis | null;
    generatedImages: string[];
    generatedPrompts: GeneratedPrompt[];
}

