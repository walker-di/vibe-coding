import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import Replicate from 'replicate';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import fsPromises from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { Buffer } from 'node:buffer';

// --- Google Gemini Configuration ---
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.warn('GOOGLE_API_KEY environment variable is not set. Narration text generation will fail.');
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
  console.warn('REPLICATE_API_KEY environment variable is not set. Image and music generation will fail.');
}
// Initialize Replicate client only if the key exists
const replicate = REPLICATE_API_KEY ? new Replicate({ auth: REPLICATE_API_KEY }) : null;

// --- Generate Narration Text ---
export async function generateNarrationText(description: string): Promise<string | null> {
  if (!genAI) {
    throw error(500, 'Google AI Service is not configured. Missing GOOGLE_API_KEY.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    };

    // Create a prompt for generating narration
    const prompt = `
    Based on the following scene description, create a concise, professional narration text that would be spoken over this scene in a marketing video.
    The narration should be clear, engaging, and highlight the key elements of the scene.
    Keep it under 50 words and make it sound natural when read aloud.

    Scene Description: ${description}

    Narration:
    `;

    // Generate the narration
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const narration = response.text().trim();

    return narration;
  } catch (err: any) {
    console.error('Error generating narration text:', err);
    if (err instanceof Error && err.message.includes('SAFETY')) {
      throw error(400, 'Narration generation blocked due to safety settings.');
    }
    if (err.status) {
      throw err;
    }
    throw error(500, `Failed to generate narration text: ${err.message || err}`);
  }
}

// --- Generate Narration Audio with Azure TTS ---
export async function generateNarrationAudio(
  text: string,
  clipId: number,
  voiceName?: string
): Promise<string | null> {
  // Check if Azure Speech credentials are configured
  if (!AZURE_API_KEY || !AZURE_SPEECH_REGION) {
    console.error('Azure Speech credentials not configured. Cannot generate audio.');
    return null;
  }

  // Determine the voice to use: Prioritize requested, then env var, then default
  const voiceToUse = voiceName || AZURE_SPEECH_VOICE_NAME || 'en-US-JennyNeural';

  console.log(`Requesting Azure TTS for clip ${clipId} (Voice: ${voiceToUse}): "${text.substring(0, 50)}..."`);

  let synthesizer: SpeechSDK.SpeechSynthesizer | null = null;
  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_API_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechSynthesisVoiceName = voiceToUse;
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    console.log(`SpeechConfig created. Voice: ${speechConfig.speechSynthesisVoiceName}, Format: ${speechConfig.speechSynthesisOutputFormat}`);

    // Pass 'undefined' for the second argument to receive the audio data as an ArrayBuffer
    synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, undefined);

    console.log(`Synthesizer created for clip ${clipId}. Attempting speakTextAsync...`);

    // Use the pattern from the example, wrapped in a Promise
    const result: SpeechSDK.SpeechSynthesisResult = await new Promise((resolve, reject) => {
      synthesizer!.speakTextAsync(
        text,
        (resultCallback: SpeechSDK.SpeechSynthesisResult) => {
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
    console.log(`Azure TTS synthesis completed successfully for clip ${clipId}. Audio data length: ${result.audioData.byteLength}`);
    const audioBuffer = Buffer.from(result.audioData);

    // Save the audio buffer to a file
    const audioDir = path.join('static', 'narration');
    // Create a more unique filename with clipId, timestamp, and a random string
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10); // Add random suffix
    const filename = `clip-${clipId}-${timestamp}-${randomSuffix}.mp3`;
    const outputPath = path.join(audioDir, filename);

    try {
      await fsPromises.mkdir(audioDir, { recursive: true });
      console.log(`Attempting to write audio buffer (length: ${audioBuffer.byteLength}) to ${outputPath}`);
      await fsPromises.writeFile(outputPath, audioBuffer);
      console.log(`Audio file saved to: ${outputPath}`);
      const relativeUrl = `/narration/${filename}`;

      // Clean up before returning success
      if (synthesizer) {
        synthesizer.close();
        synthesizer = null; // Prevent finally block from closing again
        console.log(`Synthesizer closed successfully for clip ${clipId}.`);
      }
      console.log(`Returning successful audio URL for clip ${clipId}: ${relativeUrl}`);
      return relativeUrl;

    } catch (writeError) {
      console.error(`Failed to write audio file for clip ${clipId} to ${outputPath}:`, writeError);
      // Fall through to return null after finally
    }

  } catch (error) {
    console.error(`Error during Azure TTS generation process for clip ${clipId}: ${error instanceof Error ? error.message : error}`);
    // Fall through to return null after finally
  } finally {
    if (synthesizer) {
      console.log(`Closing synthesizer in finally block for clip ${clipId}.`);
      synthesizer.close();
    }
  }

  console.log(`Returning null for clip ${clipId} due to error or non-completion.`);
  return null;
}

// --- Generate Narration (Text + Audio) ---
export async function generateNarration(
  description: string,
  clipId: number,
  voiceName?: string
): Promise<{ narrationText: string | null; narrationAudioUrl: string | null }> {
  try {
    // First, generate the narration text
    const narrationText = await generateNarrationText(description);
    if (!narrationText) {
      return { narrationText: null, narrationAudioUrl: null };
    }

    // Then, generate the narration audio
    const narrationAudioUrl = await generateNarrationAudio(narrationText, clipId, voiceName);

    return {
      narrationText,
      narrationAudioUrl
    };
  } catch (err) {
    console.error('Error in generateNarration:', err);
    return { narrationText: null, narrationAudioUrl: null };
  }
}

// --- Generate Image ---
// --- Generate Background Music ---
const MUSICGEN_MODEL_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"; // Specific version for musicgen
export async function generateBackgroundMusic(
  prompt: string,
  identifier: string | number, // Can be clipId, bgmId, or any other identifier
  durationSeconds: number = 30 // Default duration: 30 seconds
): Promise<string | null> {
  if (!replicate) {
    console.error('Replicate client not configured. Cannot generate BGM. Check REPLICATE_API_KEY environment variable.');
    return null;
  }
  if (!prompt) {
    console.warn(`No BGM prompt provided for identifier ${identifier}. Skipping BGM generation.`);
    return null;
  }

  // Ensure the prompt is not too long
  const maxPromptLength = 500;
  const trimmedPrompt = prompt.length > maxPromptLength ?
    prompt.substring(0, maxPromptLength) + '...' :
    prompt;

  console.log(`Requesting Replicate MusicGen for identifier ${identifier}: "${trimmedPrompt.substring(0, 50)}..."`);

  try {
    const input = {
      prompt: trimmedPrompt,
      model_version: "stereo-large", // As per example
      output_format: "mp3",
      normalization_strategy: "peak", // As per example
      duration: durationSeconds // Use the provided duration
    };

    // Use replicate.run(). The output might be a URL or a stream depending on the model/version.
    console.log(`Calling Replicate MusicGen with input:`, JSON.stringify(input, null, 2));

    const output: unknown = await replicate.run(`meta/musicgen:${MUSICGEN_MODEL_VERSION}`, {
      input,
      wait: {
        mode: 'block'
      }
    });

    console.log(`Replicate MusicGen completed for ${identifier}. Output type: ${typeof output}`);
    // Log more details about the output to help with debugging
    if (output === null) {
      console.log(`Output is null`);
    } else if (typeof output === 'object') {
      console.log(`Output object properties:`, Object.getOwnPropertyNames(output));
      if ((output as any).constructor) {
        console.log(`Output constructor name:`, (output as any).constructor.name);
      }
    }

    let audioBuffer: Buffer;

    // Handle URL output (most common case)
    if (typeof output === 'string') {
      console.log(`Downloading BGM from URL: ${output}`);
      const response = await fetch(output);
      if (!response.ok) {
        throw new Error(`Failed to download BGM from Replicate: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
      console.log(`Downloaded BGM data (length: ${audioBuffer.byteLength}) for ${identifier}.`);
    }
    // Handle array of URLs (sometimes happens)
    else if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
      const audioUrl = output[0];
      console.log(`Downloading BGM from first URL in array: ${audioUrl}`);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download BGM from Replicate: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
      console.log(`Downloaded BGM data from array (length: ${audioBuffer.byteLength}) for ${identifier}.`);
    }
    // Handle ReadableStream output (happens with newer Replicate versions)
    else if (output && typeof output === 'object') {
      // Check if it's a ReadableStream
      if ((output as any).locked !== undefined || (output as any).getReader) {
        console.log(`Handling ReadableStream output for ${identifier}`);
        try {
          // Convert ReadableStream to Buffer
          const reader = (output as ReadableStream<Uint8Array>).getReader();
          const chunks: Uint8Array[] = [];

          // Read all chunks from the stream
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }

          // Concatenate chunks into a single buffer
          audioBuffer = Buffer.concat(chunks);
          console.log(`Read BGM data from stream (length: ${audioBuffer.byteLength}) for ${identifier}.`);
        } catch (streamErr) {
          console.error(`Error reading from ReadableStream:`, streamErr);
          return null;
        }
      }
      // Check if it has a 'pipe' method (Node.js stream)
      else if (typeof (output as any).pipe === 'function') {
        console.log(`Handling Node.js Stream output for ${identifier}`);
        try {
          // Convert Node.js Stream to Buffer
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            (output as any).on('data', (chunk: Buffer) => chunks.push(chunk));
            (output as any).on('end', () => resolve());
            (output as any).on('error', (err: Error) => reject(err));
          });

          // Concatenate chunks into a single buffer
          audioBuffer = Buffer.concat(chunks);
          console.log(`Read BGM data from Node.js stream (length: ${audioBuffer.byteLength}) for ${identifier}.`);
        } catch (streamErr) {
          console.error(`Error reading from Node.js Stream:`, streamErr);
          return null;
        }
      }
      // If we can't identify the stream type, log detailed info and return null
      else {
        console.error(`Unknown object type from Replicate MusicGen:`, output);
        console.error(`Object keys:`, Object.keys(output));
        console.error(`Object prototype:`, Object.getPrototypeOf(output));
        return null;
      }
    }
    // Handle unexpected output format
    else {
      console.error(`Unexpected output format from Replicate MusicGen. Expected a URL string, array, or ReadableStream, got: ${typeof output}`, output);
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

// --- Generate Music Prompt ---
export async function generateMusicPrompt(description: string): Promise<string | null> {
  if (!genAI) {
    console.error('Google AI Service is not configured. Missing GOOGLE_API_KEY.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

    const generationConfig = {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    };

    // Create a prompt for generating music description
    const prompt = `
    Based on the following description, create a detailed prompt for an AI music generation model (MusicGen).
    The prompt should describe the style, mood, instruments, tempo, and any other relevant musical characteristics.
    Make it specific and detailed enough to generate appropriate background music for a marketing video.

    Description: ${description}

    Music Generation Prompt:
    `;

    // Generate the music prompt
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const musicPrompt = response.text().trim();

    return musicPrompt;
  } catch (err: any) {
    console.error('Error generating music prompt:', err);
    if (err instanceof Error && err.message.includes('SAFETY')) {
      throw error(400, 'Music prompt generation blocked due to safety settings.');
    }
    if (err.status) {
      throw err;
    }
    throw error(500, `Failed to generate music prompt: ${err.message || err}`);
  }
}

export async function generateImage(
  prompt: string,
  clipId: number,
  aspectRatio: '1:1' | '16:9' | '9:16' = '1:1' // Added '9:16' to the allowed types
): Promise<string | null> {
  if (!replicate) {
    console.error('Replicate client not configured.');
    return null;
  }

  // Use the model specified in the documentation
  const modelIdentifier = "black-forest-labs/flux-1.1-pro";

  try {
    // Ensure the correct target directory exists
    const imageDir = path.join('static', 'uploads', 'gen'); // Corrected directory
    try {
      await fsPromises.mkdir(imageDir, { recursive: true });
    } catch (mkdirError) {
      console.error(`Failed to create image directory ${imageDir}:`, mkdirError);
      throw error(500, 'Failed to create static image directory.');
    }

    // Structure the input based on the documentation and model requirements
    const input = {
      prompt: prompt,
      output_format: "jpg",
      aspect_ratio: aspectRatio,
      output_quality: 80,
      safety_tolerance: 2,
      prompt_upsampling: true
    };

    // Use replicate.run() which waits for completion
    const output = await replicate.run(modelIdentifier, {
      input,
      wait: {
        mode: 'block'
      }
    });

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

      if (!replicateImageUrl) {
        console.error('Unexpected output format from Replicate. Could not extract URL.', output);
        return null;
      }

      console.log(`Extracted Replicate image URL: ${replicateImageUrl}`);

      // Download the image
      console.log(`Downloading image for clip ${clipId} from Replicate...`);
      const imageResponse = await fetch(replicateImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(imageArrayBuffer);
      console.log(`Downloaded image data (length: ${imageBuffer.byteLength}) for clip ${clipId}.`);

      // Save the image buffer to a file with a unique name
      const extension = input.output_format === 'png' ? '.png' : '.jpg';
      const uniqueFilename = `${randomUUID()}${extension}`; // Generate unique filename
      const outputPath = path.join(imageDir, uniqueFilename);

      await fsPromises.writeFile(outputPath, imageBuffer);
      console.log(`Image file saved to: ${outputPath}`);
      // Ensure the URL starts with a slash
      const relativeUrl = `/uploads/gen/${uniqueFilename}`; // Corrected relative URL
      console.log(`Returning local image URL for clip ${clipId}: ${relativeUrl}`);
      return relativeUrl;

    } catch (processingError) {
      console.error('Error processing Replicate output or downloading/saving image:', processingError);
      console.error('Original Replicate output was:', output);
      return null;
    }

  } catch (err: any) {
    console.error(`Error running Replicate model ${modelIdentifier} or processing its output:`, err);
    return null;
  }
}
