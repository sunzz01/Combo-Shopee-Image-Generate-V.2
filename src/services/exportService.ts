import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ProductAnalysis, GeneratedPrompt, SellingContent } from '../types';

export const exportPackage = async (
    analysis: ProductAnalysis,
    prompts: GeneratedPrompt[],
    originalImage: string, // URL or Base64
    processedImage: string | null, // URL
    generatedImages: string[] = [], // AI generated images
    sellingContent: SellingContent | null = null // New: Marketing Copy
) => {
    const zip = new JSZip();
    const folderName = analysis.product_name.replace(/[^a-z0-9ก-๙]/gi, '_').substring(0, 20);
    const folder = zip.folder(folderName) || zip;

    // 1. Add Analysis Report
    const analysisText = `
Product: ${analysis.product_name}
Key Features:
${analysis.key_features.map(f => `- ${f}`).join('\n')}
Materials: ${analysis.materials}
Dimensions: ${analysis.dimensions_guess}
Lifestyle: ${analysis.ideal_lifestyle_setting}
`.trim();
    folder.file('analysis_report.txt', analysisText);

    // 2. Add Selling Content
    if (sellingContent) {
        const contentText = `
TITLE/HEADLINE:
${sellingContent.headline}

PRODUCT DESCRIPTION:
${sellingContent.content}

HASHTAGS:
${sellingContent.hashtags.join(' ')}

STYLE: ${sellingContent.style.toUpperCase()}
`.trim();
        folder.file('selling_content.txt', contentText);
    }

    // 3. Add Prompts
    const promptsText = prompts.map(p => `
[${p.type}] - ${p.description}
Prompt: ${p.prompt}
`).join('\n-------------------\n');
    folder.file('midjourney_prompts.txt', promptsText);

    // 4. Add Original Image
    try {
        const response = await fetch(originalImage);
        const blob = await response.blob();
        folder.file('original_image.jpg', blob);
    } catch (error) {
        console.error('Failed to add original image to zip:', error);
    }

    // 5. Add Processed Image (if available)
    if (processedImage) {
        try {
            const response = await fetch(processedImage);
            const blob = await response.blob();
            folder.file('processed_image_no_bg.png', blob);
        } catch (error) {
            console.error('Failed to add processed image to zip:', error);
        }
    }

    // 6. Add AI Generated Images
    if (generatedImages.length > 0) {
        const aiFolder = folder.folder('AI_Generated');
        for (let i = 0; i < generatedImages.length; i++) {
            try {
                const response = await fetch(generatedImages[i]);
                const blob = await response.blob();
                const extension = blob.type.split('/')[1] || 'png';
                aiFolder?.file(`AI_Gen_${i + 1}.${extension}`, blob);
            } catch (error) {
                console.error(`Failed to add generated image ${i} to zip:`, error);
            }
        }
    }

    // Generate and Download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${folderName}_package.zip`);
};
