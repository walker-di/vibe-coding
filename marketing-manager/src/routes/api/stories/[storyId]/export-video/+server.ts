import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';

export const GET: RequestHandler = async ({ params, fetch }) => {
    const { storyId } = params;
    
    if (!storyId || isNaN(Number(storyId))) {
        throw error(400, 'Invalid story ID');
    }
    
    try {
        // 1. Fetch the story data with all scenes and clips
        const storyResponse = await fetch(`/api/stories/${storyId}?includeScenes=true&includeClips=true`);
        if (!storyResponse.ok) {
            throw error(404, `Story with ID ${storyId} not found`);
        }
        
        const storyData = await storyResponse.json();
        const story = storyData.data;
        
        if (!story || !story.scenes || story.scenes.length === 0) {
            throw error(404, `Story data not found or has no scenes for ID ${storyId}`);
        }
        
        // 2. Ensure all clips have narration audio
        for (const scene of story.scenes) {
            if (!scene.clips || scene.clips.length === 0) continue;
            
            for (const clip of scene.clips) {
                if (!clip.narrationAudioUrl && clip.narration) {
                    // Generate narration audio if it doesn't exist
                    const narrationResponse = await fetch('/api/ai-storyboard/generate-narration', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            clipId: clip.id,
                            voiceName: clip.voiceName || 'pt-BR-FranciscaNeural'
                        })
                    });
                    
                    if (narrationResponse.ok) {
                        const narrationResult = await narrationResponse.json();
                        clip.narrationAudioUrl = narrationResult.narrationAudioUrl;
                        
                        // Update the clip with the new narration audio URL
                        await fetch(`/api/clips/${clip.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                narrationAudioUrl: clip.narrationAudioUrl
                            })
                        });
                    }
                }
            }
        }
        
        // 3. Call the AI storyboard creator service to generate the unified video
        const exportResponse = await fetch(`/api/ai-storyboard/export-unified`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storyId: story.id,
                title: story.name || `Story ${storyId}`,
                scenes: story.scenes.map(scene => ({
                    id: scene.id,
                    clips: scene.clips.map(clip => ({
                        id: clip.id,
                        canvas: clip.canvas,
                        narrationAudioUrl: clip.narrationAudioUrl,
                        imageUrl: clip.imageUrl,
                        duration: clip.duration || 3000,
                        transition: 'fade' // Default transition
                    }))
                }))
            })
        });
        
        if (!exportResponse.ok) {
            throw error(500, 'Failed to export unified video');
        }
        
        // 4. Return the video file
        const videoBlob = await exportResponse.blob();
        
        return new Response(videoBlob, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="story_${storyId}_unified.mp4"`
            }
        });
    } catch (err: any) {
        console.error(`Error exporting unified video for story ${storyId}:`, err);
        throw error(500, err.message || 'Failed to export unified video');
    }
};
