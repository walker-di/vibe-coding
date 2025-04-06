# AI Video Editor Project Plan

This document outlines the initial plan for the AI Video Editor application.

## 1. Domain

The core concepts involved in this application are:

*   **Project:** A container for a video editing session. Each project has a unique identifier and holds associated media and timeline information.
*   **Media:** Video or audio files uploaded by the user. Each media item has properties like source URL, duration, type (video/audio), and potentially metadata extracted by AI (e.g., transcripts, object detection).
*   **Timeline:** Represents the sequence and arrangement of media clips over time. It consists of tracks.
*   **Track:** A horizontal layer in the timeline used to organize media clips. There can be multiple video and audio tracks.
*   **Clip:** A segment of a media file placed on a track in the timeline. It has a start time, end time, and refers back to the original media source.
*   **User:** (Implicit) The person interacting with the editor. (We might need user accounts later).

## 2. UI Components

The user interface will be built around these key components, utilizing **Bootstrap 5** for styling and layout.

*   **Project List/Dashboard:** Displays existing projects and allows creating new ones.
*   **Project View:** The main editor interface for a single project.
    *   **Media Library/Bin:** Area to display uploaded media files for the current project. Allows users to drag media onto the timeline.
    *   **Timeline Editor:** The central part of the editor, visually representing the arrangement of clips on tracks over time.
        *   **Tracks:** Multiple horizontal lanes for video and audio clips.
        *   **Clips:** Visual representations of media segments on tracks, showing thumbnails for video and waveforms for audio.
        *   **Playhead:** A vertical line indicating the current playback position.
        *   **Time Ruler:** Displays time markers (e.g., seconds, minutes).
        *   **Controls:** Play, pause, rewind, fast-forward, zoom controls for the timeline.
        *   **Editing Tools:** (Future) Tools for splitting, trimming, moving clips (like the scissors icon in the image).
    *   **Preview Window:** (Implicit, but necessary) Displays the video output at the current playhead position.
    *   **Upload Area:** A dedicated section or modal for uploading video/audio files.

## 3. Routes

The application will need the following basic routes:

*   `/` or `/projects`: Displays the list of projects (Project List/Dashboard).
*   `/projects/new`: (Could be a modal/action on `/projects`) Handles the creation of a new project.
*   `/projects/:projectId`: Displays the main editor interface for a specific project (Project View).
*   `/api/projects`: API endpoint for CRUD operations on projects.
*   `/api/projects/:projectId/media`: API endpoint for uploading and managing media files within a project.
*   `/api/projects/:projectId/timeline`: API endpoint for saving/loading the timeline state for a project.

## 4. Schema (Conceptual Data Structures)

We'll need data structures to represent our domain concepts, likely stored in a database.

**Project Schema:**

```json
{
  "id": "uuid", // Unique project identifier
  "name": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "userId": "uuid" // Optional: If we add user accounts
}
```

**Media Schema:**

```json
{
  "id": "uuid", // Unique media identifier
  "projectId": "uuid", // Foreign key to Project
  "name": "string", // Original filename or user-defined name
  "type": "enum('video', 'audio')",
  "sourceUrl": "string", // URL to the stored media file (e.g., S3)
  "duration": "number", // Duration in seconds
  "uploadedAt": "timestamp",
  "metadata": { // Optional: For AI-extracted data
    "transcript": "string",
    "objects": ["string"],
    "scenes": ["object"]
  }
}
```

**Timeline Schema:** (This could be a single JSON blob stored with the Project or have its own tables)

```json
{
  "projectId": "uuid", // Foreign key to Project
  "tracks": [
    {
      "id": "uuid", // Unique track identifier
      "type": "enum('video', 'audio')",
      "clips": [
        {
          "id": "uuid", // Unique clip identifier
          "mediaId": "uuid", // Foreign key to Media
          "trackId": "uuid", // Foreign key to Track
          "startTime": "number", // Start time on the timeline (seconds)
          "endTime": "number", // End time on the timeline (seconds)
          "sourceStartTime": "number", // Start time within the original media (seconds)
          "sourceEndTime": "number" // End time within the original media (seconds)
        }
      ]
    }
  ],
  "totalDuration": "number" // Calculated total duration of the timeline
}
