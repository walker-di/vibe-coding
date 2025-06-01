<script lang="ts">
    import { marketingMetrics, brandAwareness, totalLeads, totalCustomers, totalContent, activeCampaigns, populationData, getPersonnel, createContent } from '../store/gameStore';
    import { showSuccessNotification, showErrorNotification } from '../store/uiStore';
    import { contentTemplates, getAvailableContentForPersonnel } from '../data/contentTemplates';
    import type { PersonnelData, PopulationData } from '../types';

    let selectedPersonnel = '';
    let selectedContentTemplate = '';
    let selectedPlatform = 'instagram';
    let selectedSegments = ['young-professionals'];

    $: personnel = getPersonnel() as PersonnelData[];
    $: marketingPersonnel = personnel.filter(p => p.skills.includes('marketing') || p.skills.includes('social media'));
    $: availableContent = selectedPersonnel ? 
        getAvailableContentForPersonnel(personnel.find(p => p.id === selectedPersonnel)?.skills || []) : 
        contentTemplates;

    function handleCreateContent() {
        if (!selectedPersonnel || !selectedContentTemplate) {
            showErrorNotification('Please select personnel and content type');
            return;
        }

        const template = contentTemplates.find(t => t.id === selectedContentTemplate);
        if (!template) {
            showErrorNotification('Invalid content template');
            return;
        }

        const contentData = {
            label: template.label,
            description: template.description,
            contentType: template.contentType,
            platform: selectedPlatform,
            targetSegments: selectedSegments,
            personnelId: selectedPersonnel,
            cost: template.baseCost
        };

        const result = createContent(contentData);
        if (result.success) {
            showSuccessNotification(result.message);
            // Reset form
            selectedContentTemplate = '';
        } else {
            showErrorNotification(result.message);
        }
    }

    function formatPercentage(value: number): string {
        return `${(value * 100).toFixed(1)}%`;
    }

    function formatNumber(value: number): string {
        return value.toLocaleString();
    }
</script>

<div class="marketing-panel bg-gray-800 text-white p-4 rounded-lg">
    <h2 class="text-xl font-bold mb-4">Marketing Dashboard</h2>
    
    <!-- Marketing Metrics Overview -->
    <div class="metrics-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="metric-card bg-gray-700 p-3 rounded">
            <div class="text-sm text-gray-300">Brand Awareness</div>
            <div class="text-lg font-bold text-blue-400">{formatPercentage($brandAwareness)}</div>
        </div>
        
        <div class="metric-card bg-gray-700 p-3 rounded">
            <div class="text-sm text-gray-300">Total Leads</div>
            <div class="text-lg font-bold text-green-400">{formatNumber($totalLeads)}</div>
        </div>
        
        <div class="metric-card bg-gray-700 p-3 rounded">
            <div class="text-sm text-gray-300">Customers</div>
            <div class="text-lg font-bold text-purple-400">{formatNumber($totalCustomers)}</div>
        </div>
        
        <div class="metric-card bg-gray-700 p-3 rounded">
            <div class="text-sm text-gray-300">Active Campaigns</div>
            <div class="text-lg font-bold text-orange-400">{formatNumber($activeCampaigns)}</div>
        </div>
    </div>

    <!-- Detailed Marketing Metrics -->
    <div class="detailed-metrics mb-6">
        <h3 class="text-lg font-semibold mb-3">Detailed Metrics</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-700 p-3 rounded">
                <div class="text-sm text-gray-300">Content Created</div>
                <div class="text-lg font-bold">{formatNumber($totalContent)}</div>
            </div>
            
            <div class="bg-gray-700 p-3 rounded">
                <div class="text-sm text-gray-300">Conversion Rate</div>
                <div class="text-lg font-bold">{formatPercentage($marketingMetrics.conversionRate)}</div>
            </div>
            
            <div class="bg-gray-700 p-3 rounded">
                <div class="text-sm text-gray-300">Avg Customer Value</div>
                <div class="text-lg font-bold">${formatNumber($marketingMetrics.averageCustomerValue)}</div>
            </div>
            
            <div class="bg-gray-700 p-3 rounded">
                <div class="text-sm text-gray-300">Monthly Active</div>
                <div class="text-lg font-bold">{formatNumber($marketingMetrics.monthlyActiveCustomers)}</div>
            </div>
        </div>
    </div>

    <!-- Population Info -->
    {#if $populationData}
        {@const population = $populationData as PopulationData}
        <div class="population-info mb-6">
            <h3 class="text-lg font-semibold mb-3">Market Information</h3>
            <div class="bg-gray-700 p-3 rounded">
                <div class="text-sm text-gray-300">Total Market Size</div>
                <div class="text-lg font-bold">{formatNumber(population.totalSize)}</div>
                <div class="text-xs text-gray-400 mt-1">
                    Growth Rate: {formatPercentage(population.growthRate)} per week
                </div>
            </div>
        </div>
    {/if}

    <!-- Content Creation Form -->
    <div class="content-creation">
        <h3 class="text-lg font-semibold mb-3">Create Content</h3>
        
        {#if marketingPersonnel.length === 0}
            <div class="bg-yellow-600 p-3 rounded mb-4">
                <p class="text-sm">No marketing personnel available. Hire a Marketing Specialist to create content!</p>
            </div>
        {:else}
            <div class="form-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Marketing Personnel</label>
                    <select bind:value={selectedPersonnel} class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
                        <option value="">Select Personnel</option>
                        {#each marketingPersonnel as person}
                            <option value={person.id}>{person.label} (AP: {person.actionPoints})</option>
                        {/each}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-1">Platform</label>
                    <select bind:value={selectedPlatform} class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="youtube">YouTube</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="tiktok">TikTok</option>
                    </select>
                </div>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">Content Type</label>
                <select bind:value={selectedContentTemplate} class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
                    <option value="">Select Content Type</option>
                    {#each availableContent as template}
                        {#if template.platforms.includes(selectedPlatform as any)}
                            <option value={template.id}>
                                {template.label} - ${template.baseCost}
                            </option>
                        {/if}
                    {/each}
                </select>
            </div>
            
            {#if selectedContentTemplate}
                {@const template = contentTemplates.find(t => t.id === selectedContentTemplate)}
                {#if template}
                    <div class="content-preview bg-gray-700 p-3 rounded mb-4">
                        <h4 class="font-semibold">{template.label}</h4>
                        <p class="text-sm text-gray-300 mb-2">{template.description}</p>
                        <div class="text-xs text-gray-400">
                            <span>Cost: ${template.baseCost}</span> • 
                            <span>Est. Reach: {template.estimatedReach}</span> • 
                            <span>Category: {template.category}</span>
                        </div>
                    </div>
                {/if}
            {/if}
            
            <button 
                on:click={handleCreateContent}
                disabled={!selectedPersonnel || !selectedContentTemplate}
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
            >
                Create Content
            </button>
        {/if}
    </div>
</div>

<style>
    .marketing-panel {
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .metric-card {
        transition: transform 0.2s ease;
    }
    
    .metric-card:hover {
        transform: translateY(-2px);
    }
</style>
