import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import Replicate from 'replicate';
import { env } from '$env/dynamic/private';
import { AIGeneratedFrameSchema } from '$lib/types/storyboard';
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import fsPromises from 'fs/promises'; // For mkdir, writeFile
import fs from 'fs'; // Use standard fs for createWriteStream (if needed, maybe not)
import path from 'path';
import { randomUUID } from 'crypto';
import { Buffer } from 'node:buffer'; // Needed for handling fetch response
// Writable might not be needed if we handle Web Streams directly
// import { Writable } from 'stream';
// Node's built-in fetch is globally available in recent versions

// --- Google Gemini Configuration ---
const GOOGLE_API_KEY = env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.warn('GOOGLE_API_KEY environment variable is not set. Story prompt generation will fail.');
}
// Initialize the Google Generative AI client only if the key exists
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// --- Azure Speech (TTS) Configuration ---
const AZURE_API_KEY = env.AZURE_API_KEY;
const AZURE_SPEECH_REGION = env.AZURE_SPEECH_REGION; // Required for Azure Speech SDK
const AZURE_SPEECH_VOICE_NAME = env.AZURE_SPEECH_VOICE_NAME || 'en-US-JennyNeural'; // Default voice if not set
if (!AZURE_API_KEY || !AZURE_SPEECH_REGION) {
    console.warn('AZURE_API_KEY or AZURE_SPEECH_REGION environment variable is not set. Narration audio generation will fail.');
} else {
    console.log(`Azure TTS configured: Region=${AZURE_SPEECH_REGION}, Voice=${AZURE_SPEECH_VOICE_NAME}`);
}

// --- Replicate Configuration ---
const REPLICATE_API_KEY = env.REPLICATE_API_KEY;
if (!REPLICATE_API_KEY) {
    console.warn('REPLICATE_API_KEY environment variable is not set. Image generation will fail.');
}
// Initialize Replicate client only if the key exists
const replicate = REPLICATE_API_KEY ? new Replicate({ auth: REPLICATE_API_KEY }) : null;


// --- Gemini: Generate Storyboard Frame Data ---
const GeminiResponseSchema = z.array(AIGeneratedFrameSchema);
export async function generateStoryboardFrames(storyPrompt: string): Promise<z.infer<typeof GeminiResponseSchema>> {
  if (!genAI) {
     throw error(500, 'Google AI Service is not configured. Missing GOOGLE_API_KEY.');
  }

  try {
    // Use a model that supports JSON output well if possible
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });

    const generationConfig = {
      temperature: 0.6, // Slightly lower temperature for more structured output
      topK: 40, // Keep some diversity
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json", // Request JSON output directly
    };

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
     ];

    // Construct the prompt for the AI
    const prompt = `
Based on the following story prompt, generate a sequence of storyboard frames.
Output ONLY a valid JSON array where each object in the array represents a single frame and strictly adheres to this Zod schema:
\`\`\`typescript
${JSON.stringify(AIGeneratedFrameSchema.shape, null, 2)}
\`\`\`
Ensure all string fields in the schema are populated for each frame.

Story Prompt:
"${storyPrompt}"

JSON Array Output:
`;

    console.log("Sending prompt to Gemini:", prompt);

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
    });

    const response = result.response;
    const responseText = response.text();

    console.log("Received raw response text from Gemini:", responseText);

    // Clean the response text to ensure it's valid JSON
    // Gemini might sometimes include markdown backticks or "json" prefix
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.substring(7);
    }
    if (cleanedJson.endsWith('```')) {
        cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
    }
    cleanedJson = cleanedJson.trim(); // Trim again after removing backticks

    // Parse the cleaned JSON string
    let parsedJson: any;
    try {
        parsedJson = JSON.parse(cleanedJson);
    } catch (parseError) {
        console.error("Failed to parse cleaned JSON response from Gemini:", parseError);
        console.error("Cleaned JSON string was:", cleanedJson);
        // Try parsing the original response text as a fallback before throwing
        try {
             parsedJson = JSON.parse(responseText);
             console.log("Successfully parsed original response text as fallback.");
        } catch (originalParseError) {
             console.error("Failed to parse original response text as well:", originalParseError);
             throw error(500, 'Gemini returned invalid JSON format.');
        }
    }

    // Validate the parsed JSON against the Zod schema
    const validationResult = GeminiResponseSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error("Gemini response validation failed:", validationResult.error.errors);
      throw error(500, `Gemini response did not match the expected format: ${validationResult.error.message}`);
    }

    console.log(`Successfully generated and validated ${validationResult.data.length} frames from Gemini.`);
    return validationResult.data;

  } catch (err: any) {
    console.error('Error calling Google Gemini:', err);
    // Check for specific Gemini errors
     if (err instanceof Error && err.message.includes('SAFETY')) {
         throw error(400, 'Gemini content generation blocked due to safety settings.');
     }
     // Re-throw kit errors, otherwise wrap as internal server error
     if (err.status) {
         throw err;
     }
     throw error(500, `Failed to generate storyboard frames from Gemini: ${err.message || err}`);
  }
}

