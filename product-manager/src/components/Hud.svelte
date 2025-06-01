<script lang="ts">
    import {
        companyFinances,
        currentTick,
        gameSpeed,
        isPaused,
        totalPersonnel,
        totalProducts,
        activeTasks,
        pauseGame,
        resumeGame,
        setGameSpeed
    } from '../store/gameStore';
    import Shop from './Shop.svelte';
    import Timer from './Timer.svelte';

    // Format currency
    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }



    // Game control handlers
    function togglePause() {
        if ($isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }

    function changeGameSpeed(newSpeed: number) {
        setGameSpeed(newSpeed);
    }

    // Speed options
    const speedOptions = [0.5, 1, 2, 3, 5];
</script>

<header class="bg-gray-800 border-b border-gray-700 px-4 py-3">
    <div class="flex items-center justify-between">
        <!-- Left side - Company info -->
        <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-2">
                <h1 class="text-xl font-bold text-white">ProductGraphTycoon</h1>
                <span class="text-sm text-gray-400">Tick {$currentTick || 0}</span>
            </div>

            <!-- Timer component -->
            <Timer />

            <!-- Financial info -->
            <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-1">
                    <span class="text-green-400 font-semibold">💰</span>
                    <span class="text-white font-medium">{formatCurrency($companyFinances?.capital || 50000)}</span>
                </div>

                <div class="flex items-center space-x-1 text-sm">
                    <span class="text-green-400">+{formatCurrency($companyFinances?.revenuePerTick || 0)}/tick</span>
                    <span class="text-red-400">-{formatCurrency($companyFinances?.expensesPerTick || 0)}/tick</span>
                </div>
            </div>
        </div>

        <!-- Center - Game stats -->
        <div class="flex items-center space-x-6 text-sm">
            <div class="flex items-center space-x-1">
                <span class="text-blue-400">👥</span>
                <span class="text-white">{$totalPersonnel || 0}</span>
                <span class="text-gray-400">Personnel</span>
            </div>

            <div class="flex items-center space-x-1">
                <span class="text-green-400">📦</span>
                <span class="text-white">{$totalProducts || 0}</span>
                <span class="text-gray-400">Products</span>
            </div>

            <div class="flex items-center space-x-1">
                <span class="text-amber-400">⚡</span>
                <span class="text-white">{$activeTasks?.length || 0}</span>
                <span class="text-gray-400">Active Tasks</span>
            </div>
        </div>

        <!-- Right side - Game controls -->
        <div class="flex items-center space-x-4">
            <!-- Game speed control -->
            <div class="flex items-center space-x-2">
                <span class="text-gray-400 text-sm">Speed:</span>
                <div class="flex items-center space-x-1">
                    {#each speedOptions as speed}
                        <button
                            class="px-2 py-1 text-xs rounded transition-colors {$gameSpeed === speed
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => changeGameSpeed(speed)}
                        >
                            {speed}x
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Pause/Resume button -->
            <button
                class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors {$isPaused
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'}"
                onclick={togglePause}
            >
                <span class="text-sm">
                    {$isPaused ? '▶️' : '⏸️'}
                </span>
                <span class="text-sm font-medium">
                    {$isPaused ? 'Resume' : 'Pause'}
                </span>
            </button>
        </div>
    </div>

    <!-- Secondary info bar -->
    <div class="mt-2 pt-2 border-t border-gray-700">
        <div class="flex items-center justify-between text-xs text-gray-400">
            <div class="flex items-center space-x-4">
                <span>Total Revenue: {formatCurrency($companyFinances?.totalRevenue || 0)}</span>
                <span>Total Expenses: {formatCurrency($companyFinances?.totalExpenses || 0)}</span>
                <span>Net Profit: {formatCurrency(($companyFinances?.totalRevenue || 0) - ($companyFinances?.totalExpenses || 0))}</span>
            </div>

            <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full {$isPaused ? 'bg-red-500' : 'bg-green-500'}"></span>
                <span>{$isPaused ? 'Paused' : 'Running'}</span>
            </div>
        </div>
    </div>

    <!-- Shop section -->
    <div class="mt-3 pt-3 border-t border-gray-700">
        <Shop />
    </div>
</header>
