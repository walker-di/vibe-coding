<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';

    // Import components
    import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
    import InfoPanel from '../components/InfoPanel.svelte';
    import Hud from '../components/Hud.svelte';
    import ContextMenu from '../components/ContextMenu.svelte';
    import HiringModal from '../components/HiringModal.svelte';


    // Import stores
    import { nodes, edges, startGame, stopGame, dispatchGameAction } from '../store/gameStore';
    import {
        contextMenu,
        infoPanelData,
        selectNode,
        deselectNode,
        showContextMenu,
        hideContextMenu,
        setInfoPanelData,
        showSuccessNotification,
        showErrorNotification
    } from '../store/uiStore';



    let cytoscapeGraph: CytoscapeGraph;
    let hiringModalVisible = false;

    onMount(() => {
        if (browser) {
            // Start the game loop
            startGame();
            showSuccessNotification('Welcome to ProductGraphTycoon!', 5000);
        }
    });

    onDestroy(() => {
        if (browser) {
            stopGame();
        }
    });

    // Event handlers
    function handleNodeClick(nodeId: string, nodeData: any) {
        selectNode(nodeId, nodeData);
        setInfoPanelData(nodeData);

        // Test action points consumption for Personnel nodes
        if (nodeData.type === 'Personnel') {
            const result = dispatchGameAction({
                type: 'CONSUME_ACTION_POINTS',
                payload: { personnelId: nodeId, amount: 1 }
            });

            if (result.success) {
                showSuccessNotification(result.message);
            } else {
                showErrorNotification(result.message);
            }
        }
    }

    function handleEdgeClick(edgeId: string, edgeData: any) {
        console.log('Edge clicked:', edgeId, edgeData);
    }

    function handleCanvasClick() {
        deselectNode();
        hideContextMenu();
    }

    function handleNodeRightClick(nodeId: string, position: any, _nodeData: any) {
        // Convert Cytoscape position to screen position
        const screenX = position.x || 0;
        const screenY = position.y || 0;
        showContextMenu(nodeId, screenX, screenY);
    }

    function handleNodeDrop(draggedNodeId: string, targetNodeId: string | null) {
        if (targetNodeId) {
            console.log(`Dropped ${draggedNodeId} onto ${targetNodeId}`);
            // Here you could implement node combination logic
            showSuccessNotification(`Dropped ${draggedNodeId} onto ${targetNodeId}`);
        }
    }

    function handleCloseInfoPanel() {
        deselectNode();
    }

    function handleCloseContextMenu() {
        hideContextMenu();
    }

    function handleOpenHiringModal() {
        hiringModalVisible = true;
    }

    function handleCloseHiringModal() {
        hiringModalVisible = false;
    }
</script>

<svelte:head>
    <title>ProductGraphTycoon</title>
    <meta name="description" content="A business simulation game built with Svelte 5 and Cytoscape.js" />
</svelte:head>

<div class="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
    <!-- HUD -->
    <Hud />

    <!-- Main game area -->
    <main class="flex-1 relative">
        <!-- Cytoscape Graph -->
        <CytoscapeGraph
            bind:this={cytoscapeGraph}
            nodes={$nodes}
            edges={$edges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onCanvasClick={handleCanvasClick}
            onNodeRightClick={handleNodeRightClick}
            onNodeDrop={handleNodeDrop}
            layout="cose"
        />

        <!-- Info Panel -->
        {#if $infoPanelData}
            <InfoPanel
                data={$infoPanelData}
                onClose={handleCloseInfoPanel}
            />
        {/if}

        <!-- Context Menu -->
        {#if $contextMenu.visible}
            <ContextMenu
                x={$contextMenu.x}
                y={$contextMenu.y}
                nodeId={$contextMenu.nodeId}
                onClose={handleCloseContextMenu}
                onOpenHiringModal={handleOpenHiringModal}
            />
        {/if}

        <!-- Hiring Modal -->
        <HiringModal
            bind:visible={hiringModalVisible}
            onClose={handleCloseHiringModal}
        />
    </main>

    <!-- Game controls overlay -->
    <div class="absolute bottom-4 left-4 flex space-x-2">
        <button
            class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            onclick={() => cytoscapeGraph?.fitGraph()}
        >
            Fit Graph
        </button>
        <button
            class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
            onclick={() => cytoscapeGraph?.runLayout('cose', true)}
        >
            Re-layout
        </button>
        <button
            class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            onclick={() => cytoscapeGraph?.centerGraph()}
        >
            Center
        </button>
    </div>
</div>
