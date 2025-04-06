<script module lang="ts">
  // Use module context for defineMeta
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TimelineEditor from '$lib/components/TimelineEditor.svelte';
  import type { Timeline } from '$lib/types';

  // Dummy data for stories (can be reused or customized per story)
  const defaultTimelineData: Timeline = {
    projectId: 'story-project-1',
    tracks: [
      {
        id: 'story-track-v1',
        type: 'video',
        clips: [
          { id: 'story-clip-v1-1', mediaId: 'media-vid-story-1', trackId: 'story-track-v1', startTime: 1, endTime: 6, sourceStartTime: 0, sourceEndTime: 5 },
          { id: 'story-clip-v1-2', mediaId: 'media-vid-story-2', trackId: 'story-track-v1', startTime: 8, endTime: 14, sourceStartTime: 3, sourceEndTime: 9 },
        ]
      },
      {
        id: 'story-track-a1',
        type: 'audio',
        clips: [
          { id: 'story-clip-a1-1', mediaId: 'media-aud-story-1', trackId: 'story-track-a1', startTime: 0, endTime: 7, sourceStartTime: 0, sourceEndTime: 7 },
          { id: 'story-clip-a1-2', mediaId: 'media-aud-story-2', trackId: 'story-track-a1', startTime: 9, endTime: 15, sourceStartTime: 2, sourceEndTime: 8 },
        ]
      },
       {
        id: 'story-track-v2',
        type: 'video',
        clips: [
          { id: 'story-clip-v2-1', mediaId: 'media-vid-story-3', trackId: 'story-track-v2', startTime: 4, endTime: 10, sourceStartTime: 1, sourceEndTime: 7 },
        ]
      },
    ],
    totalDuration: 20 // Example duration for story
  };

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  // Use defineMeta provided by @storybook/addon-svelte-csf
  const { Story } = defineMeta({
    title: 'Components/TimelineEditor',
    component: TimelineEditor,
    tags: ['autodocs'], // Enable automatic documentation
    argTypes: {
      // Define arg types if needed later for controls
      // timeline: { control: 'object' },
    },
    parameters: {
      // Optional Storybook parameters
      layout: 'padded', // Or 'fullscreen' or 'centered'
    },
  });
</script>

<!-- Stories -->

<!-- Default story using the dummy data from the component itself -->
<!-- Note: The component uses its own dummy data if 'timeline' prop is undefined -->
<Story name="Default" />

<!-- Story with specific timeline data passed as args -->
<Story name="WithCustomData" args={{ timeline: defaultTimelineData }} />

<!-- Story representing an empty timeline -->
<Story name="Empty" args={{ timeline: { projectId: 'empty-proj', tracks: [], totalDuration: 10 } }} />
