import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';

export const GET: RequestHandler = async ({ params, fetch }) => {
    const { clipId } = params;
    
    if (!clipId || isNaN(Number(clipId))) {
        throw error(400, 'Invalid clip ID');
    }
    
    try {
        // 1. Fetch the clip data from the database
        const clipResponse = await fetch(`/api/clips/${clipId}`);
        if (!clipResponse.ok) {
            throw error(404, `Clip with ID ${clipId} not found`);
        }
        
        const clipData = await clipResponse.json();
        const clip = clipData.data;
        
        if (!clip) {
            throw error(404, `Clip data not found for ID ${clipId}`);
        }
        
        // 2. Check if the clip has the required data for video generation
        if (!clip.narration) {
            throw error(400, `Clip ${clipId} is missing narration text`);
        }
        
        if (!clip.narrationAudioUrl) {
            // Generate narration audio if it doesn't exist
            const narrationResponse = await fetch('/api/ai-storyboard/generate-narration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clipId: clip.id,
                    voiceName: clip.voiceName || 'pt-BR-FranciscaNeural'
                })
            });
            
            if (!narrationResponse.ok) {
                throw error(500, 'Failed to generate narration audio');
            }
            
            const narrationResult = await narrationResponse.json();
            clip.narrationAudioUrl = narrationResult.narrationAudioUrl;
            
            // Update the clip with the new narration audio URL
            await fetch(`/api/clips/${clipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    narrationAudioUrl: clip.narrationAudioUrl
                })
            });
        }
        
        // 3. Call the AI storyboard creator service to generate the video
        const exportResponse = await fetch(`/api/ai-storyboard/export-clip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clipId: clip.id,
                canvas: clip.canvas,
                narrationAudioUrl: clip.narrationAudioUrl,
                imageUrl: clip.imageUrl,
                duration: clip.duration || 3000
            })
        });
        
        if (!exportResponse.ok) {
            throw error(500, 'Failed to export clip video');
        }
        
        // 4. Return the video file
        const videoBlob = await exportResponse.blob();
        
        return new Response(videoBlob, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="clip_${clipId}.mp4"`
            }
        });
    } catch (err: any) {
        console.error(`Error exporting clip ${clipId}:`, err);
        throw error(500, err.message || 'Failed to export clip video');
    }
};
