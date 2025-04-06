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

---

## Development Methodology

We will follow a **Behavior-Driven Development (BDD)** approach, focusing on building UI components in isolation first using Storybook. This ensures components are well-defined, visually tested, and functional before integrating them into SvelteKit routes and connecting them to backend APIs.

### Running Storybook

To view and interact with the UI components in isolation, run Storybook:

```bash
npm run storybook
```

This will start the Storybook development server, usually on port 6006.

---

## Current Sprint Focus (Phase 1: Core Project Management)

| Task                                       | Area     | Status | Notes                                      |
| :----------------------------------------- | :------- | :----- | :----------------------------------------- |
| `ProjectList.svelte` Component & Story     | Frontend | Done   | Displays list, basic styling with Bootstrap |
| `CreateProjectModal.svelte` Component & Story | Frontend | To Do  | UI for entering new project name           |
| Setup Database Connection                  | Backend  | To Do  | Configure Drizzle ORM                      |
| API: Create Project (POST /api/projects)   | Backend  | To Do  | Endpoint logic and DB insertion            |
| API: List Projects (GET /api/projects)     | Backend  | To Do  | Endpoint logic and DB query                |
| Route: `/projects` Page                    | Frontend | To Do  | SvelteKit route setup                      |
| Integration: Fetch & Display Projects      | Frontend | To Do  | Connect page to GET API & component        |
| Integration: Create Project                | Frontend | To Do  | Connect modal/button to POST API           |
| Integration: Navigation to Project Editor  | Frontend | To Do  | Link list items to `/projects/[id]`        |

---

## Implementation Plan / TODO List (Component-First Approach)

This section outlines the planned steps to build the application based on the defined domain, UI, routes, and schema.

### Phase 1: Core Project Management & Setup

*   [ ] **Backend:** Set up database connection (using Drizzle ORM as configured).
*   [ ] **Backend:** Implement API endpoint (`/api/projects`) for creating new projects (POST).
    *   [ ] Define request/response types.
    *   [ ] Implement database logic to insert a new project record.
*   [ ] **Backend:** Implement API endpoint (`/api/projects`) for listing existing projects (GET).
    *   [ ] Define response type.
    *   [ ] Implement database logic to fetch projects.
*   [x] **Frontend (Storybook):** Create `ProjectList.svelte` component and `ProjectList.stories.svelte`. (Done)
*   [ ] **Frontend (Storybook):** Create `CreateProjectModal.svelte` component (or similar for project creation UI) and its story.
*   [ ] **Backend:** Set up database connection (using Drizzle ORM as configured).
*   [ ] **Backend:** Implement API endpoint (`/api/projects`) for creating new projects (POST).
    *   [ ] Define request/response types.
    *   [ ] Implement database logic to insert a new project record.
*   [ ] **Backend:** Implement API endpoint (`/api/projects`) for listing existing projects (GET).
    *   [ ] Define response type.
    *   [ ] Implement database logic to fetch projects.
*   [ ] **Frontend (Integration):** Create SvelteKit route (`/projects` or `/`) to display the project list.
*   [ ] **Frontend (Integration):** Fetch project data from the API in the `/projects` route's load function and pass to `ProjectList.svelte`.
*   [ ] **Frontend (Integration):** Integrate `CreateProjectModal.svelte` with the "Create New Project" button in `ProjectList.svelte` and connect to the POST `/api/projects` endpoint.
*   [ ] **Frontend (Integration):** Implement navigation from `ProjectList.svelte` items to the project editor view (e.g., `/projects/[projectId]`).

### Phase 2: Project Editor View & Media Upload

*   [ ] **Frontend (Storybook):** Create `MediaUpload.svelte` component and story.
*   [ ] **Frontend (Storybook):** Create `MediaLibrary.svelte` component and story.
*   [ ] **Frontend (Storybook):** Create basic layout component for the editor view (`ProjectEditorLayout.svelte`?) and story.
*   [ ] **Backend:** Set up file storage solution (e.g., local storage for dev, S3/Cloudflare R2 for prod - requires configuration).
*   [ ] **Backend:** Implement API endpoint (`/api/projects/[projectId]/media`) for handling file uploads (POST).
    *   [ ] Handle multipart/form-data.
    *   [ ] Save file to storage.
    *   [ ] Create media record in the database linked to the project.
*   [ ] **Backend:** Implement API endpoint (`/api/projects/[projectId]/media`) to list media for a project (GET).
*   [ ] **Frontend (Integration):** Create SvelteKit route (`/projects/[projectId]`) for the main editor view, using the layout component.
*   [ ] **Frontend (Integration):** Integrate `MediaUpload.svelte` and `MediaLibrary.svelte` into the `/projects/[projectId]` route.
*   [ ] **Frontend (Integration):** Connect `MediaUpload.svelte` to the upload API.
*   [ ] **Frontend (Integration):** Connect `MediaLibrary.svelte` to the GET media API.

### Phase 3: Timeline Editor UI (Initial)

*   [ ] **Frontend (Storybook):** Research/Select a Svelte library for timeline visualization or plan custom implementation.
*   [ ] **Frontend (Storybook):** Create `TimelineEditor.svelte` component and story with basic track/clip rendering (using dummy data).
*   [ ] **Frontend (Storybook):** Implement drag-and-drop functionality within the `TimelineEditor.svelte` story (or between mock MediaLibrary and Timeline).
*   [ ] **Frontend (Storybook):** Create basic playhead and time ruler display within the story.
*   [ ] **Backend:** Implement API endpoint (`/api/projects/[projectId]/timeline`) for saving timeline state (POST/PUT).
*   [ ] **Backend:** Implement API endpoint (`/api/projects/[projectId]/timeline`) for loading timeline state (GET).
*   [ ] **Frontend (Integration):** Integrate `TimelineEditor.svelte` into the `/projects/[projectId]` route.
*   [ ] **Frontend (Integration):** Implement saving/loading timeline state to/from the backend API endpoints.

### Phase 4: AI Features & Advanced Editing (Future)

*   [ ] Integrate AI services for transcription, object detection, etc.
*   [ ] Implement clip trimming, splitting, moving.
*   [ ] Add audio waveform generation/display.
*   [ ] Implement video preview playback.
*   [ ] User Authentication.
*   [ ] ... more features
