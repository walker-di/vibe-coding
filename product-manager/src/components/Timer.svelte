<script lang="ts">
    import { currentTick, currentWeekStartTime, isPaused, pauseGame, resumeGame, gameSpeed } from '../store/gameStore';
    import { gameEngine } from '../engine/gameEngine';
    import { onMount } from 'svelte';

    let currentTime = Date.now();
    let progressPercent = 0;
    let lastProgressPercent = 0;

    // Calculate progress within the current week (120 seconds = 1 week)
    $: {
        if ($currentWeekStartTime) {
            const elapsedTime = currentTime - $currentWeekStartTime;
            const weekDuration = (120 * 1000) / $gameSpeed; // 120 seconds adjusted for game speed
            progressPercent = Math.min(100, (elapsedTime / weekDuration) * 100);

            // Trigger tick immediately when progress reaches 100%
            if (progressPercent >= 100 && lastProgressPercent < 100 && !$isPaused) {
                gameEngine.tick();
            }
            lastProgressPercent = progressPercent;
        }
    }

    $: weekNumber = $currentTick + 1; // Current week number

    function togglePause() {
        if ($isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }

    // Update current time every 50ms for smooth progress bar and responsive tick triggering
    onMount(() => {
        const interval = setInterval(() => {
            if (!$isPaused) {
                currentTime = Date.now();
            }
        }, 50);

        return () => clearInterval(interval);
    });
</script>

<div class="flex items-center space-x-3 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
    <!-- Week display -->
    <div class="flex items-center space-x-2">
        <span class="text-white font-mono text-sm">月目{weekNumber.toString().padStart(3, '0')}</span>

        <!-- Progress bar -->
        <div class="w-24 h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
            <div
                class="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100 ease-linear"
                style="width: {Math.min(100, progressPercent)}%"
            ></div>
        </div>

        <!-- Progress percentage -->
        <span class="text-gray-300 text-xs font-mono">{Math.floor(Math.min(100, progressPercent))}%</span>
    </div>

    <!-- Play/Pause button -->
    <button
        class="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        onclick={togglePause}
        title={$isPaused ? 'Resume game' : 'Pause game'}
    >
        {#if $isPaused}
            <!-- Play icon -->
            <svg class="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 5v10l8-5-8-5z"/>
            </svg>
        {:else}
            <!-- Pause icon -->
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z"/>
            </svg>
        {/if}
    </button>
</div>
