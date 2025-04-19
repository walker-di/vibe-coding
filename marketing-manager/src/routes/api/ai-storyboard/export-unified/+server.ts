import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This is a proxy endpoint that forwards requests to the 003-ai-storyboard-creator service
export const POST: RequestHandler = async ({ request, fetch }) => {
    try {
        const requestData = await request.json();
        
        // Forward the request to the 003-ai-storyboard-creator service
        // Assuming the service is running on localhost:5173
        const response = await fetch('http://localhost:5173/api/storyboard/export-unified', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                storyboardId: requestData.storyId.toString(),
                title: requestData.title,
                frames: requestData.scenes.flatMap(scene => 
                    scene.clips.map(clip => ({
                        id: clip.id.toString(),
                        frameOrder: clip.orderIndex || 0,
                        narrationAudioUrl: clip.narrationAudioUrl,
                        mainImageUrl: clip.imageUrl,
                        canvas: clip.canvas,
                        duration: clip.duration || 3000,
                        transition: clip.transition || 'fade'
                    }))
                )
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to export unified video: ${errorText}`);
        }
        
        // Return the video file directly
        const videoData = await response.blob();
        
        return new Response(videoData, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="story_${requestData.storyId}_unified.mp4"`
            }
        });
    } catch (err: any) {
        console.error('Error in export-unified proxy:', err);
        throw error(500, err.message || 'Failed to export unified video');
    }
};
