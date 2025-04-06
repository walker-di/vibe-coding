<script module lang="ts">
  // Use module context for defineMeta
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ProjectList from '$lib/components/ProjectList.svelte';

  // Define sample project data (can stay here or move inside defineMeta if preferred)
  const sampleProjects = [
    { id: 'proj-1', name: 'Summer Vacation Highlights', createdAt: new Date(2024, 5, 15) },
    { id: 'proj-2', name: 'Product Demo Reel', createdAt: new Date(2024, 7, 22) },
    { id: 'proj-3', name: 'Birthday Party Montage', createdAt: new Date(2024, 8, 1) },
  ];

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  // Use defineMeta provided by @storybook/addon-svelte-csf
  // Only destructure Story, meta is implicitly handled by defineMeta
  const { Story } = defineMeta({
    title: 'Components/ProjectList',
    component: ProjectList,
    tags: ['autodocs'], // Enable automatic documentation
    argTypes: {
      // You can define arg types here if needed, but for simple props like 'projects',
      // Storybook often infers them correctly.
    },
    // Default args can be defined here if needed, but we'll set them per story
  });
</script>

<!-- Define stories using the Story component -->

<!-- Default story with multiple projects -->
<Story name="Default" args={{ projects: sampleProjects }} />

<!-- Story with no projects -->
<Story name="Empty" args={{ projects: [] }} />

<!-- Story with a single project -->
<Story name="SingleProject" args={{ projects: [sampleProjects[0]] }} />
