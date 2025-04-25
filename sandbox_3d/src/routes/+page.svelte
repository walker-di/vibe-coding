<script lang="ts">
	import type { PageData } from './$types';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms'; // For progressive enhancement on delete form

	let { data } = $props();
    let scenes = $state(data.scenes); // Make scenes reactive
    let errorMessage = $state(data.error); // Display load error if any
    let deleteStatus = $state('');

    async function deleteScene(sceneId: number) {
        if (!confirm(`Are you sure you want to delete scene ID ${sceneId}?`)) {
            return;
        }
        deleteStatus = `Deleting scene ${sceneId}...`;
        try {
            const response = await fetch(`/api/scenes/${sceneId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove scene from the local list
                scenes = scenes.filter(s => s.id !== sceneId);
                deleteStatus = `Scene ${sceneId} deleted.`;
            } else {
                 const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Failed to delete scene: ${errorData.message || response.statusText}`);
            }
        } catch (err: any) {
            console.error('Error deleting scene:', err);
            deleteStatus = `Error deleting scene: ${err.message}`;
        }
    }

    function loadScene(sceneId: number) {
        goto(`/scene/${sceneId}`);
    }

    function createNewScene() {
        goto('/scene/new');
    }

    // Function to format date nicely (optional)
    function formatDate(date: Date | string): string {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    }

</script>

<svelte:head>
	<title>Scene Builder - Scenes</title>
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">Saved Scenes</h1>

    {#if errorMessage}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong class="font-bold">Error:</strong>
            <span class="block sm:inline"> {errorMessage}</span>
        </div>
    {/if}

    <div class="mb-4">
        <button onclick={createNewScene} class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
            + New Scene
        </button>
    </div>

     {#if deleteStatus}
        <p class="text-sm text-gray-600 mb-2">{deleteStatus}</p>
     {/if}

	{#if scenes.length > 0}
		<ul class="space-y-3">
			{#each scenes as scene (scene.id)}
				<li class="border rounded p-3 flex justify-between items-center shadow">
					<div>
						<h2 class="text-lg font-semibold">{scene.name} (ID: {scene.id})</h2>
						<p class="text-sm text-gray-600">
                            Created: {formatDate(scene.createdAt)} | Updated: {formatDate(scene.updatedAt)}
                        </p>
					</div>
					<div>
						<button
                            onclick={() => loadScene(scene.id)}
							class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded mr-2 text-sm"
						>
							Load
						</button>
                        <button
                            onclick={() => deleteScene(scene.id)}
                            class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                            Delete
                        </button>
					</div>
				</li>
			{/each}
		</ul>
	{:else if !errorMessage}
		<p>No scenes saved yet. Click "New Scene" to get started!</p>
	{/if}

</div>
