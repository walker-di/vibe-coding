<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import cytoscape from 'cytoscape';
    import type { Core, NodeSingular, EdgeSingular, Position } from 'cytoscape';
    import type { BaseNodeData, EdgeData } from '../types';
    import { cytoscapeStylesheet, getCytoscapeLayout, gameNodesToCytoscapeElements } from '../utils/cytoscapeUtils';

    // Props
    interface Props {
        nodes: BaseNodeData[];
        edges: EdgeData[];
        onNodeClick?: (nodeId: string, nodeData: BaseNodeData) => void;
        onEdgeClick?: (edgeId: string, edgeData: EdgeData) => void;
        onCanvasClick?: () => void;
        onNodeRightClick?: (nodeId: string, position: Position, nodeData: BaseNodeData) => void;
        onNodeDrop?: (draggedNodeId: string, targetNodeId: string | null) => void;
        layout?: string;
    }

    let {
        nodes = $bindable([]),
        edges = $bindable([]),
        onNodeClick = () => {},
        onEdgeClick = () => {},
        onCanvasClick = () => {},
        onNodeRightClick = () => {},
        onNodeDrop = () => {},
        layout = 'cose'
    }: Props = $props();

    let cy: Core | undefined;
    let cyContainer: HTMLDivElement;
    let draggedNode: NodeSingular | null = null;

    onMount(() => {
        if (!cyContainer) return;

        // Initialize Cytoscape
        cy = cytoscape({
            container: cyContainer,
            elements: [], // Will be populated by $effect
            style: cytoscapeStylesheet,
            layout: getCytoscapeLayout(layout),
            wheelSensitivity: 0.2,
            minZoom: 0.2,
            maxZoom: 3,
            userZoomingEnabled: true,
            userPanningEnabled: true,
            boxSelectionEnabled: false,
            selectionType: 'single'
        });

        // Node click handler
        cy.on('tap', 'node', (event) => {
            const node: NodeSingular = event.target;
            const nodeData = node.data();
            onNodeClick(node.id(), nodeData);
        });

        // Edge click handler
        cy.on('tap', 'edge', (event) => {
            const edge: EdgeSingular = event.target;
            const edgeData = edge.data();
            onEdgeClick(edge.id(), edgeData);
        });

        // Canvas click handler
        cy.on('tap', (event) => {
            if (event.target === cy) {
                onCanvasClick();
            }
        });

        // Right click handler
        cy.on('cxttap', 'node', (event) => {
            const node: NodeSingular = event.target;
            const nodeData = node.data();
            const position = event.position || event.renderedPosition;
            onNodeRightClick(node.id(), position, nodeData);
        });

        // Drag and drop handlers
        cy.on('grab', 'node', (event) => {
            draggedNode = event.target;
        });

        cy.on('free', 'node', (event) => {
            if (draggedNode) {
                const target = event.target;
                const position = target.position();
                
                // Find if the node was dropped on another node
                const dropTarget = cy?.nodes().filter(node => {
                    if (node.id() === target.id()) return false; // Don't drop on itself
                    const bb = node.boundingBox();
                    const tolerance = 20; // Pixels of tolerance for drop detection
                    return position.x > bb.x1 - tolerance && 
                           position.x < bb.x2 + tolerance && 
                           position.y > bb.y1 - tolerance && 
                           position.y < bb.y2 + tolerance;
                }).first();

                if (dropTarget && dropTarget.isNode()) {
                    onNodeDrop(draggedNode.id(), dropTarget.id());
                } else {
                    onNodeDrop(draggedNode.id(), null);
                }
                
                draggedNode = null;
            }
        });

        // Handle window resize
        const handleResize = () => {
            if (cy) {
                cy.resize();
                cy.fit();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cy?.destroy();
        };
    });

    // Reactive updates to Cytoscape graph using $effect
    $effect(() => {
        if (!cy) return;

        try {
            // Convert game data to Cytoscape format
            const elements = gameNodesToCytoscapeElements(nodes, edges);
            
            // Get current elements in Cytoscape
            const currentNodes = cy.nodes().map(n => n.id());
            const currentEdges = cy.edges().map(e => e.id());
            
            // Find elements to add and remove
            const newNodeIds = elements
                .filter(el => el.group === 'nodes')
                .map(el => el.data.id);
            const newEdgeIds = elements
                .filter(el => el.group === 'edges')
                .map(el => el.data.id);
            
            const nodesToRemove = currentNodes.filter(id => !newNodeIds.includes(id));
            const edgesToRemove = currentEdges.filter(id => !newEdgeIds.includes(id));
            const nodesToAdd = elements.filter(el => 
                el.group === 'nodes' && !currentNodes.includes(el.data.id)
            );
            const edgesToAdd = elements.filter(el => 
                el.group === 'edges' && !currentEdges.includes(el.data.id)
            );

            // Remove elements that no longer exist
            if (nodesToRemove.length > 0) {
                cy.remove(cy.nodes().filter(n => nodesToRemove.includes(n.id())));
            }
            if (edgesToRemove.length > 0) {
                cy.remove(cy.edges().filter(e => edgesToRemove.includes(e.id())));
            }

            // Add new elements
            if (nodesToAdd.length > 0 || edgesToAdd.length > 0) {
                cy.add([...nodesToAdd, ...edgesToAdd]);
            }

            // Update existing elements data
            elements.forEach(element => {
                if (element.group === 'nodes') {
                    const cyNode = cy.getElementById(element.data.id);
                    if (cyNode.length > 0) {
                        cyNode.data(element.data);
                    }
                } else if (element.group === 'edges') {
                    const cyEdge = cy.getElementById(element.data.id);
                    if (cyEdge.length > 0) {
                        cyEdge.data(element.data);
                    }
                }
            });

            // Run layout if there are new elements
            if (nodesToAdd.length > 0) {
                const layoutOptions = getCytoscapeLayout(layout);
                cy.layout(layoutOptions).run();
            }

        } catch (error) {
            console.error('Error updating Cytoscape graph:', error);
        }
    });

    // Public methods for external control
    export function fitGraph() {
        cy?.fit();
    }

    export function centerGraph() {
        cy?.center();
    }

    export function runLayout(layoutName?: string) {
        if (cy) {
            const layoutOptions = getCytoscapeLayout(layoutName || layout);
            cy.layout(layoutOptions).run();
        }
    }

    export function selectNode(nodeId: string) {
        if (cy) {
            cy.nodes().unselect();
            const node = cy.getElementById(nodeId);
            if (node.length > 0) {
                node.select();
            }
        }
    }

    export function unselectAll() {
        cy?.elements().unselect();
    }

    export function zoomToNode(nodeId: string) {
        if (cy) {
            const node = cy.getElementById(nodeId);
            if (node.length > 0) {
                cy.animate({
                    zoom: 1.5,
                    center: { eles: node }
                }, {
                    duration: 500
                });
            }
        }
    }

    onDestroy(() => {
        cy?.destroy();
    });
</script>

<div 
    bind:this={cyContainer} 
    class="w-full h-full bg-gray-900 rounded-lg border border-gray-700"
    style="min-height: 400px;"
>
    <!-- Loading state or empty state could go here -->
    {#if !cy}
        <div class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Loading graph...</p>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Ensure the container takes full space */
    div {
        position: relative;
    }
</style>
