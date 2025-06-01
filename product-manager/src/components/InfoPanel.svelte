<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { gameSpeed, isPaused } from '../store/gameStore';
    import type { BaseNodeData, PersonnelData, ProductData, TaskData, ResourceData, MarketData, IdeaData, CourseData } from '../types';

    interface Props {
        data: BaseNodeData | null;
        onClose?: () => void;
    }

    let { data = $bindable(null), onClose = () => {} }: Props = $props();

    // Real-time update for course progress - sync with game engine
    let updateInterval: NodeJS.Timeout | null = null;
    let currentTime = $state(Date.now());

    onMount(() => {
        // Update current time every 100ms for smoother real-time progress
        updateInterval = setInterval(() => {
            if (!$isPaused) {
                currentTime = Date.now();
            }
        }, 100);
    });

    onDestroy(() => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
    });

    // Type guards
    function isPersonnelData(node: BaseNodeData): node is PersonnelData {
        return node.type === 'Personnel';
    }

    function isProductData(node: BaseNodeData): node is ProductData {
        return node.type === 'Product';
    }

    function isTaskData(node: BaseNodeData): node is TaskData {
        return node.type === 'Task';
    }

    function isResourceData(node: BaseNodeData): node is ResourceData {
        return node.type === 'Resource';
    }

    function isMarketData(node: BaseNodeData): node is MarketData {
        return node.type === 'Market';
    }

    function isIdeaData(node: BaseNodeData): node is IdeaData {
        return node.type === 'Idea';
    }

    function isCourseData(node: BaseNodeData): node is CourseData {
        return node.type === 'Course';
    }

    // Format percentage
    function formatPercentage(value: number): string {
        return `${Math.round(value * 100)}%`;
    }

    // Format currency
    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Get type color
    function getTypeColor(type: string): string {
        const colors: Record<string, string> = {
            'Personnel': 'text-blue-400',
            'Product': 'text-emerald-400',
            'Task': 'text-amber-400',
            'Resource': 'text-violet-400',
            'Market': 'text-pink-400',
            'Idea': 'text-cyan-400',
            'Course': 'text-orange-400'
        };
        return colors[type] || 'text-gray-400';
    }

    // Get type icon
    function getTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            'Personnel': '👥',
            'Product': '📦',
            'Task': '⚡',
            'Resource': '🔧',
            'Market': '🏪',
            'Idea': '💡',
            'Course': '📚'
        };
        return icons[type] || '❓';
    }

    // Format duration in seconds to readable format
    function formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${Math.floor(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
    }

    // Calculate real-time course progress for personnel (accounting for game speed and pause state)
    function getRealTimeCourseProgress(personnelData: PersonnelData) {
        if (!personnelData.courseProgress || $isPaused) {
            // If paused, use the stored remaining time
            return personnelData.courseProgress ? {
                remainingTime: personnelData.courseProgress.remainingTime,
                progressPercent: Math.min(100, Math.max(0, ((personnelData.courseProgress.duration - personnelData.courseProgress.remainingTime) / personnelData.courseProgress.duration) * 100))
            } : null;
        }

        // Calculate elapsed time with game speed multiplier
        const realElapsedTime = (currentTime - personnelData.courseProgress.startTime) / 1000;
        const gameSpeedElapsedTime = realElapsedTime * $gameSpeed;
        const remainingTime = Math.max(0, personnelData.courseProgress.duration - gameSpeedElapsedTime);
        const progressPercent = Math.min(100, Math.max(0, ((personnelData.courseProgress.duration - remainingTime) / personnelData.courseProgress.duration) * 100));

        return {
            remainingTime,
            progressPercent
        };
    }

    // Calculate real-time progress for course personnel (accounting for game speed and pause state)
    function getRealTimePersonnelProgress(courseData: CourseData, personnelId: string) {
        if (!courseData.personnelProgress[personnelId]) return null;

        const personnelProgress = courseData.personnelProgress[personnelId];

        if ($isPaused) {
            // If paused, use the stored remaining time
            return {
                remainingTime: personnelProgress.remainingTime
            };
        }

        // Calculate elapsed time with game speed multiplier
        const realElapsedTime = (currentTime - personnelProgress.startTime) / 1000;
        const gameSpeedElapsedTime = realElapsedTime * $gameSpeed;
        const remainingTime = Math.max(0, courseData.duration - gameSpeedElapsedTime);

        return {
            remainingTime
        };
    }
</script>

{#if data}
    <div class="fixed top-20 right-4 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[calc(100vh-6rem)] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <div class="flex items-center space-x-2">
                <span class="text-lg">{getTypeIcon(data.type)}</span>
                <h3 class="text-lg font-semibold text-white">{data.label}</h3>
                <span class="text-sm {getTypeColor(data.type)} font-medium">{data.type}</span>
            </div>
            <button
                class="text-gray-400 hover:text-white transition-colors"
                onclick={onClose}
            >
                ✕
            </button>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            <!-- Basic info -->
            <div>
                <h4 class="text-sm font-medium text-gray-300 mb-2">Basic Information</h4>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-400">ID:</span>
                        <span class="text-white font-mono">{data.id}</span>
                    </div>
                    {#if data.description}
                        <div>
                            <span class="text-gray-400">Description:</span>
                            <p class="text-white mt-1">{data.description}</p>
                        </div>
                    {/if}
                    {#if data.cost !== undefined}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Cost:</span>
                            <span class="text-white">{formatCurrency(data.cost)}</span>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Type-specific information -->
            {#if isPersonnelData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Personnel Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Efficiency:</span>
                            <span class="text-white">{formatPercentage(data.efficiency)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Morale:</span>
                            <span class="text-white">{formatPercentage(data.morale)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Salary:</span>
                            <span class="text-white">{formatCurrency(data.salary)}/tick</span>
                        </div>
                        <div>
                            <span class="text-gray-400">Skills:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                {#each data.skills as skill}
                                    <span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">{skill}</span>
                                {/each}
                            </div>
                        </div>
                        {#if data.assignedToTaskId}
                            <div class="flex justify-between">
                                <span class="text-gray-400">Assigned to:</span>
                                <span class="text-white font-mono">{data.assignedToTaskId}</span>
                            </div>
                        {/if}
                        {#if data.courseProgress}
                            {@const realTimeProgress = getRealTimeCourseProgress(data)}
                            {#if realTimeProgress}
                                <div class="mt-3 p-3 bg-gray-700 rounded-lg">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-gray-300 font-medium">📚 Course Progress</span>
                                        <span class="text-xs text-gray-400">Course ID: {data.courseProgress.courseId}</span>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between">
                                            <span class="text-gray-400">Remaining Time:</span>
                                            <span class="text-white font-mono">
                                                {realTimeProgress.remainingTime <= 0 ? '✅ Done!' : formatDuration(realTimeProgress.remainingTime)}
                                            </span>
                                        </div>
                                        <div class="w-full bg-gray-600 rounded-full h-2">
                                            <div
                                                class="{realTimeProgress.progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'} h-2 rounded-full transition-all duration-300"
                                                style="width: {realTimeProgress.progressPercent}%"
                                            ></div>
                                        </div>
                                        <div class="text-xs text-center {realTimeProgress.progressPercent >= 100 ? 'text-green-400' : 'text-gray-400'}">
                                            {realTimeProgress.progressPercent >= 100 ? '✅ Completed!' : `${Math.round(realTimeProgress.progressPercent)}% Complete`}
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            {/if}

            {#if isProductData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Product Details</h4>
                    <div class="space-y-2 text-sm">
                        {#if data.version}
                            <div class="flex justify-between">
                                <span class="text-gray-400">Version:</span>
                                <span class="text-white">{data.version}</span>
                            </div>
                        {/if}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Quality:</span>
                            <span class="text-white">{formatPercentage(data.quality)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Development:</span>
                            <span class="text-white">{formatPercentage(data.developmentProgress)}</span>
                        </div>
                        {#if data.marketFit !== undefined}
                            <div class="flex justify-between">
                                <span class="text-gray-400">Market Fit:</span>
                                <span class="text-white">{formatPercentage(data.marketFit)}</span>
                            </div>
                        {/if}
                        <div>
                            <span class="text-gray-400">Features:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                {#each data.features as feature}
                                    <span class="px-2 py-1 bg-emerald-600 text-white text-xs rounded">{feature}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            {#if isTaskData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Task Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Progress:</span>
                            <span class="text-white">{formatPercentage(data.progress)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Time to Complete:</span>
                            <span class="text-white">{data.timeToComplete} ticks</span>
                        </div>
                        <div>
                            <span class="text-gray-400">Required Skills:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                {#each data.requiredSkills as skill}
                                    <span class="px-2 py-1 bg-amber-600 text-white text-xs rounded">{skill}</span>
                                {/each}
                            </div>
                        </div>
                        {#if data.assignedPersonnelIds.length > 0}
                            <div>
                                <span class="text-gray-400">Assigned Personnel:</span>
                                <div class="mt-1 space-y-1">
                                    {#each data.assignedPersonnelIds as personnelId}
                                        <div class="text-white font-mono text-xs">{personnelId}</div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            {#if isResourceData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Resource Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Quantity:</span>
                            <span class="text-white">{data.quantity.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Unit Cost:</span>
                            <span class="text-white">{formatCurrency(data.unitCost)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Category:</span>
                            <span class="text-white capitalize">{data.category}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Total Value:</span>
                            <span class="text-white">{formatCurrency(data.quantity * data.unitCost)}</span>
                        </div>
                    </div>
                </div>
            {/if}

            {#if isMarketData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Market Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Demand:</span>
                            <span class="text-white">{formatPercentage(data.demand)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Competition:</span>
                            <span class="text-white">{formatPercentage(data.competition)}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">Trends:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                {#each data.trends as trend}
                                    <span class="px-2 py-1 bg-pink-600 text-white text-xs rounded">{trend}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            {#if isIdeaData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Idea Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Category:</span>
                            <span class="text-white capitalize">{data.category}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Potential:</span>
                            <span class="text-white">{formatPercentage(data.potential)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status:</span>
                            <span class="text-white">{data.discovered ? 'Discovered' : 'Hidden'}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">Requirements:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                {#each data.requirements as requirement}
                                    <span class="px-2 py-1 bg-cyan-600 text-white text-xs rounded">{requirement}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            {#if isCourseData(data)}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Course Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Duration:</span>
                            <span class="text-white">{formatDuration(data.duration)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Category:</span>
                            <span class="text-white capitalize">{data.category}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Efficiency Boost:</span>
                            <span class="text-white">+{formatPercentage(data.efficiencyBoost)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Max Participants:</span>
                            <span class="text-white">{data.maxParticipants}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Enrolled:</span>
                            <span class="text-white">{data.enrolledPersonnelIds.length}/{data.maxParticipants}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status:</span>
                            <span class="text-white">
                                {data.isCompleted ? 'Completed' : data.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div>
                            <span class="text-gray-400">Skills Improved:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                {#each data.skillsImproved as skill}
                                    <span class="px-2 py-1 bg-orange-600 text-white text-xs rounded">{skill}</span>
                                {/each}
                            </div>
                        </div>
                        {#if data.enrolledPersonnelIds.length > 0}
                            <div>
                                <span class="text-gray-400">Enrolled Personnel:</span>
                                <div class="mt-1 space-y-1">
                                    {#each data.enrolledPersonnelIds as personnelId}
                                        {@const realTimeProgress = getRealTimePersonnelProgress(data, personnelId)}
                                        <div class="flex justify-between items-center">
                                            <span class="text-white font-mono text-xs">{personnelId}</span>
                                            {#if realTimeProgress}
                                                <span class="text-xs {realTimeProgress.remainingTime <= 0 ? 'text-green-400' : 'text-gray-400'}">
                                                    {realTimeProgress.remainingTime <= 0 ? '✅ Done!' : `${formatDuration(realTimeProgress.remainingTime)} left`}
                                                </span>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Custom properties -->
            {#if data.properties && Object.keys(data.properties).length > 0}
                <div>
                    <h4 class="text-sm font-medium text-gray-300 mb-2">Additional Properties</h4>
                    <div class="space-y-1 text-sm">
                        {#each Object.entries(data.properties) as [key, value]}
                            <div class="flex justify-between">
                                <span class="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                <span class="text-white">{value}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}
