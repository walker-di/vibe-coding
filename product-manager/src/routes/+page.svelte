<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';

    // Import components
    import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
    import InfoPanel from '../components/InfoPanel.svelte';
    import Hud from '../components/Hud.svelte';
    import ContextMenu from '../components/ContextMenu.svelte';
    import HiringModal from '../components/HiringModal.svelte';
    import CourseModalSimple from '../components/CourseModalSimple.svelte';
    import FinanceModal from '../components/FinanceModal.svelte';
    import MarketingPanel from '../components/MarketingPanel.svelte';


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
    let courseModalVisible = false;
    let financeModalVisible = false;
    let marketingPanelVisible = false;

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

            // Get the dragged and target nodes
            const draggedNode = $nodes.find(node => node.id === draggedNodeId);
            const targetNode = $nodes.find(node => node.id === targetNodeId);

            // Handle personnel enrollment in courses
            if (draggedNode?.type === 'Personnel' && targetNode?.type === 'Course') {
                const result = dispatchGameAction({
                    type: 'ENROLL_PERSONNEL_IN_COURSE',
                    payload: { personnelId: draggedNodeId, courseId: targetNodeId }
                });

                if (result.success) {
                    showSuccessNotification(result.message);
                } else {
                    showErrorNotification(result.message);
                }
            }
            // Handle personnel assignment to tasks
            else if (draggedNode?.type === 'Personnel' && targetNode?.type === 'Task') {
                const result = dispatchGameAction({
                    type: 'ASSIGN_PERSONNEL_TO_TASK',
                    payload: { personnelId: draggedNodeId, taskId: targetNodeId }
                });

                if (result.success) {
                    showSuccessNotification(result.message);
                } else {
                    showErrorNotification(result.message);
                }
            } else {
                // Generic drop notification for other combinations
                showSuccessNotification(`Dropped ${draggedNodeId} onto ${targetNodeId}`);
            }
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

    function handleOpenCourseModal() {
        courseModalVisible = true;
    }

    function handleCloseCourseModal() {
        courseModalVisible = false;
    }

    function handleOpenFinanceModal() {
        financeModalVisible = true;
    }

    function handleCloseFinanceModal() {
        financeModalVisible = false;
    }
</script>

<svelte:head>
    <title>ProductGraphTycoon</title>
    <meta name="description" content="A business simulation game built with Svelte 5 and Cytoscape.js" />
</svelte:head>

<div class="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
    <!-- HUD -->
    <Hud onOpenCourseModal={handleOpenCourseModal} onOpenHiringModal={handleOpenHiringModal} onOpenFinanceModal={handleOpenFinanceModal} />

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

        <!-- Marketing Panel -->
        {#if marketingPanelVisible}
            <div class="absolute top-4 left-4 w-80 z-20">
                <div class="relative">
                    <button
                        class="absolute top-2 right-2 z-30 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                        onclick={() => marketingPanelVisible = false}
                    >
                        ×
                    </button>
                    <MarketingPanel />
                </div>
            </div>
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

        <!-- Course Modal -->
        <CourseModalSimple
            bind:visible={courseModalVisible}
            onClose={handleCloseCourseModal}
        />

        <!-- Finance Modal -->
        <FinanceModal
            bind:visible={financeModalVisible}
            onClose={handleCloseFinanceModal}
        />
    </main>

    <!-- Game controls overlay -->
    <div class="absolute bottom-4 left-4 flex space-x-2">
        <button
            class="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
            onclick={() => marketingPanelVisible = !marketingPanelVisible}
        >
            📊 Marketing
        </button>
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
