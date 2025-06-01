<script lang="ts">
    import { dispatchGameAction } from '../store/gameStore';
    import { companyFinances } from '../store/gameStore';
    import { showSuccessNotification, showErrorNotification } from '../store/uiStore';

    // No props needed for Shop component anymore
    
    interface ShopItem {
        id: string;
        label: string;
        type: 'Personnel' | 'Resource' | 'Idea' | 'Course';
        cost: number;
        description: string;
        icon?: string;
        requirements?: string[];
    }
    
    const shopItems: ShopItem[] = [
        {
            id: 'cloud-hosting',
            label: 'Cloud Hosting',
            type: 'Resource',
            cost: 1000,
            description: 'Monthly cloud hosting service',
            icon: '☁️',
            requirements: []
        },
        {
            id: 'dev-tools',
            label: 'Development Tools',
            type: 'Resource',
            cost: 2000,
            description: 'Professional development software licenses',
            icon: '🛠️',
            requirements: []
        },
        {
            id: 'market-research',
            label: 'Market Research',
            type: 'Idea',
            cost: 5000,
            description: 'Comprehensive market analysis for new opportunities',
            icon: '🔍',
            requirements: []
        }
    ];
    
    function purchaseItem(item: ShopItem) {
        // Check if player has enough money
        let currentFinances: any;
        const unsubscribe = companyFinances.subscribe(finances => currentFinances = finances);
        unsubscribe();

        if (currentFinances.capital < item.cost) {
            showErrorNotification(`Not enough capital! Need $${item.cost}, have $${currentFinances.capital}`);
            return;
        }
        
        // Create the appropriate node data based on item type
        let nodeData: any;
        
        if (item.type === 'Resource') {
            nodeData = {
                id: `${item.id}-${Date.now()}`,
                label: item.label,
                type: 'Resource',
                description: item.description,
                quantity: 1,
                unitCost: item.cost,
                category: 'service',
                position: {
                    x: Math.random() * 400 + 100,
                    y: Math.random() * 400 + 100
                }
            };
        } else if (item.type === 'Idea') {
            nodeData = {
                id: `${item.id}-${Date.now()}`,
                label: item.label,
                type: 'Idea',
                description: item.description,
                category: 'product',
                requirements: item.requirements || [],
                potential: 0.7,
                discovered: true,
                position: {
                    x: Math.random() * 400 + 100,
                    y: Math.random() * 400 + 100
                }
            };
        }
        
        // Dispatch the action to add the node
        const result = dispatchGameAction({
            type: 'ADD_NODE',
            payload: nodeData
        });
        
        if (result.success) {
            // Deduct the cost
            dispatchGameAction({
                type: 'UPDATE_FINANCES',
                payload: { capitalChange: -item.cost }
            });
            
            showSuccessNotification(`Purchased ${item.label} for $${item.cost}!`);
        } else {
            showErrorNotification(`Failed to purchase ${item.label}: ${result.message}`);
        }
    }

    function canAfford(cost: number): boolean {
        let currentFinances: any;
        const unsubscribe = companyFinances.subscribe(finances => currentFinances = finances);
        unsubscribe();
        return currentFinances.capital >= cost;
    }
    
    function getTypeColor(type: string): string {
        const colors: Record<string, string> = {
            'Personnel': 'bg-blue-600',
            'Resource': 'bg-purple-600',
            'Idea': 'bg-cyan-600',
            'Course': 'bg-green-600'
        };
        return colors[type] || 'bg-gray-600';
    }
</script>

<div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
    <h2 class="text-lg font-bold text-white mb-3">Shop</h2>

    <div class="flex gap-1 justify-start">
        {#each shopItems as item}
            <button
                class="relative w-16 h-16 p-1 rounded border-2 transition-all duration-200 {canAfford(item.cost)
                    ? `${getTypeColor(item.type)} border-gray-600 hover:border-gray-400 hover:scale-105 cursor-pointer`
                    : 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'}"
                onclick={() => canAfford(item.cost) && purchaseItem(item)}
                disabled={!canAfford(item.cost)}
            >
                <!-- Icon -->
                <div class="text-sm mb-0.5 text-center">
                    {item.icon || '📦'}
                </div>

                <!-- Label -->
                <div class="text-white font-bold text-xs text-center leading-none mb-0.5">
                    {item.label.split(' ')[0]}
                </div>

                <!-- Cost -->
                <div class="text-yellow-400 font-bold text-xs text-center leading-none">
                    {item.cost >= 1000 ? `${item.cost/1000}k` : item.cost}
                </div>

                <!-- Description (tooltip on hover) -->
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-48 text-center">
                    {item.description}
                </div>
            </button>
        {/each}
    </div>
</div>

<style>
    button:hover .absolute.bottom-full {
        opacity: 1;
    }
</style>
