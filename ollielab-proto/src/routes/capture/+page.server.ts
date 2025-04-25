import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db'; // Import db instance
import { eotsTable } from '$lib/server/db/schema'; // Import table schema

// Define the schema for the form data
const eotSchema = z.object({
  video_url: z.string().min(1, { message: 'Video URL is missing after upload.' }), // Validate the URL received from client
  recorded_at: z.string().min(1, { message: 'When is required' }), // Accept string from datetime-local
  recorded_by: z.string().min(1, { message: 'Who is required' }),
  activity: z.string().min(1, { message: 'What is required' }),
  location: z.string().min(1, { message: 'Where is required' }),
  landmark_data: z.string().optional(), // Add landmark data as an optional string (JSON)
});

export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Check if user is authenticated using the session populated by hooks.server.ts
    if (!locals.session || !locals.user) {
      throw redirect(302, '/login');
    }
    const userId = locals.user.id; // Get user ID from locals

    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    // --- TODO: Video Upload Handling ---
    // 1. Receive the actual video file/blob from the client-side upload.
    // 2. Upload the video to your chosen storage (e.g., S3, local disk via an API endpoint).
    // 3. Get the URL of the uploaded video.
    // 4. The video_url is now expected to be part of the `formData` submitted by the client
    //    after the upload to /api/files/upload was successful.

    console.log('Received form data on server:', data);

    // Validate the form data
    const validationResult = eotSchema.safeParse(data);

    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.flatten().fieldErrors);
      // Return validation errors to the client
      return fail(400, {
        data, // Send back the submitted data
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    // --- Database Interaction ---
    // If validation passes, save the data to the database
    try {
      const validatedData = validationResult.data;

      // Parse landmark data JSON string
      let parsedLandmarkData: any = null; // Use 'any' for now, or define a stricter type if needed
      if (validatedData.landmark_data) {
        try {
          parsedLandmarkData = JSON.parse(validatedData.landmark_data);
        } catch (jsonError) {
          console.error('Failed to parse landmark_data JSON:', jsonError);
          // Decide how to handle: fail, or save null? Let's fail for now.
          return fail(400, { data, errors: { landmark_data: ['Invalid landmark data format.'] } });
        }
      }

      // Manually parse the datetime-local string and convert to Unix timestamp (seconds)
      // IMPORTANT: new Date() parsing of datetime-local strings assumes LOCAL timezone.
      // If you need UTC consistently, adjust client-side or use a library for robust parsing.
      const recordedDate = new Date(validatedData.recorded_at);
      if (isNaN(recordedDate.getTime())) {
        // Handle invalid date format that might bypass Zod's basic string check
         console.error('Manual date parsing failed for:', validatedData.recorded_at);
         return fail(400, { data, errors: { recorded_at: ['Invalid date/time value submitted.'] } });
      }
      const recordedAtTimestamp = Math.floor(recordedDate.getTime() / 1000);

      console.log('Attempting to save EOT to database...');
      const [savedEot] = await db.insert(eotsTable).values({
        userId: userId,
        videoUrl: validatedData.video_url, // Use the validated URL from the form
        recordedAt: recordedAtTimestamp,
        recordedBy: validatedData.recorded_by,
        activity: validatedData.activity,
        location: validatedData.location,
        landmarkData: validatedData.landmark_data, // Pass the original JSON string
        // createdAt and updatedAt have default values in the schema
      }).returning(); // Use returning() to get the inserted row

      if (!savedEot) {
         throw new Error('Failed to save EOT to database.');
      }

      console.log('EOT saved successfully:', savedEot);

    } catch (error) {
      console.error('Error saving EOT to database:', error);
      return fail(500, {
        message: 'Failed to save Energy Capture. Please try again.',
        data, // Send back data even on server error for potential retry
      });
    }

    // Redirect to the EOT list page (or a success page) after successful save
    // TODO: Consider adding a success flash message
    throw redirect(303, '/eots'); // Redirect to the list of EOTs
  },
};
