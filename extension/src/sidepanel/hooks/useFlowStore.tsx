import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppStep, ScannedImage, ProductAnalysis, GoogleUser, GeneratedPrompt, SellingContent, ScrapedContent } from '../../types';

interface AppState {
    step: AppStep;
    scannedImages: ScannedImage[];
    scrapedContent?: ScrapedContent;
    sourceProductUrl: string;
    selectedImages: string[];
    analysisResult: ProductAnalysis | null;
    generatedPrompts: GeneratedPrompt[];
    generatedImages: string[];
    sellingContent: SellingContent | null;
    processedImage: string | null;
    selectedModelId: string;
    selectedSlideType: string;
    selectedStyle: string;
    customPrompt: string;
    selectedGenModel: string;
    isGenerating: boolean;
    userProfile: GoogleUser | null;
    authToken: string | null;
}

type Action =
    | { type: 'SET_STEP'; payload: AppStep }
    | { type: 'SET_SCANNED_IMAGES'; payload: ScannedImage[] }
    | { type: 'SET_SCRAPED_CONTENT'; payload: ScrapedContent }
    | { type: 'SET_SOURCE_PRODUCT_URL'; payload: string }
    | { type: 'TOGGLE_IMAGE_SELECTION'; payload: string }
    | { type: 'SET_ANALYSIS_RESULT'; payload: ProductAnalysis }
    | { type: 'SET_GENERATED_PROMPTS'; payload: GeneratedPrompt[] }
    | { type: 'SET_GENERATED_IMAGES'; payload: string[] }
    | { type: 'ADD_GENERATED_IMAGES'; payload: string[] }
    | { type: 'SET_SELLING_CONTENT'; payload: SellingContent | null }
    | { type: 'SET_PROCESSED_IMAGE'; payload: string }
    | { type: 'SET_MODEL_ID'; payload: string }
    | { type: 'SET_SLIDE_TYPE'; payload: string }
    | { type: 'SET_STYLE'; payload: string }
    | { type: 'SET_CUSTOM_PROMPT'; payload: string }
    | { type: 'SET_GEN_MODEL'; payload: string }
    | { type: 'SET_IS_GENERATING'; payload: boolean }
    | { type: 'SET_USER_PROFILE'; payload: GoogleUser | null }
    | { type: 'SET_AUTH_TOKEN'; payload: string | null }
    | { type: 'RESET' };

const initialState: AppState = {
    step: 'SCAN',
    scannedImages: [],
    sourceProductUrl: '',
    selectedImages: [],
    analysisResult: null,
    generatedPrompts: [],
    generatedImages: [],
    sellingContent: null,
    processedImage: null,
    selectedModelId: 'dalle-3',
    selectedSlideType: 'Cover',
    selectedStyle: 'Minimalist',
    customPrompt: '',
    selectedGenModel: 'dalle-3',
    isGenerating: false,
    userProfile: null,
    authToken: null,
};

const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    goToNextStep: () => void;
    goToPrevStep: () => void;
} | undefined>(undefined);

function appReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, step: action.payload };
        case 'SET_SCANNED_IMAGES':
            return { ...state, scannedImages: action.payload };
        case 'SET_SCRAPED_CONTENT':
            return { ...state, scrapedContent: action.payload };
        case 'SET_SOURCE_PRODUCT_URL':
            return { ...state, sourceProductUrl: action.payload };
        case 'TOGGLE_IMAGE_SELECTION': {
            const isSelected = state.selectedImages.includes(action.payload);
            return {
                ...state,
                selectedImages: isSelected
                    ? state.selectedImages.filter((id) => id !== action.payload)
                    : [...state.selectedImages, action.payload],
            };
        }
        case 'SET_ANALYSIS_RESULT':
            return { ...state, analysisResult: action.payload };
        case 'SET_GENERATED_PROMPTS':
            return { ...state, generatedPrompts: action.payload };
        case 'SET_GENERATED_IMAGES':
            return { ...state, generatedImages: action.payload };
        case 'ADD_GENERATED_IMAGES':
            return { ...state, generatedImages: [...state.generatedImages, ...action.payload] };
        case 'SET_SELLING_CONTENT':
            return { ...state, sellingContent: action.payload };
        case 'SET_PROCESSED_IMAGE':
            return { ...state, processedImage: action.payload };
        case 'SET_MODEL_ID':
            return { ...state, selectedModelId: action.payload };
        case 'SET_SLIDE_TYPE':
            return { ...state, selectedSlideType: action.payload };
        case 'SET_STYLE':
            return { ...state, selectedStyle: action.payload };
        case 'SET_CUSTOM_PROMPT':
            return { ...state, customPrompt: action.payload };
        case 'SET_GEN_MODEL':
            return { ...state, selectedGenModel: action.payload };
        case 'SET_IS_GENERATING':
            return { ...state, isGenerating: action.payload };
        case 'SET_USER_PROFILE':
            return { ...state, userProfile: action.payload };
        case 'SET_AUTH_TOKEN':
            return { ...state, authToken: action.payload };
        case 'RESET':
            return { ...initialState, selectedModelId: state.selectedModelId };
        default:
            return state;
    }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Load initial settings
    useEffect(() => {
        chrome.storage.local.get(['selected_model_id'], (result) => {
            if (result.selected_model_id) {
                dispatch({ type: 'SET_MODEL_ID', payload: result.selected_model_id as string });
            }
        });
    }, []);

    const goToNextStep = () => {
        const steps: AppStep[] = ['SCAN', 'SELECT', 'ANALYZE', 'GENERATE', 'CONTENT', 'EXPORT'];
        const currentIndex = steps.indexOf(state.step);
        if (currentIndex < steps.length - 1) {
            dispatch({ type: 'SET_STEP', payload: steps[currentIndex + 1] });
        }
    };

    const goToPrevStep = () => {
        const steps: AppStep[] = ['SCAN', 'SELECT', 'ANALYZE', 'GENERATE', 'CONTENT', 'EXPORT'];
        const currentIndex = steps.indexOf(state.step);
        if (currentIndex > 0) {
            dispatch({ type: 'SET_STEP', payload: steps[currentIndex - 1] });
        }
    };

    return (
        <AppContext.Provider value={{ state, dispatch, goToNextStep, goToPrevStep }}>
            {children}
        </AppContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppFlow() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppFlow must be used within an AppProvider');
    }
    return context;
}
