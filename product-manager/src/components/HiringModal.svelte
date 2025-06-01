<script lang="ts">
    import { onMount } from 'svelte';
    import { personnelTemplates, getPersonnelByCategory, calculateHiringCost, type PersonnelTemplate } from '../data/personnelTemplates';
    import { hirePersonnel } from '../store/gameStore';
    import { companyFinances } from '../store/gameStore';
    import { showSuccessNotification, showErrorNotification } from '../store/uiStore';

    interface Props {
        visible: boolean;
        onClose?: () => void;
    }

    let { visible = $bindable(false), onClose = () => {} }: Props = $props();

    let selectedCategory: PersonnelTemplate['category'] | 'all' = 'all';
    let selectedTemplate: PersonnelTemplate | null = null;
    let modalElement: HTMLDivElement;

    // Filter templates based on selected category
    const filteredTemplates = $derived(() => {
        if (selectedCategory === 'all') {
            return personnelTemplates;
        }
        return getPersonnelByCategory(selectedCategory);
    });

    // Close modal when clicking outside
    onMount(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalElement && !modalElement.contains(event.target as Node)) {
                closeModal();
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                closeModal();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    });

    function closeModal() {
        visible = false;
        selectedTemplate = null;
        onClose();
    }

    function selectTemplate(template: PersonnelTemplate) {
        selectedTemplate = template;
    }

    function handleHire() {
        if (!selectedTemplate) return;

        const hiringCost = calculateHiringCost(selectedTemplate);
        
        // Check if company has enough capital
        if ($companyFinances.capital < hiringCost) {
            showErrorNotification(`Not enough capital to hire. Need $${hiringCost.toLocaleString()}, have $${$companyFinances.capital.toLocaleString()}`);
            return;
        }

        const result = hirePersonnel(selectedTemplate);
        
        if (result.success) {
            showSuccessNotification(result.message);
            closeModal();
        } else {
            showErrorNotification(result.message);
        }
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

    // Format percentage
    function formatPercentage(value: number): string {
        return `${Math.round(value * 100)}%`;
    }

    // Get category color
    function getCategoryColor(category: PersonnelTemplate['category']): string {
        const colors = {
            'developer': 'bg-blue-600',
            'designer': 'bg-purple-600',
            'manager': 'bg-green-600',
            'specialist': 'bg-orange-600'
        };
        return colors[category] || 'bg-gray-600';
    }
</script>

{#if visible}
    <!-- Modal backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <!-- Modal content -->
        <div bind:this={modalElement} class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 class="text-xl font-semibold text-white">Hire Personnel</h2>
                <button
                    class="text-gray-400 hover:text-white transition-colors"
                    onclick={closeModal}
                >
                    ✕
                </button>
            </div>

            <!-- Category filter -->
            <div class="p-6 border-b border-gray-700">
                <div class="flex items-center space-x-2">
                    <span class="text-gray-300 text-sm">Category:</span>
                    <div class="flex space-x-2">
                        <button
                            class="px-3 py-1 text-xs rounded transition-colors {selectedCategory === 'all' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => selectedCategory = 'all'}
                        >
                            All
                        </button>
                        <button
                            class="px-3 py-1 text-xs rounded transition-colors {selectedCategory === 'developer' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => selectedCategory = 'developer'}
                        >
                            Developers
                        </button>
                        <button
                            class="px-3 py-1 text-xs rounded transition-colors {selectedCategory === 'designer' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => selectedCategory = 'designer'}
                        >
                            Designers
                        </button>
                        <button
                            class="px-3 py-1 text-xs rounded transition-colors {selectedCategory === 'manager' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => selectedCategory = 'manager'}
                        >
                            Managers
                        </button>
                        <button
                            class="px-3 py-1 text-xs rounded transition-colors {selectedCategory === 'specialist' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => selectedCategory = 'specialist'}
                        >
                            Specialists
                        </button>
                    </div>
                </div>
            </div>

            <!-- Personnel list -->
            <div class="flex h-96">
                <!-- Left side - Personnel list -->
                <div class="w-1/2 p-4 overflow-y-auto border-r border-gray-700">
                    <div class="space-y-2">
                        {#each filteredTemplates as template}
                            <button
                                class="w-full text-left p-3 rounded-lg transition-colors {selectedTemplate === template 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}"
                                onclick={() => selectTemplate(template)}
                            >
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-medium">{template.label}</div>
                                        <div class="text-sm opacity-75">{formatCurrency(template.salary)}/tick</div>
                                    </div>
                                    <span class="px-2 py-1 text-xs rounded {getCategoryColor(template.category)} text-white">
                                        {template.category}
                                    </span>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Right side - Personnel details -->
                <div class="w-1/2 p-4">
                    {#if selectedTemplate}
                        <div class="space-y-4">
                            <div>
                                <h3 class="text-lg font-semibold text-white">{selectedTemplate.label}</h3>
                                <p class="text-gray-300 text-sm mt-1">{selectedTemplate.description}</p>
                            </div>

                            <div class="space-y-3">
                                <div>
                                    <span class="text-gray-400 text-sm">Skills:</span>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        {#each selectedTemplate.skills as skill}
                                            <span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">{skill}</span>
                                        {/each}
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span class="text-gray-400">Efficiency:</span>
                                        <span class="text-white ml-2">{formatPercentage(selectedTemplate.efficiency)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-400">Morale:</span>
                                        <span class="text-white ml-2">{formatPercentage(selectedTemplate.morale)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-400">Salary:</span>
                                        <span class="text-white ml-2">{formatCurrency(selectedTemplate.salary)}/tick</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-400">Hiring Cost:</span>
                                        <span class="text-white ml-2">{formatCurrency(calculateHiringCost(selectedTemplate))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div class="flex items-center justify-center h-full text-gray-400">
                            <p>Select a personnel template to view details</p>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between p-6 border-t border-gray-700">
                <div class="text-sm text-gray-400">
                    Company Capital: {formatCurrency($companyFinances.capital)}
                </div>
                <div class="flex space-x-3">
                    <button
                        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        onclick={closeModal}
                    >
                        Cancel
                    </button>
                    <button
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onclick={handleHire}
                        disabled={!selectedTemplate || $companyFinances.capital < (selectedTemplate ? calculateHiringCost(selectedTemplate) : 0)}
                    >
                        Hire {selectedTemplate ? formatCurrency(calculateHiringCost(selectedTemplate)) : ''}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
