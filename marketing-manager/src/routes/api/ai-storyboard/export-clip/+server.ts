import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This is a proxy endpoint that forwards requests to the 003-ai-storyboard-creator service
export const POST: RequestHandler = async ({ request, fetch }) => {
    try {
        const requestData = await request.json();
        
        // Forward the request to the 003-ai-storyboard-creator service
        // Assuming the service is running on localhost:5173
        const response = await fetch('http://localhost:5173/api/storyboard/export-frame', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                frameData: {
                    id: requestData.clipId,
                    canvas: requestData.canvas,
                    narrationAudioUrl: requestData.narrationAudioUrl,
                    mainImageUrl: requestData.imageUrl,
                    duration: requestData.duration || 3000
                }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to export clip: ${errorText}`);
        }
        
        // Return the video file directly
        const videoData = await response.blob();
        
        return new Response(videoData, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="clip_${requestData.clipId}.mp4"`
            }
        });
    } catch (err: any) {
        console.error('Error in export-clip proxy:', err);
        throw error(500, err.message || 'Failed to export clip');
    }
};