// --- Gemini: Regenerate Prompt based on Instructions ---
export async function regeneratePrompt(
    originalPrompt: string,
    instructions: string,
    storyContext?: string, // Add optional storyContext parameter
    assetType?: 'narration' | 'mainImage' | 'backgroundImage' | 'bgm' // Add assetType parameter
): Promise<string> {
    if (!genAI) {
        throw error(500, 'Google AI Service is not configured. Missing GOOGLE_API_KEY.');
    }

    try {
        // Use a model suitable for instruction following / editing
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Or gemini-1.5-pro-latest

        const generationConfig = {
            temperature: 0.7, // Allow for some creativity in revision
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048, // Allow sufficient length for revised prompt
            // responseMimeType: "text/plain", // Expecting just the revised prompt text
        };

        const safetySettings = [
           { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
           { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
           { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
           { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // Construct the prompt for the AI, including context if provided
        const contextBlock = storyContext
            ? `
Consider the following overall story context when revising the prompt:
--- STORY CONTEXT ---
${storyContext}
--- END STORY CONTEXT ---
`
            : '';

        // --- Determine Task and Output Format based on assetType ---
        let taskDescription: string;
        let outputFormatInstruction: string;
        let originalTextLabel: string;
        let revisedTextLabel: string;
        let originalTextValue: string;

        switch (assetType) {
            case 'narration':
                taskDescription = instructions.trim()
                    ? `Revise the following original narration text based on the provided instructions (which may be in another language).${contextBlock}`
                    : `Generate a creative variation of the following original narration text, considering the overall story context.${contextBlock}`;
                outputFormatInstruction = 'Output ONLY the revised narration text, without any additional explanation, formatting, or preamble.';
                originalTextLabel = 'Original Narration';
                revisedTextLabel = 'Revised Narration';
                originalTextValue = originalPrompt || '(No original narration provided - generate suitable narration based on context and instructions)';
                break;
            case 'bgm':
                taskDescription = instructions.trim()
                    ? `Revise the following original English BGM prompt based on the provided instructions (which may be in another language).${contextBlock}`
                    : `Generate a creative variation of the following original English BGM prompt, considering the overall story context.${contextBlock}`;
                outputFormatInstruction = 'Output ONLY the resulting English BGM prompt text (suitable for a music generation model like MusicGen), without any extra explanations, labels, or formatting.';
                originalTextLabel = 'Original BGM Prompt';
                revisedTextLabel = 'Revised English BGM Prompt';
                originalTextValue = originalPrompt || '(No original BGM prompt provided - generate a suitable prompt based on context and instructions)';
                break;
            case 'mainImage':
            case 'backgroundImage':
            default: // Default to image prompt generation
                taskDescription = instructions.trim()
                    ? `Revise the following original English image prompt based on the provided instructions (which may be in another language).${contextBlock}`
                    : `Generate a creative variation of the following original English image prompt, considering the overall story context.${contextBlock}`;
                outputFormatInstruction = 'Output ONLY the resulting English image prompt text (suitable for an AI image generation model like Stable Diffusion or Midjourney), without any extra explanations, labels, or formatting.';
                originalTextLabel = 'Original Image Prompt';
                revisedTextLabel = 'Revised English Image Prompt';
                originalTextValue = originalPrompt || '(No original image prompt provided - generate a suitable prompt based on context and instructions)';
                break;
        }

        const instructionsBlock = instructions.trim()
            ? `
Instructions for Modification (interpret these even if not in English):
"${instructions}"
` : '';

        const prompt = `
${taskDescription}
${outputFormatInstruction}

${originalTextLabel}:
"${originalTextValue}"
${instructionsBlock}
${revisedTextLabel}:
`;

        console.log("Sending prompt regeneration request to Gemini:", prompt);

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
        });

        const response = result.response;
        const responseText = response.text().trim();

        console.log("Received raw response text from Gemini for prompt regeneration:", responseText);

        if (!responseText) {
             throw new Error('Gemini returned an empty response for prompt regeneration.');
        }

        // Basic cleaning (remove potential quotes if the model wraps the output)
        let cleanedPrompt = responseText;
        if (cleanedPrompt.startsWith('"') && cleanedPrompt.endsWith('"')) {
            cleanedPrompt = cleanedPrompt.substring(1, cleanedPrompt.length - 1);
        }

        console.log(`Successfully regenerated prompt: "${cleanedPrompt}"`);
        return cleanedPrompt;

    } catch (err: any) {
        console.error('Error calling Google Gemini for prompt regeneration:', err);
        if (err instanceof Error && err.message.includes('SAFETY')) {
            throw error(400, 'Gemini prompt regeneration blocked due to safety settings.');
        }
        if (err.status) { // Re-throw kit errors
            throw err;
        }
        throw error(500, `Failed to regenerate prompt via Gemini: ${err.message || err}`);
    }
}

// --- Azure: Generate Narration Audio (TTS) ---
const DEFAULT_AZURE_VOICE = 'pt-BR-FranciscaNeural'; // Define default voice

// Updated based on SDK example pattern
export async function generateNarrationAudioAzure(
    text: string,
    frameId: string,
    requestedVoiceName?: string // Add optional parameter for requested voice
): Promise<string | null> {
    // Check both variables again, using the correct sources
    if (!process.env.AZURE_API_KEY || !env.AZURE_SPEECH_REGION) {
        console.error('Azure Speech credentials not configured (checked process.env.AZURE_API_KEY and $env.AZURE_SPEECH_REGION). Cannot generate audio.');
        return null;
    }

    // Determine the voice to use: Prioritize requested, then env var, then default
    const voiceToUse = requestedVoiceName || env.AZURE_SPEECH_VOICE_NAME || DEFAULT_AZURE_VOICE;

    console.log(`Requesting Azure TTS for frame ${frameId} (Voice: ${voiceToUse}): "${text.substring(0, 50)}..."`);
    // Use process.env directly for the key in the log and config
    console.log(`Using Azure Key: ${process.env.AZURE_API_KEY ? '*** (from process.env)' : 'Not Set'}, Region: ${env.AZURE_SPEECH_REGION}`); // Updated log

    let synthesizer: SpeechSDK.SpeechSynthesizer | null = null;
    try {
        // Use process.env.AZURE_API_KEY directly here
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(process.env.AZURE_API_KEY!, env.AZURE_SPEECH_REGION!);
        speechConfig.speechSynthesisVoiceName = voiceToUse; // Use the determined voice
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        console.log(`SpeechConfig created. Voice: ${speechConfig.speechSynthesisVoiceName}, Format: ${speechConfig.speechSynthesisOutputFormat}`); // Added log

        // IMPORTANT: Pass 'undefined' for the second argument (AudioConfig)
        // to receive the audio data as an ArrayBuffer in the result.
        synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, undefined);

        console.log(`Synthesizer created for frame ${frameId}. Attempting speakTextAsync...`);

        // Use the pattern from the example, wrapped in a Promise
        const result: SpeechSDK.SpeechSynthesisResult = await new Promise((resolve, reject) => {
            synthesizer!.speakTextAsync(
                text,
                (resultCallback: SpeechSDK.SpeechSynthesisResult) => {
                    // This callback signals completion or cancellation
                    console.log('Raw resultCallback:', JSON.stringify(resultCallback)); // Added log
                    console.log(`speakTextAsync result received. Reason: ${SpeechSDK.ResultReason[resultCallback.reason]}`);
                    // Check the reason *inside* the callback before resolving/rejecting
                    if (resultCallback.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        resolve(resultCallback); // Resolve successfully
                    } else {
                        // Handle cancellation/failure
                        const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(resultCallback);
                        let errorMsg = `TTS synthesis failed/cancelled. Reason: ${SpeechSDK.CancellationReason[cancellationDetails.reason]}`;
                        if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
                            errorMsg += ` | ErrorCode: ${cancellationDetails.ErrorCode} | ErrorDetails: ${cancellationDetails.errorDetails}`;
                        }
                        console.error(errorMsg);
                        reject(new Error(errorMsg)); // Reject the promise
                    }
                },
                (errorCallback: string) => {
                    // This callback signals an immediate error
                    console.error(`speakTextAsync error callback: ${errorCallback}`);
                    reject(new Error(`Azure TTS speakTextAsync Error: ${errorCallback}`)); // Reject the promise
                }
            );
        });

        // If the promise resolved, result.reason must be SynthesizingAudioCompleted
        console.log(`Azure TTS synthesis completed successfully for frame ${frameId}. Audio data length: ${result.audioData.byteLength}`);
        const audioBuffer = Buffer.from(result.audioData);

        // Save the audio buffer to a file
        const audioDir = path.join('static', 'audio');
        const filename = `${frameId}-${randomUUID()}.mp3`;
        const outputPath = path.join(audioDir, filename);

        try {
            await fsPromises.mkdir(audioDir, { recursive: true });
            console.log(`Attempting to write audio buffer (length: ${audioBuffer.byteLength}) to ${outputPath}`); // Added log
            await fsPromises.writeFile(outputPath, audioBuffer);
            console.log(`Audio file saved to: ${outputPath}`);
            const relativeUrl = `/audio/${filename}`;

            // Clean up before returning success
            if (synthesizer) {
                synthesizer.close();
                synthesizer = null; // Prevent finally block from closing again
                console.log(`Synthesizer closed successfully for frame ${frameId}.`);
            }
            console.log(`Returning successful audio URL for frame ${frameId}: ${relativeUrl}`); // Added log
            return relativeUrl;

        } catch (writeError) {
            console.error(`Failed to write audio file for frame ${frameId} to ${outputPath}:`, writeError);
            // Fall through to return null after finally
        }
        // No need for the 'else' block here, as non-completion rejects the promise

    } catch (error) { // Catches promise rejections or other errors
        console.error(`Error during Azure TTS generation process for frame ${frameId}: ${error instanceof Error ? error.message : error}`);
        // Fall through to return null after finally
    } finally {
        if (synthesizer) {
            console.log(`Closing synthesizer in finally block for frame ${frameId}.`);
            synthesizer.close();
        }
    }

    console.log(`Returning null for frame ${frameId} due to error or non-completion.`);
    return null;
}


// --- Replicate: Generate Background Music ---
const MUSICGEN_MODEL_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"; // Specific version for musicgen
export async function generateBackgroundMusicReplicate(
    bgmPrompt: string,
    identifier: string // Can be frameId or storyboardId
): Promise<string | null> {
    if (!replicate) {
        console.error('Replicate client not configured. Cannot generate BGM.');
        return null;
    }
    if (!bgmPrompt) {
        console.warn(`No BGM prompt provided for identifier ${identifier}. Skipping BGM generation.`);
        return null;
    }

    console.log(`Requesting Replicate MusicGen for identifier ${identifier}: "${bgmPrompt.substring(0, 50)}..."`);

    try {
        const input = {
            prompt: bgmPrompt,
            model_version: "stereo-large", // As per example
            output_format: "mp3",
            normalization_strategy: "peak" // As per example
        };

        // Use replicate.run(). The output might be a URL or a stream depending on the model/version.
        const output: unknown = await replicate.run(`meta/musicgen:${MUSICGEN_MODEL_VERSION}`, { input });

        console.log(`Replicate MusicGen completed for ${identifier}. Output type: ${typeof output}`);

        let audioBuffer: Buffer;

        // Check if the output is a string URL
        if (typeof output === 'string' && output.startsWith('http')) {
            console.log(`Received URL: ${output}. Downloading BGM...`);
            const response = await fetch(output);
            if (!response.ok) {
                throw new Error(`Failed to download BGM from URL: ${response.status} ${response.statusText}`);
            }
            const audioArrayBuffer = await response.arrayBuffer();
            audioBuffer = Buffer.from(audioArrayBuffer);
            console.log(`Downloaded BGM data from URL (length: ${audioBuffer.byteLength}) for ${identifier}.`);
        }
        // Check if the output is a ReadableStream (Node.js stream)
        // Note: This requires checking if it behaves like a stream, as 'instanceof ReadableStream' might not work across different environments/versions.
        // A simple check for an async iterator might suffice.
        else if (output && typeof (output as any)[Symbol.asyncIterator] === 'function') {
            console.log(`Received a stream. Reading BGM data...`);
            const chunks: Buffer[] = [];
            // Type assertion to treat output as an async iterable
            const stream = output as AsyncIterable<Uint8Array>;
            for await (const chunk of stream) {
                chunks.push(Buffer.from(chunk)); // Ensure chunks are Buffers
            }
            audioBuffer = Buffer.concat(chunks);
            console.log(`Read BGM data from stream (length: ${audioBuffer.byteLength}) for ${identifier}.`);
        }
        // Handle unexpected output format
        else {
            console.error(`Unexpected output format from Replicate MusicGen. Expected a URL string or a ReadableStream, got: ${typeof output}`, output);
            return null;
        }

        // Save the audio buffer to a file
        const audioDir = path.join('static', 'audio', 'bgm'); // Specific subdirectory for BGM
        const filename = `bgm-${identifier}-${randomUUID()}.mp3`;
        const outputPath = path.join(audioDir, filename);

        try {
            await fsPromises.mkdir(audioDir, { recursive: true });
            console.log(`Attempting to write BGM audio buffer to ${outputPath}`);
            await fsPromises.writeFile(outputPath, audioBuffer);
            console.log(`BGM audio file saved to: ${outputPath}`);
            const relativeUrl = `/audio/bgm/${filename}`; // Relative path for web access
            console.log(`Returning successful BGM URL for ${identifier}: ${relativeUrl}`);
            return relativeUrl;

        } catch (writeError) {
            console.error(`Failed to write BGM audio file for ${identifier} to ${outputPath}:`, writeError);
            return null; // Return null on write error
        }

    } catch (err: any) {
        console.error(`Error running Replicate MusicGen model:`, err);
        return null; // Return null on API or download error
    }
}


// --- Replicate: Generate Image ---
export async function generateImageReplicate(
    prompt: string,
    frameId: string,
    aspectRatio: '1:1' | '16:9' = '1:1' // Default to 1:1 if not provided
): Promise<string | null> {
    if (!replicate) {
        console.error('Replicate client not configured.');
        // throw error(500, 'Replicate Service not configured.');
        return null; // Return null if not configured
    }

    // Use the model specified in the documentation
    const modelIdentifier = "black-forest-labs/flux-1.1-pro";
    // Note: Replicate's .run() method usually takes the full identifier including version,
    // but the provided example doesn't show a version hash. We'll use the name directly.
    // If errors occur, we might need to find the specific version hash on the Replicate website.

    // console.log(`Running Replicate model ${modelIdentifier} for frame ${frameId} (Aspect: ${aspectRatio}): "${prompt.substring(0, 50)}..."`); // Removed log

    try {
        // Ensure static/images directory exists
        const imageDir = path.join('static', 'images');
        try {
            await fsPromises.mkdir(imageDir, { recursive: true }); // Use fsPromises for mkdir
        } catch (mkdirError) {
            console.error(`Failed to create image directory ${imageDir}:`, mkdirError);
            // Decide if this is fatal or if we can continue (maybe storage is elsewhere)
            // For now, let's throw to indicate a setup issue
            throw error(500, 'Failed to create static image directory.');
        }


        // Structure the input based on the documentation and model requirements
        const input = {
            prompt: prompt,
            output_format: "jpg", // Set output format to JPEG
            aspect_ratio: aspectRatio, // Use the provided aspect ratio
            output_quality: 80,
            safety_tolerance: 2,
            prompt_upsampling: true
        };

        // Use replicate.run() which waits for completion
        const output = await replicate.run(modelIdentifier, { input, wait: {
            mode: 'block'
        } });

        // console.log('Replicate raw output:', output); // Removed log
        // console.log(`Replicate run completed for frame ${frameId}. Raw output type: ${typeof output}`); // Removed log

        // Handle potential output formats based on observations
        let replicateImageUrl: string | null = null;
        try {
            // Scenario 1: Output has a .url() method returning a URL object
            if (typeof (output as any)?.url === 'function') {
                const urlObject = (output as any).url();
                if (urlObject && typeof urlObject.href === 'string') {
                    replicateImageUrl = urlObject.href;
                } else {
                    console.error('Output had .url() but it did not return a valid URL object with .href:', urlObject);
                }
            }
            // Scenario 2: Output is directly an array of strings
            else if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
                replicateImageUrl = output[0];
            }
            // Scenario 3: Add other checks if needed based on future logs

            if (!replicateImageUrl) {
                console.error('Unexpected output format from Replicate. Could not extract URL.', output);
                return null;
            }

            console.log(`Extracted Replicate image URL: ${replicateImageUrl}`);

            // Download the image
            console.log(`Downloading image for frame ${frameId} from Replicate...`);
            const imageResponse = await fetch(replicateImageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`);
            }
            const imageArrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(imageArrayBuffer);
            console.log(`Downloaded image data (length: ${imageBuffer.byteLength}) for frame ${frameId}.`);

            // Save the image buffer to a file
            const imageDir = path.join('static', 'images'); // Ensure this matches the mkdir above
            // Determine file extension based on output_format or default to .jpg
            const extension = input.output_format === 'png' ? '.png' : '.jpg';
            const filename = `${frameId}-${randomUUID()}${extension}`;
            const outputPath = path.join(imageDir, filename);

            await fsPromises.writeFile(outputPath, imageBuffer);
            console.log(`Image file saved to: ${outputPath}`);
            const relativeUrl = `/images/${filename}`; // Relative path for web access
            console.log(`Returning local image URL for frame ${frameId}: ${relativeUrl}`);
            return relativeUrl; // Return the local URL

        } catch (processingError) {
             console.error('Error processing Replicate output or downloading/saving image:', processingError);
             console.error('Original Replicate output was:', output);
             return null;
        }

    } catch (err: any) {
        console.error(`Error running Replicate model ${modelIdentifier} or processing its output:`, err);
        // Return null or throw a specific error
        return null;
    }
}
