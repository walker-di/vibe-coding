<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import cytoscape from 'cytoscape';
    import type { BaseNodeData, EdgeData } from '../types';
    import { cytoscapeStylesheet, getCytoscapeLayout, gameNodesToCytoscapeElements } from '../utils/cytoscapeUtils';

    // Props
    interface Props {
        nodes: BaseNodeData[];
        edges: EdgeData[];
        onNodeClick?: (nodeId: string, nodeData: BaseNodeData) => void;
        onEdgeClick?: (edgeId: string, edgeData: EdgeData) => void;
        onCanvasClick?: () => void;
        onNodeRightClick?: (nodeId: string, position: { x: number; y: number }, nodeData: BaseNodeData) => void;
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

    let cy: any = $state();
    let cyContainer: HTMLDivElement;
    let draggedNode: any = null;
    let hasInitialCentered = false; // Flag to track if we've done initial centering

    onMount(async () => {
        if (!cyContainer) return;

        // Dynamically import and register the compound drag and drop extension (client-side only)
        let compoundDragAndDrop: any = null;
        try {
            const module = await import('cytoscape-compound-drag-and-drop');
            compoundDragAndDrop = module.default;
            (cytoscape as any).use(compoundDragAndDrop);
            console.log('Compound drag and drop extension loaded successfully');
        } catch (error) {
            console.warn('Failed to load compound drag and drop extension:', error);
        }

        // Initialize Cytoscape
        const cytoscapeCore = (cytoscape as any);
        cy = cytoscapeCore({
            container: cyContainer,
            elements: [], // Will be populated by $effect
            style: cytoscapeStylesheet,
            layout: getCytoscapeLayout(layout, { fit: true }), // Initial layout should fit
            wheelSensitivity: 1.0, // Increased from 0.2 for faster zooming
            minZoom: 0.1,
            maxZoom: 5,
            userZoomingEnabled: true,
            userPanningEnabled: true,
            boxSelectionEnabled: false,
            selectionType: 'single'
        });

        // Initialize compound drag and drop if available
        if (compoundDragAndDrop && cy.compoundDragAndDrop) {
            const cdnd = cy.compoundDragAndDrop({
                grabbedNode: (node: any) => {
                    // Only allow Personnel nodes to be grabbed for compound operations
                    return node.data('type') === 'Personnel';
                },
                dropTarget: (dropTarget: any, grabbedNode: any) => {
                    // Allow dropping Personnel on Course nodes
                    return dropTarget.data('type') === 'Course' && grabbedNode.data('type') === 'Personnel';
                },
                dropSibling: () => false, // Don't allow sibling drops for now
                newParentNode: () => ({}), // Don't create new parent nodes
                overThreshold: 10,
                outThreshold: 10
            });

            console.log('Compound drag and drop initialized:', cdnd);

            // Add compound drag and drop event handlers
            cy.on('cdndover', (event: any, dropTarget: any) => {
                console.log('Personnel node over course:', event.target.id(), 'over', dropTarget.id());
            });

            cy.on('cdndout', (event: any, dropTarget: any) => {
                console.log('Personnel node out of course:', event.target.id(), 'out of', dropTarget.id());
            });

            cy.on('cdnddrop', (event: any, dropTarget: any) => {
                const grabbedNode = event.target;
                console.log('Personnel dropped on course:', grabbedNode.id(), 'on', dropTarget.id());
                onNodeDrop(grabbedNode.id(), dropTarget.id());
            });
        }



        // Node click handler
        cy.on('tap', 'node', (event: any) => {
            const node: any = event.target;
            const nodeData = node.data();
            onNodeClick(node.id(), nodeData);
        });

        // Edge click handler
        cy.on('tap', 'edge', (event: any) => {
            const edge: any = event.target;
            const edgeData = edge.data();
            onEdgeClick(edge.id(), edgeData);
        });

        // Canvas click handler
        cy.on('tap', (event: any) => {
            if (event.target === cy) {
                onCanvasClick();
            }
        });

        // Right click handler
        cy.on('cxttap', 'node', (event: any) => {
            const node: any = event.target;
            const nodeData = node.data();
            const position = event.position || event.renderedPosition;
            onNodeRightClick(node.id(), position, nodeData);
        });

        // Middle mouse button panning
        let isPanning = false;
        let lastPanPosition = { x: 0, y: 0 };

        cyContainer.addEventListener('mousedown', (event) => {
            if (event.button === 1) { // Middle mouse button
                event.preventDefault();
                isPanning = true;
                lastPanPosition = { x: event.clientX, y: event.clientY };
                cyContainer.style.cursor = 'grabbing';
            }
        });

        cyContainer.addEventListener('mousemove', (event) => {
            if (isPanning && cy) {
                event.preventDefault();
                const deltaX = event.clientX - lastPanPosition.x;
                const deltaY = event.clientY - lastPanPosition.y;

                const currentPan = cy.pan();
                cy.pan({
                    x: currentPan.x + deltaX,
                    y: currentPan.y + deltaY
                });

                lastPanPosition = { x: event.clientX, y: event.clientY };
            }
        });

        cyContainer.addEventListener('mouseup', (event) => {
            if (event.button === 1) { // Middle mouse button
                event.preventDefault();
                isPanning = false;
                cyContainer.style.cursor = 'default';
            }
        });

        cyContainer.addEventListener('mouseleave', () => {
            if (isPanning) {
                isPanning = false;
                cyContainer.style.cursor = 'default';
            }
        });



        // Fallback drag and drop handlers for non-compound operations
        cy.on('grab', 'node', (event: any) => {
            draggedNode = event.target;
        });

        cy.on('free', 'node', (event: any) => {
            if (draggedNode) {
                const target = event.target;
                const position = target.position();

                // Find if the node was dropped on another node
                const dropTarget = cy?.nodes().filter((node: any) => {
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
            console.log('CYTOSCAPE: Updating with', nodes.length, 'nodes,', edges.length, 'edges');
            console.log('CYTOSCAPE: Courses:', nodes.filter(n => n.type === 'Course').map(c => ({ id: c.id, label: c.label })));
            console.log('CYTOSCAPE: Personnel:', nodes.filter(n => n.type === 'Personnel').map(p => ({ id: p.id, label: p.label, enrolledInCourse: (p as any).enrolledInCourse })));

            // Get current elements in Cytoscape
            const currentNodes = cy.nodes().map((n: any) => n.id());
            const currentEdges = cy.edges().map((e: any) => e.id());

            // Find elements to add and remove
            const newNodeIds = elements
                .filter(el => el.group === 'nodes')
                .map(el => el.data.id);
            const newEdgeIds = elements
                .filter(el => el.group === 'edges')
                .map(el => el.data.id);

            const nodesToRemove = currentNodes.filter((id: any) => !newNodeIds.includes(id));
            const edgesToRemove = currentEdges.filter((id: any) => !newEdgeIds.includes(id));
            const nodesToAdd = elements.filter(el => 
                el.group === 'nodes' && !currentNodes.includes(el.data.id)
            );
            const edgesToAdd = elements.filter(el => 
                el.group === 'edges' && !currentEdges.includes(el.data.id)
            );

            // Remove elements that no longer exist
            if (nodesToRemove.length > 0) {
                cy.remove(cy.nodes().filter((n: any) => nodesToRemove.includes(n.id())));
            }
            if (edgesToRemove.length > 0) {
                cy.remove(cy.edges().filter((e: any) => edgesToRemove.includes(e.id())));
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

            // Run layout if there are new elements (without fit to prevent auto-centering)
            if (nodesToAdd.length > 0) {
                const layoutOptions = getCytoscapeLayout(layout, { fit: false });
                const layoutInstance = cy.layout(layoutOptions);

                // Center the graph once after initial layout is complete (game initialization)
                if (!hasInitialCentered) {
                    layoutInstance.one('layoutstop', () => {
                        cy?.center();
                        hasInitialCentered = true;
                    });
                }

                layoutInstance.run();
            } else if (!hasInitialCentered && elements.length > 0) {
                // If no new nodes but we have elements and haven't centered yet, center immediately
                cy?.center();
                hasInitialCentered = true;
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

    export function runLayout(layoutName?: string, shouldFit: boolean = false) {
        if (cy) {
            const layoutOptions = getCytoscapeLayout(layoutName || layout, { fit: shouldFit });
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

<div class="relative w-full h-full">


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
</div>

<style>
    /* Ensure the container takes full space */
    div {
        position: relative;
    }
</style>
