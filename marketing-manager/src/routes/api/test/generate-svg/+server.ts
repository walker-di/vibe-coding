import { randomUUID } from "crypto";
import path from "path";
import { env } from "$env/dynamic/private";
import { error, json } from "@sveltejs/kit";
import fsPromises from "fs/promises";
import type { RequestHandler } from "./$types";

// Utility function for delay (used in retry logic)
async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Define the expected type for the request body
type GenerateSvgRequestBody = {
	prompt: string;
	width?: number;
	height?: number;
	temperature?: number;
};

// Define the response type from Claude
type ClaudeResponse = {
	id: string;
	type: string;
	role: string;
	content: Array<{
		type: string;
		text: string;
	}>;
	model: string;
	stop_reason: string;
	stop_sequence: string | null;
	usage: {
		input_tokens: number;
		output_tokens: number;
	};
};

// Define the SVG data structure
type SvgData = {
	svg: string;
	metadata: {
		width: number;
		height: number;
		description: string;
		elements: string[];
	};
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check if API key is available
		const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
		if (!ANTHROPIC_API_KEY) {
			throw error(500, "ANTHROPIC_API_KEY environment variable is not set.");
		}

		// Parse the request body
		const body: GenerateSvgRequestBody = await request.json();
		const { prompt, width = 800, height = 600, temperature = 0.5 } = body;

		if (!prompt) {
			throw error(400, "Missing prompt parameter");
		}

		console.log(`Received request to generate SVG with prompt: ${prompt}`);

		// Set up the headers for the Claude API request
		const headers = {
			"x-api-key": ANTHROPIC_API_KEY,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
		};

		// Set up the messages for the Claude API request
		const messages = [
			{
				role: "user",
				content: `Please generate an SVG image based on this description:
        ${prompt}

        Return your response as a valid JSON object with the following structure:
        {
            "svg": "complete SVG code here",
            "metadata": {
                "width": ${width},
                "height": ${height},
                "description": "brief description of what was created",
                "elements": ["list", "of", "main", "elements", "used"]
            }
        }

        The SVG should be complete, valid, and ready to use in a web page.
        Make sure the SVG has a proper viewBox attribute.
        The SVG should be visually appealing and use appropriate colors.
        Use a width of ${width} and height of ${height} for the SVG.`,
			},
		];

		// Set up the payload for the Claude API request
		const payload = {
			model: "claude-sonnet-4-0",
			max_tokens: 4096,
			messages,
			temperature,
		};

		// Make the request to the Claude API with retry logic
		let response;
		let retryCount = 0;
		const maxRetries = 3;
		const baseDelay = 1000; // 1 second initial delay

		while (retryCount < maxRetries) {
			try {
				response = await fetch("https://api.anthropic.com/v1/messages", {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
					// Add timeout to prevent hanging requests
					signal: AbortSignal.timeout(30000), // 30 second timeout
				});

				// If successful, break out of retry loop
				if (response.ok) break;

				// If we get a rate limit or server error, retry
				const errorText = await response.text();
				console.error(
					`Claude API error (attempt ${retryCount + 1}/${maxRetries}):`,
					errorText,
				);

				// Don't retry for client errors (except rate limiting)
				if (response.status < 500 && response.status !== 429) {
					throw error(
						response.status,
						`Claude API request failed: ${response.statusText}`,
					);
				}

				// Exponential backoff with jitter
				const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
				const delayTime = Math.floor(
					baseDelay * Math.pow(2, retryCount) * jitter,
				);
				console.log(`Retrying in ${delayTime}ms...`);
				await delay(delayTime);
			} catch (fetchError: any) {
				// Handle network errors or timeouts
				console.error(
					`Fetch error (attempt ${retryCount + 1}/${maxRetries}):`,
					fetchError,
				);

				// If it's the last retry, throw the error
				if (retryCount === maxRetries - 1) {
					throw error(
						500,
						`Failed to connect to Claude API: ${fetchError.message}`,
					);
				}

				// Exponential backoff with jitter for network errors too
				const jitter = Math.random() * 0.3 + 0.85;
				const delayTime = Math.floor(
					baseDelay * Math.pow(2, retryCount) * jitter,
				);
				console.log(`Network error, retrying in ${delayTime}ms...`);
				await delay(delayTime);
			}

			retryCount++;
		}

		// If we've exhausted all retries and still don't have a successful response
		if (!response || !response.ok) {
			throw error(500, "Failed to generate SVG after multiple attempts");
		}

		// Parse the response from the Claude API
		const responseData: ClaudeResponse = await response.json();
		const content = responseData.content[0].text;

		// Extract the JSON object from the response
		try {
			// Look for JSON in the response
			const jsonStart = content.indexOf("{");
			const jsonEnd = content.lastIndexOf("}") + 1;

			if (jsonStart === -1 || jsonEnd <= jsonStart) {
				console.error("Could not find valid JSON in Claude response");
				console.error("Response content:", content);
				throw error(500, "Could not find valid JSON in Claude's response");
			}

			const jsonStr = content.substring(jsonStart, jsonEnd);
			console.log("Extracted JSON string:", jsonStr.substring(0, 200) + "...");

			// Parse the JSON into a JavaScript object
			let svgData: SvgData;
			try {
				svgData = JSON.parse(jsonStr);
			} catch (jsonError) {
				console.error("JSON parse error:", jsonError);
				console.error("Invalid JSON string:", jsonStr);
				throw error(500, "Invalid JSON format in Claude's response");
			}

			// Validate the SVG data
			if (!svgData.svg || typeof svgData.svg !== "string") {
				console.error("Missing or invalid SVG in response data:", svgData);
				throw error(500, "Missing SVG content in Claude's response");
			}

			// Ensure the SVG directory exists
			const svgDir = path.join("static", "svg");
			try {
				await fsPromises.mkdir(svgDir, { recursive: true });
			} catch (mkdirError) {
				console.error("Error creating SVG directory:", mkdirError);
				throw error(500, "Failed to create SVG storage directory");
			}

			// Generate a unique filename
			const uniqueId = randomUUID();
			const filename = `${uniqueId}.svg`;
			const outputPath = path.join(svgDir, filename);

			// Save the SVG to a file
			try {
				await fsPromises.writeFile(outputPath, svgData.svg);
				console.log(`SVG file saved to: ${outputPath}`);
			} catch (writeError) {
				console.error("Error writing SVG file:", writeError);
				throw error(500, "Failed to save SVG file");
			}

			// Return the SVG data and URL
			return json({
				success: true,
				svgUrl: `/svg/${filename}`,
				svgData,
			});
		} catch (parseError: any) {
			// If it's already a SvelteKit error, just rethrow it
			if (parseError.status && parseError.body) {
				throw parseError;
			}

			console.error("Error processing Claude response:", parseError);
			console.error(
				"Claude response content preview:",
				content ? content.substring(0, 500) + "..." : "No content",
			);
			throw error(
				500,
				`Error processing Claude's response: ${parseError.message}`,
			);
		}
	} catch (err: any) {
		console.error("Error generating SVG:", err);

		// Get detailed error information
		let errorDetails = "";
		if (err.cause) {
			console.error("Error cause:", err.cause);
			errorDetails = `${err.cause.code || ""} - ${err.cause.syscall || ""}`;
		}

		// Ensure we return a JSON response even for thrown errors
		const status = err.status || 500;
		let message =
			err.body?.message ||
			err.message ||
			"An error occurred while generating the SVG";

		// Add more context for network errors
		if (
			err.cause?.code === "ECONNRESET" ||
			err.cause?.code === "ECONNREFUSED"
		) {
			message = `Connection to Claude API failed: ${message}. This may be due to network issues or API service disruption.`;
		} else if (err.cause?.code === "ETIMEDOUT") {
			message = `Connection to Claude API timed out: ${message}. Please try again later.`;
		}

		return json(
			{
				success: false,
				message,
				errorDetails: errorDetails || undefined,
			},
			{ status },
		);
	}
};
