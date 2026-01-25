export const removeBackground = async (apiKey: string, imageUrl: string): Promise<Blob> => {
    try {
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: imageUrl,
                size: 'auto',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.errors?.[0]?.title || 'Failed to remove background');
        }

        return await response.blob();
    } catch (error) {
        console.error('BG Removal failed:', error);
        throw error;
    }
};
