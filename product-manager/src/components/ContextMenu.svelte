<script lang="ts">
    import { onMount } from 'svelte';
    import type { BaseNodeData } from '../types';
    import { getNodeById, addNode, removeNode, createTask, firePersonnel, dispatchGameAction } from '../store/gameStore';
    import { showSuccessNotification, showErrorNotification } from '../store/uiStore';

    interface Props {
        x: number;
        y: number;
        nodeId: string | null;
        onClose?: () => void;
        onOpenHiringModal?: () => void;
    }

    let { x = 0, y = 0, nodeId = null, onClose = () => {}, onOpenHiringModal = () => {} }: Props = $props();

    let menuElement: HTMLDivElement;
    let nodeData: BaseNodeData | undefined = $state(undefined);

    // Get node data when nodeId changes
    $effect(() => {
        if (nodeId) {
            nodeData = getNodeById(nodeId);
        } else {
            nodeData = undefined;
        }
    });

    // Close menu when clicking outside
    onMount(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuElement && !menuElement.contains(event.target as Node)) {
                onClose();
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    });

    // Action handlers
    function handleRemoveNode() {
        if (!nodeId) return;
        
        const result = removeNode(nodeId);
        if (result.success) {
            showSuccessNotification(`Removed ${nodeData?.label || 'node'}`);
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleDuplicateNode() {
        if (!nodeData) return;

        const newNode = {
            ...nodeData,
            id: `${nodeData.id}-copy-${Date.now()}`,
            label: `${nodeData.label} (Copy)`,
            position: {
                x: (nodeData.position?.x || 0) + 50,
                y: (nodeData.position?.y || 0) + 50
            }
        };

        const result = addNode(newNode);
        if (result.success) {
            showSuccessNotification(`Duplicated ${nodeData.label}`);
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleOpenHiringModal() {
        onOpenHiringModal();
        onClose();
    }

    function handleFirePersonnel() {
        if (!nodeId) return;

        const result = firePersonnel(nodeId);
        if (result.success) {
            showSuccessNotification(`Fired ${nodeData?.label || 'personnel'}`);
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleCreateTask() {
        const newTask = {
            id: `task-${Date.now()}`,
            label: 'New Task',
            type: 'Task' as const,
            description: 'A new task to be completed',
            requiredSkills: ['general'],
            timeToComplete: 10,
            progress: 0,
            assignedPersonnelIds: [],
            inputNodeIds: [],
            position: { x: x - 200, y: y - 100 }
        };

        const result = addNode(newTask);
        if (result.success) {
            showSuccessNotification('Created new task');
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleCreateProduct() {
        const newProduct = {
            id: `product-${Date.now()}`,
            label: 'New Product',
            type: 'Product' as const,
            description: 'A new product in development',
            quality: 0.5,
            features: [],
            developmentProgress: 0,
            position: { x: x - 200, y: y - 100 }
        };

        const result = addNode(newProduct);
        if (result.success) {
            showSuccessNotification('Created new product');
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleCreateWebsite() {
        const newWebsite = {
            id: `website-${Date.now()}`,
            label: 'Website Project',
            type: 'Product' as const,
            description: 'A website development project',
            quality: 0.3,
            features: ['responsive design', 'user interface'],
            developmentProgress: 0,
            position: { x: x - 200, y: y - 100 }
        };

        const result = addNode(newWebsite);
        if (result.success) {
            showSuccessNotification('Created website project');
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleCreateApp() {
        const newApp = {
            id: `app-${Date.now()}`,
            label: 'Mobile App Project',
            type: 'Product' as const,
            description: 'A mobile application development project',
            quality: 0.3,
            features: ['mobile interface', 'cross-platform'],
            developmentProgress: 0,
            position: { x: x - 200, y: y - 100 }
        };

        const result = addNode(newApp);
        if (result.success) {
            showSuccessNotification('Created mobile app project');
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    function handleCreatePitch() {
        if (!nodeId) return;

        const result = dispatchGameAction({
            type: 'CREATE_PITCH',
            payload: {
                personnelId: nodeId,
                position: { x: x - 200, y: y - 100 }
            }
        });

        if (result.success) {
            showSuccessNotification('Created pitch task! Assign personnel to work on it.');
        } else {
            showErrorNotification(result.message);
        }
        onClose();
    }

    // Check if personnel has project creation skills
    function canCreateProjects(): boolean {
        if (!nodeData || nodeData.type !== 'Personnel') return false;
        const personnel = nodeData as any;
        return personnel.skills?.includes('project-creation') ||
               personnel.skills?.includes('web-development') ||
               personnel.skills?.includes('app-development');
    }

    function canCreateWebsites(): boolean {
        if (!nodeData || nodeData.type !== 'Personnel') return false;
        const personnel = nodeData as any;
        return personnel.skills?.includes('web-development') ||
               personnel.skills?.includes('project-creation');
    }

    function canCreateApps(): boolean {
        if (!nodeData || nodeData.type !== 'Personnel') return false;
        const personnel = nodeData as any;
        return personnel.skills?.includes('app-development') ||
               personnel.skills?.includes('mobile development') ||
               personnel.skills?.includes('project-creation');
    }

    function canCreatePitch(): boolean {
        if (!nodeData || nodeData.type !== 'Personnel') return false;
        const personnel = nodeData as any;
        return personnel.skills?.includes('pitching');
    }

    // Get available actions based on node type
    function getAvailableActions() {
        if (!nodeData) {
            return [
                { label: 'Hire Personnel', action: handleOpenHiringModal, icon: '👥' },
                { label: 'Create Task', action: handleCreateTask, icon: '⚡' },
                { label: 'Create Product', action: handleCreateProduct, icon: '📦' }
            ];
        }

        const commonActions = [
            { label: 'Duplicate', action: handleDuplicateNode, icon: '📋' },
            { label: 'Remove', action: handleRemoveNode, icon: '🗑️', danger: true }
        ];

        switch (nodeData.type) {
            case 'Personnel':
                const personnelActions = [
                    { label: 'Fire Personnel', action: handleFirePersonnel, icon: '🚫', danger: true },
                    { label: 'Create Task', action: handleCreateTask, icon: '⚡' },
                ];

                // Add project creation options based on skills
                if (canCreateWebsites()) {
                    personnelActions.push({ label: 'Create Website', action: handleCreateWebsite, icon: '🌐' });
                }
                if (canCreateApps()) {
                    personnelActions.push({ label: 'Create App', action: handleCreateApp, icon: '📱' });
                }
                if (canCreatePitch()) {
                    personnelActions.push({ label: 'Create Pitch', action: handleCreatePitch, icon: '🎯' });
                }

                personnelActions.push({ label: 'Duplicate', action: handleDuplicateNode, icon: '📋' });
                return personnelActions;
            case 'Task':
                return [
                    { label: 'Hire Personnel', action: handleOpenHiringModal, icon: '👥' },
                    ...commonActions
                ];
            case 'Product':
                return [
                    { label: 'Create Task', action: handleCreateTask, icon: '⚡' },
                    ...commonActions
                ];
            case 'Idea':
                return [
                    { label: 'Create Product', action: handleCreateProduct, icon: '📦' },
                    { label: 'Create Task', action: handleCreateTask, icon: '⚡' },
                    ...commonActions
                ];
            default:
                return commonActions;
        }
    }

    const actions = $derived(getAvailableActions());

    // Adjust menu position to stay within viewport
    function getMenuStyle() {
        const menuWidth = 200;
        const menuHeight = actions.length * 40 + 16; // Approximate height
        
        let adjustedX = x;
        let adjustedY = y;

        // Adjust horizontal position
        if (x + menuWidth > window.innerWidth) {
            adjustedX = x - menuWidth;
        }

        // Adjust vertical position
        if (y + menuHeight > window.innerHeight) {
            adjustedY = y - menuHeight;
        }

        return `left: ${Math.max(0, adjustedX)}px; top: ${Math.max(0, adjustedY)}px;`;
    }
</script>

{#if nodeId !== null}
    <div
        bind:this={menuElement}
        class="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-48"
        style={getMenuStyle()}
    >
        <!-- Menu header -->
        {#if nodeData}
            <div class="px-3 py-2 border-b border-gray-600">
                <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-white">{nodeData.label}</span>
                    <span class="text-xs text-gray-400">({nodeData.type})</span>
                </div>
            </div>
        {/if}

        <!-- Menu actions -->
        <div class="py-1">
            {#each actions as action}
                <button
                    class="w-full px-3 py-2 text-left text-sm transition-colors flex items-center space-x-2 {action.danger 
                        ? 'text-red-400 hover:bg-red-900/20' 
                        : 'text-gray-300 hover:bg-gray-700'}"
                    onclick={action.action}
                >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                </button>
            {/each}
        </div>

        <!-- Separator and close option -->
        <div class="border-t border-gray-600 py-1">
            <button
                class="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-700 transition-colors"
                onclick={onClose}
            >
                Close
            </button>
        </div>
    </div>
{/if}
