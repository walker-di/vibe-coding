import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, clips, bgmFiles } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateMusicPrompt } from '$lib/server/aiService';
import { successResponse, HttpStatus, withErrorHandling } from '$lib/server/utils/api-utils';

/**
 * POST handler for auto-selecting BGM for a scene
 */
export const POST: RequestHandler = withErrorHandling(async ({ params }) => {
  // Validate and parse the ID parameter
  const sceneId = parseInt(params.id, 10);
  if (isNaN(sceneId)) {
    throw error(400, 'Invalid scene ID');
  }

  // Fetch the scene with its clips
  const scene = await db.query.scenes.findFirst({
    where: eq(scenes.id, sceneId),
    with: {
      clips: {
        orderBy: clips.orderIndex
      }
    }
  });

  if (!scene) {
    throw error(404, `Scene with ID ${sceneId} not found`);
  }

  // Gather context from the scene and its clips
  let contextText = scene.description || '';

  // Add clip narrations and descriptions to the context
  if (scene.clips && scene.clips.length > 0) {
    for (const clip of scene.clips) {
      if (clip.narration) {
        contextText += ' ' + clip.narration;
      }
      if (clip.description) {
        contextText += ' ' + clip.description;
      }
    }
  }

  // If we don't have enough context, use a generic description
  if (!contextText.trim()) {
    contextText = 'Background music for a marketing video scene';
  }

  // Try to generate a music prompt based on the context
  let musicPrompt;
  try {
    musicPrompt = await generateMusicPrompt(contextText);
  } catch (err) {
    console.error('Error generating music prompt:', err);
    // Continue with a fallback approach instead of throwing an error
  }

  // If we couldn't generate a music prompt, use the context text directly
  if (!musicPrompt) {
    console.warn('Failed to generate music prompt, using context text directly');
    musicPrompt = contextText;
  }

  // Fetch available BGM files
  const availableBgmFiles = await db.select()
    .from(bgmFiles)
    .orderBy(desc(bgmFiles.createdAt));

  if (!availableBgmFiles.length) {
    throw error(404, 'No BGM files found. Please upload some BGM files first.');
  }

  // Enhanced matching algorithm:
  // 1. Calculate similarity score between music prompt and each BGM description
  // 2. Select the BGM with the highest score
  let bestMatch = null;
  let highestScore = -1;

  // Extract key mood/genre words from the music prompt
  const moodKeywords = [
    'happy', 'sad', 'energetic', 'calm', 'relaxed', 'upbeat', 'melancholic',
    'dramatic', 'epic', 'peaceful', 'tense', 'romantic', 'mysterious', 'playful',
    'inspirational', 'corporate', 'professional', 'ambient', 'electronic', 'acoustic',
    'orchestral', 'jazz', 'rock', 'pop', 'classical', 'folk', 'cinematic'
  ];

  // Clean up the music prompt to focus on important words
  const cleanPrompt = musicPrompt.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s{2,}/g, ' ');

  for (const bgm of availableBgmFiles) {
    const bgmDescription = (bgm.description || bgm.name || '').toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s{2,}/g, ' ');

    // Calculate a weighted similarity score
    const promptWords = cleanPrompt.split(/\s+/);
    const descriptionWords = bgmDescription.split(/\s+/);

    let matchCount = 0;
    let moodMatchCount = 0;

    // Count matching words with extra weight for mood keywords
    for (const word of promptWords) {
      if (word.length > 3 && descriptionWords.includes(word)) {
        matchCount++;

        // Give extra weight to mood/genre keywords
        if (moodKeywords.includes(word)) {
          moodMatchCount += 2; // Mood keywords count 3x (1 for the regular match + 2 here)
        }
      }
    }

    // Calculate weighted score
    const baseScore = promptWords.length > 0 ? matchCount / promptWords.length : 0;
    const moodBonus = promptWords.length > 0 ? moodMatchCount / promptWords.length : 0;
    const score = baseScore + moodBonus;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = bgm;
    }
  }

  // If no good match found or score is too low, use a more basic approach
  if (highestScore < 0.05 && availableBgmFiles.length > 0) {
    console.log('Low match score, trying simpler matching approach');

    // Try to match based on just a few key terms from the context
    const contextKeyTerms = contextText.toLowerCase().split(/\s+/)
      .filter(word => word.length > 4) // Only consider longer words
      .slice(0, 5);    // Take just a few key terms

    if (contextKeyTerms.length > 0) {
      for (const bgm of availableBgmFiles) {
        const bgmDescription = (bgm.description || bgm.name || '').toLowerCase();

        let termMatchCount = 0;
        for (const term of contextKeyTerms) {
          if (bgmDescription.includes(term)) {
            termMatchCount++;
          }
        }

        const termScore = termMatchCount / contextKeyTerms.length;
        if (termScore > highestScore) {
          highestScore = termScore;
          bestMatch = bgm;
        }
      }
    }
  }

  // If still no good match, just pick the first BGM
  if (!bestMatch && availableBgmFiles.length > 0) {
    console.log('No match found, selecting first available BGM');
    bestMatch = availableBgmFiles[0];
  }

  if (!bestMatch) {
    throw error(404, 'Could not find a suitable BGM match');
  }

  // Update the scene with the selected BGM
  const [updatedScene] = await db.update(scenes)
    .set({
      bgmUrl: bestMatch.audioUrl,
      bgmName: bestMatch.name,
      updatedAt: new Date()
    })
    .where(eq(scenes.id, sceneId))
    .returning();

  return json(successResponse({
    scene: updatedScene,
    selectedBgm: bestMatch,
    musicPrompt
  }));
});
