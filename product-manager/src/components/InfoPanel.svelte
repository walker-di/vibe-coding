<script lang="ts">
    import type { BaseNodeData, PersonnelData, ProductData, TaskData, ResourceData, MarketData, IdeaData } from '../types';

    interface Props {
        data: BaseNodeData | null;
        onClose?: () => void;
    }

    let { data = $bindable(null), onClose = () => {} }: Props = $props();

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
            'Idea': 'text-cyan-400'
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
            'Idea': '💡'
        };
        return icons[type] || '❓';
    }
</script>

{#if data}
    <div class="fixed top-20 right-4 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
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
        <div class="p-4 space-y-4 max-h-96 overflow-y-auto">
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
