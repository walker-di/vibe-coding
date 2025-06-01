Using Svelte 5 with its new rune-based reactivity and Tailwind CSS 4 for styling, alongside Cytoscape.js for the core UI, presents a modern and powerful stack.

Here's a more detailed developer document focusing on architecture, Svelte 5 integration, Cytoscape usage, and Tailwind considerations for your Business/Product Building & Management game.

## Developer Documentation: "ProductGraphTycoon"

**Game Concept:** A business simulation game where players build and manage a company by creating products, hiring personnel, managing finances, and navigating market challenges. The core interaction is card-based (represented as nodes) and visualized as a dynamic graph using Cytoscape.js.

**Current Status:** ✅ **IMPLEMENTED AND WORKING**
- Graph canvas with interactive nodes (Founder, Initial Capital, Mobile App Idea)
- Stacklands-style shop interface with purchasable items
- Real-time financial tracking and game state management
- Responsive zoom controls and node interactions

**Tech Stack:**

*   **Frontend Framework:** Svelte 5 (using Runes: `$state`, `$derived`, `$effect`)
*   **Styling:** Tailwind CSS 4 (utility-first approach)
*   **Graph Visualization:** Cytoscape.js (v3.x)
*   **Language:** TypeScript (for type safety and better DX)
*   **Build Tool:** Vite (for fast development and building)

---

## Current Implementation Status

### ✅ Completed Features

1. **Graph Canvas System**
   - Cytoscape.js integration with Svelte 5 runes
   - Interactive node visualization (Personnel: blue circles, Resources: purple rectangles, Ideas: cyan stars)
   - Responsive zoom controls (wheelSensitivity: 1.0 for fast zooming)
   - Node positioning and layout management

2. **Shop Interface (Stacklands-style)**
   - Compact 64x64px purchase cards in HUD
   - 7 purchasable items: Personnel (Junior Dev $3k, Designer $4k, Marketing $3.5k, Senior Dev $8k), Resources (Cloud Hosting $1k, Dev Tools $2k), Ideas (Market Research $5k)
   - Real-time affordability checking and visual feedback
   - Automatic node creation and capital deduction on purchase

3. **Game Engine & State Management**
   - Singleton GameEngine with event-driven architecture
   - Reactive Svelte stores using $state and $derived runes
   - Real-time financial tracking (capital, revenue/expenses per tick, totals)
   - Game loop with configurable speed (0.5x to 5x)

4. **UI Components**
   - HUD with financial summary and shop integration
   - Info panels for node details
   - Context menus for node actions
   - Responsive layout with Tailwind CSS

### 🔧 Technical Implementation Details

**Cytoscape Configuration:**
- wheelSensitivity: 1.0 (5x faster than default)
- minZoom: 0.1, maxZoom: 5
- Layout: 'cose' algorithm for organic node positioning
- Custom stylesheets for different node types

**Shop Card Design:**
- Fixed 64x64px dimensions for consistency
- Flex layout with minimal gaps (gap-1)
- Compact text (text-xs) and icons (text-sm)
- Cost display in k format (3k, 4k) for space efficiency

---

### 1. Project Structure (Current)

```
/src
|-- /app.html
|-- /main.ts         # Main entry point
|-- /App.svelte      # Root Svelte component
|
|-- /components
|   |-- CytoscapeGraph.svelte  # Wrapper for Cytoscape instance
|   |-- InfoPanel.svelte       # Displays info about selected node/edge
|   |-- Hud.svelte             # Heads-Up Display (money, date, etc.)
|   |-- ContextMenu.svelte     # For actions on nodes
|   |-- CardNode.svelte        # (Optional) Svelte component for node content if using Cytoscape's Svelte component nodes (advanced)
|
|-- /engine
|   |-- gameEngine.ts          # Core game logic, state management (separate from Svelte)
|   |-- /entities              # Definitions for nodes (Personnel, Product, etc.)
|   |   |-- Node.ts
|   |   |-- PersonnelNode.ts
|   |   |-- ProductNode.ts
|   |   |-- ResourceNode.ts
|   |   |-- TaskNode.ts
|   |   |-- MarketNode.ts
|   |-- /actions               # Logic for combining nodes, performing tasks
|   |   |-- developProduct.ts
|   |   |-- runMarketing.ts
|   |-- /events                # Game events (e.g., market changes, new hires available)
|   |-- constants.ts           # Game constants (e.g., tick duration, initial capital)
|
|-- /store
|   |-- gameStore.ts           # Svelte store(s) to bridge engine state with UI
|   |-- uiStore.ts             # UI-specific state (e.g., selected node, context menu visibility)
|
|-- /types
|   |-- index.ts               # Global type definitions
|
|-- /utils
|   |-- cytoscapeUtils.ts      # Helper functions for Cytoscape
|   |-- generalUtils.ts
|
|-- /assets
    |-- ... (images, icons)
```

---

### 2. Core Game Mechanics & Data Structures

(Refer to the previous detailed breakdown of card types and interactions)

**Key Data Structures (TypeScript examples):**

```typescript
// src/types/index.ts

export type NodeType = 'Personnel' | 'Product' | 'Resource' | 'Task' | 'Market' | 'Idea';

export interface BaseNodeData {
    id: string; // Unique ID
    label: string; // Display name
    type: NodeType;
    description?: string;
    cost?: number; // e.g., salary, purchase price
    properties?: Record<string, any>; // Custom properties
}

export interface PersonnelData extends BaseNodeData {
    type: 'Personnel';
    skills: string[];
    efficiency: number; // 0-1
    morale: number; // 0-1
    salary: number;
    assignedToTaskId?: string;
}

export interface ProductData extends BaseNodeData {
    type: 'Product';
    version?: string;
    quality: number; // 0-1
    features: string[];
    developmentProgress: number; // 0-1
    marketFit?: number; // 0-1
}

export interface TaskData extends BaseNodeData {
    type: 'Task';
    requiredSkills: string[];
    timeToComplete: number; // in game ticks
    progress: number; // 0-1
    assignedPersonnelIds: string[];
    inputNodeIds: string[]; // Resources needed
    outputNodeId?: string; // Product/Resource generated
}

// ... other node types (ResourceData, MarketData, IdeaData)

export interface EdgeData {
    id: string;
    source: string; // Source node ID
    target: string; // Target node ID
    label?: string; // e.g., "develops", "markets", "consumes"
    type?: 'assignment' | 'dependency' | 'creation_flow';
}

// Game State in engine
export interface GameState {
    nodes: Array<BaseNodeData | PersonnelData | ProductData | TaskData /* etc. */>;
    edges: EdgeData[];
    companyFinances: {
        capital: number;
        revenuePerTick: number;
        expensesPerTick: number;
    };
    currentTick: number;
    availableIdeas: string[]; // IDs of IdeaNodes
    // ... other global game state
}
```

---

### 3. Game Engine (`src/engine/gameEngine.ts`)

*   **Responsibilities:**
    *   Manage the canonical `GameState` (nodes, edges, finances, etc.).
    *   Implement game rules (how nodes interact, task completion, resource consumption).
    *   Process game ticks (update progress, pay salaries, trigger events).
    *   Provide an API for the UI to query state and trigger actions.
    *   SHOULD NOT directly interact with Svelte or Cytoscape.
*   **Key Methods (Illustrative):**
    *   `constructor()`: Initializes the game with starting nodes/resources.
    *   `getState(): GameState`: Returns a copy of the current game state.
    *   `performAction(actionType: string, payload: any): ActionResult`: e.g., `actionType: 'ASSIGN_PERSONNEL_TO_TASK'`, `payload: { personnelId: string, taskId: string }`.
    *   `tick()`: Advances game time, processes ongoing tasks, updates finances, triggers scheduled events.
    *   `addNode(nodeData: BaseNodeData): void`
    *   `removeNode(nodeId: string): void`
    *   `addEdge(edgeData: EdgeData): void`
    *   `removeEdge(edgeId: string): void`
*   **Event Emitter:** Use a simple event emitter (or a library) to notify subscribers (like `gameStore.ts`) of state changes, allowing the UI to react without direct coupling.

---

### 4. Svelte Stores (`src/store/`)

*   **`gameStore.ts`:**
    *   Uses Svelte 5 Runes (`$state`) to hold the reactive version of the `GameState`.
    *   Subscribes to the `gameEngine`'s events (or polls `gameEngine.getState()`) and updates its `$state` variables.
    *   Provides `$derived` states for computed values (e.g., total salary costs).

    ```typescript
    // src/store/gameStore.ts
    import { gameEngine } from '../engine/gameEngine'; // Assuming singleton instance
    import type { GameState, BaseNodeData, EdgeData } from '../types';

    let initialGameState = gameEngine.getState();

    export const nodes = $state<BaseNodeData[]>(initialGameState.nodes);
    export const edges = $state<EdgeData[]>(initialGameState.edges);
    export const capital = $state<number>(initialGameState.companyFinances.capital);
    export const currentTick = $state<number>(initialGameState.currentTick);

    // Example: Listen to game engine updates (conceptual)
    // This could be via an event emitter, or a more direct update mechanism
    // if the engine is designed to push updates.
    gameEngine.onStateChange((newState: GameState) => {
        nodes = newState.nodes; // Svelte 5 runes handle granular updates
        edges = newState.edges;
        capital = newState.companyFinances.capital;
        currentTick = newState.currentTick;
    });

    // Example: Function to dispatch action to game engine
    export function dispatchGameAction(actionType: string, payload: any) {
        const result = gameEngine.performAction(actionType, payload);
        // The onStateChange listener above will handle updating the store
        // based on the new state from the engine.
        if (!result.success) {
            console.error("Action failed:", result.message);
            // Potentially trigger a UI notification
        }
    }

    // Start the game loop (could be in main.ts or App.svelte)
    // setInterval(() => {
    //     gameEngine.tick();
    // }, 1000); // Game tick every second
    ```

*   **`uiStore.ts`:**
    *   Manages UI-specific state.
    *   `$state` for: `selectedNodeId: string | null`, `contextMenu: { visible: boolean, x: number, y: number, nodeId: string | null }`, `infoPanelData: BaseNodeData | null`.

---

### 5. Svelte Components (`src/components/`)

*   **`App.svelte`:**
    *   Main layout component.
    *   Renders `Hud.svelte`, `CytoscapeGraph.svelte`, `InfoPanel.svelte`, `ContextMenu.svelte`.
    *   Manages overall game loop timing if not handled elsewhere.
    *   Initializes the game engine and subscriptions.

    ```html
    <!-- src/App.svelte -->
    <script lang="ts">
        import { onMount } from 'svelte';
        import * as gameStore from './store/gameStore';
        import * as uiStore from './store/uiStore';
        import { gameEngine } from './engine/gameEngine'; // Ensure engine is initialized

        import CytoscapeGraph from './components/CytoscapeGraph.svelte';
        import InfoPanel from './components/InfoPanel.svelte';
        import Hud from './components/Hud.svelte';
        import ContextMenu from './components/ContextMenu.svelte';

        onMount(() => {
            // Initialize game, start game loop etc.
            // Example: Start the game tick
            const gameLoop = setInterval(() => {
                gameEngine.tick(); // This will trigger updates in gameStore via the engine's event emitter
            }, 1000); // Tick every second

            return () => clearInterval(gameLoop);
        });
    </script>

    <div class="flex flex-col h-screen bg-gray-800 text-white">
        <Hud />
        <main class="flex-grow relative">
            <CytoscapeGraph
                nodes={gameStore.nodes}
                edges={gameStore.edges}
                onNodeClick={(nodeId) => uiStore.selectNode(nodeId)}
                onCanvasClick={() => uiStore.deselectNode()}
                onNodeRightClick={(nodeId, eventPosition) => uiStore.showContextMenu(nodeId, eventPosition)}
            />
            {#if uiStore.infoPanelData}
                <InfoPanel data={uiStore.infoPanelData} />
            {/if}
            {#if uiStore.contextMenu.visible}
                <ContextMenu
                    x={uiStore.contextMenu.x}
                    y={uiStore.contextMenu.y}
                    nodeId={uiStore.contextMenu.nodeId}
                />
            {/if}
        </main>
    </div>
    ```

*   **`CytoscapeGraph.svelte`:** ✅ **IMPLEMENTED**
    *   **Props:** `nodes: BaseNodeData[]`, `edges: EdgeData[]`, `layout: string`, event handlers
    *   **Events:** `onNodeClick`, `onEdgeClick`, `onCanvasClick`, `onNodeRightClick`, `onNodeDrop`
    *   **Current Features:**
        - Cytoscape initialization with optimized settings (wheelSensitivity: 1.0)
        - Reactive updates using Svelte 5 `$effect` rune
        - Intelligent element diffing (add/remove/update only changed elements)
        - Drag and drop support for node interactions
        - Automatic layout management with 'cose' algorithm

    ```html
    <!-- src/components/CytoscapeGraph.svelte -->
    <script lang="ts">
        import { onMount, onDestroy } from 'svelte';
        import cytoscape from 'cytoscape';
        import type { Core, NodeSingular, EdgeSingular, Position } from 'cytoscape';
        import type { BaseNodeData, EdgeData } from '../types';
        import { cytoscapeStylesheet, getCytoscapeLayout } from '../utils/cytoscapeUtils';

        export let nodes: BaseNodeData[] = $state([]); // Receive as reactive state
        export let edges: EdgeData[] = $state([]);   // Receive as reactive state

        export let onNodeClick: (nodeId: string) => void = () => {};
        export let onEdgeClick: (edgeId: string) => void = () => {};
        export let onCanvasClick: () => void = () => {};
        export let onNodeRightClick: (nodeId: string, position: Position) => void = () => {};
        // Example: for drag-and-drop interactions
        export let onNodeDrop: (draggedNodeId: string, targetNodeId: string | null) => void = () => {};


        let cy: Core | undefined;
        let cyContainer: HTMLDivElement;

        onMount(() => {
            cy = cytoscape({
                container: cyContainer,
                elements: [], // Initially empty, will be populated by $effect
                style: cytoscapeStylesheet,
                layout: getCytoscapeLayout(),
                // Wheel sensitivity
                wheelSensitivity: 0.2,
                minZoom: 0.2,
                maxZoom: 3
            });

            cy.on('tap', 'node', (event) => {
                const node: NodeSingular = event.target;
                onNodeClick(node.id());
            });

            cy.on('tap', 'edge', (event) => {
                const edge: EdgeSingular = event.target;
                onEdgeClick(edge.id());
            });

            cy.on('tap', (event) => {
                if (event.target === cy) {
                    onCanvasClick();
                }
            });

            cy.on('cxttap', 'node', (event) => { // Right click
                const node: NodeSingular = event.target;
                onNodeRightClick(node.id(), event.position);
            });

            // More complex drag-and-drop interaction:
            // Store the node being dragged
            let draggedNode: NodeSingular | null = null;
            cy.on('grab', 'node', (event) => {
                draggedNode = event.target;
            });
            // On releasing a node, check if it's over another node
            cy.on('free', 'node', (event) => {
                if (draggedNode) {
                    const target = event.target; // The node that was freed
                    const position = target.position();
                    const dropTarget = cy?.nodes().filter(node => {
                        if (node.id() === target.id()) return false; // Don't drop on itself
                        const bb = node.boundingBox();
                        return position.x > bb.x1 && position.x < bb.x2 && position.y > bb.y1 && position.y < bb.y2;
                    }).first();

                    if (dropTarget && dropTarget.isNode()) {
                        onNodeDrop(draggedNode.id(), dropTarget.id());
                    } else {
                        onNodeDrop(draggedNode.id(), null); // Dropped on canvas
                    }
                    draggedNode = null;
                }
            });


            return () => {
                cy?.destroy();
            };
        });

        // Reactive updates to Cytoscape graph using $effect
        $effect(() => {
            if (cy) {
                const currentCyNodes = cy.nodes().map(n => n.id());
                const newNodesData = nodes.filter(n => !currentCyNodes.includes(n.id));
                const nodesToRemove = currentCyNodes.filter(id => !nodes.find(n => n.id === id));

                cy.remove(cy.nodes().filter(n => nodesToRemove.includes(n.id())));
                cy.add(newNodesData.map(n => ({ group: 'nodes', data: n, position: n.position }))); // Assuming position is part of node data or handled by layout

                // Update existing nodes (properties like label, or custom data for styling)
                nodes.forEach(nodeData => {
                    const cyNode = cy.getElementById(nodeData.id);
                    if (cyNode.length > 0) {
                        cyNode.data(nodeData); // Update data, Cytoscape will re-render if style depends on it
                    }
                });

                // Similar logic for edges
                const currentCyEdges = cy.edges().map(e => e.id());
                const newEdgesData = edges.filter(e => !currentCyEdges.includes(e.id));
                const edgesToRemove = currentCyEdges.filter(id => !edges.find(e => e.id === id));

                cy.remove(cy.edges().filter(e => edgesToRemove.includes(e.id())));
                cy.add(newEdgesData.map(e => ({ group: 'edges', data: e })));

                // Optionally re-run layout if many elements changed, or for specific actions
                // if (newNodesData.length > 0 || newEdgesData.length > 0) {
                //     cy.layout(getCytoscapeLayout()).run();
                // }
            }
        });

    </script>

    <div bind:this={cyContainer} class="w-full h-full"></div>
    ```

*   **`InfoPanel.svelte`:**
    *   **Props:** `data: BaseNodeData | null`.
    *   Displays details of the `selectedNodeId` from `uiStore`.
    *   Styled with Tailwind CSS. Use `$derived` to format data if needed.

*   **`ContextMenu.svelte`:**
    *   **Props:** `x: number`, `y: number`, `nodeId: string | null`.
    *   Appears at mouse position on node right-click.
    *   Lists available actions for the `nodeId` (e.g., "Assign Task", "Sell Product").
    *   Actions dispatch calls to `gameStore.dispatchGameAction(...)`.
    *   Styled with Tailwind CSS.

*   **`Hud.svelte`:** ✅ **IMPLEMENTED**
    *   Displays global info: capital, revenue/expenses per tick, personnel/products/tasks counts
    *   Game controls: pause/resume, speed adjustment (0.5x to 5x)
    *   Financial summary: Total Revenue, Total Expenses, Net Profit
    *   **Integrated Shop component** positioned below financial information
    *   Styled with Tailwind CSS for responsive layout

*   **`Shop.svelte`:** ✅ **IMPLEMENTED**
    *   **Stacklands-style purchase interface** with compact 64x64px cards
    *   **7 purchasable items:**
        - Personnel: Junior Developer ($3k), UI/UX Designer ($4k), Marketing Specialist ($3.5k), Senior Developer ($8k)
        - Resources: Cloud Hosting ($1k), Development Tools ($2k)
        - Ideas: Market Research ($5k)
    *   **Features:**
        - Real-time affordability checking with visual feedback
        - Automatic node creation with proper positioning
        - Finance integration (capital deduction)
        - Hover tooltips with item descriptions
        - Compact display (first word only, k-format costs)

---

### 6. Cytoscape.js Integration (`src/utils/cytoscapeUtils.ts`)

*   **Stylesheet:** Define visual appearance of nodes and edges.
    *   Use selectors for different node types (`node[type="Personnel"]`), states (`node:selected`).
    *   Style properties: `background-color`, `shape`, `label`, `width`, `height`, `border-color`, `arrow-scale`, etc.
    *   Can use data mapping for dynamic styles (e.g., node color based on morale).

    ```typescript
    // src/utils/cytoscapeUtils.ts
    import type { Stylesheet, LayoutOptions } from 'cytoscape';

    export const cytoscapeStylesheet: Stylesheet[] = [
        {
            selector: 'node',
            style: {
                'background-color': '#666',
                'label': 'data(label)',
                'width': '60px',
                'height': '60px',
                'text-valign': 'bottom',
                'text-halign': 'center',
                'font-size': '10px',
                'color': '#fff',
                'text-outline-width': 2,
                'text-outline-color': '#333'
            }
        },
        {
            selector: 'node[type="Personnel"]',
            style: { 'background-color': '#3B82F6' /* blue-500 */, 'shape': 'ellipse' }
        },
        {
            selector: 'node[type="Product"]',
            style: { 'background-color': '#10B981' /* green-500 */, 'shape': 'round-rectangle' }
        },
        {
            selector: 'node[type="Task"]',
            style: { 'background-color': '#F59E0B' /* amber-500 */, 'shape': 'diamond' }
        },
        // ... other types
        {
            selector: 'node:selected',
            style: { 'border-width': 3, 'border-color': '#FACC15' /* yellow-400 */ }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier', // or 'straight', 'haystack'
                'label': 'data(label)',
                'font-size': '8px',
                'color': '#fff',
                'text-rotation': 'autorotate',
                'text-margin-y': -10
            }
        },
        {
            selector: 'edge[type="assignment"]',
            style: { 'line-style': 'dashed', 'line-color': '#A78BFA' /* violet-400 */ }
        }
    ];

    export function getCytoscapeLayout(name: string = 'cose'): LayoutOptions {
        // Common layouts: 'grid', 'circle', 'concentric', 'breadthfirst', 'cose' (good for general graphs)
        // 'dagre' (for directed acyclic graphs - might need an extension cytoscape-dagre)
        // 'elk' (powerful, complex - might need an extension cytoscape-elk)
        return {
            name: name,
            padding: 30,
            animate: true,
            animationDuration: 300,
            fit: true,
            // Cose specific options:
            idealEdgeLength: (edge: any) => 100,
            nodeRepulsion: (node: any) => 20000, // Higher means more repulsion
            // For other layouts, check Cytoscape.js documentation
        } as LayoutOptions;
    }
    ```

*   **Layouts:** Choose appropriate layouts (e.g., `cose`, `breadthfirst`, `dagre` for hierarchies - may require extensions). Allow dynamic layout changes.
*   **User Interactions:**
    *   **Node Selection:** Tap a node to display info in `InfoPanel.svelte`.
    *   **Context Menu:** Right-click/long-press a node to show `ContextMenu.svelte` with relevant actions.
    *   **"Stacking" / Combining Nodes:** This is the trickiest part to translate from Stacklands' physical metaphor.
        *   **Option A: Drag & Drop:** Drag one node onto another. `CytoscapeGraph.svelte` emits an `onNodeDrop(draggedNodeId, targetNodeId)` event. `App.svelte` or a controller would then call `gameStore.dispatchGameAction` with a specific action type like `'COMBINE_NODES'` or `'ASSIGN_TASK'`.
        *   **Option B: Action Menu:** Select a node, then its context menu shows actions like "Assign to..." which then prompts for a target node (e.g., by clicking another node or selecting from a list).
        *   **Option C: Dedicated "Action Slots/Zones":** Have static "Action Nodes" (e.g., "Development Bay", "Marketing Desk") and drag resource/personnel nodes to these.
        *   **Recommendation for initial simplicity:** Drag and drop for direct assignments (e.g., `Developer` onto `ProductIdea`) or use the Context Menu for more complex, multi-input actions.
    *   **Panning & Zooming:** Standard Cytoscape features.

---

### 7. Styling with Tailwind CSS 4

*   Tailwind will be used for all non-Cytoscape UI elements: `Hud.svelte`, `InfoPanel.svelte`, `ContextMenu.svelte`, general page layout.
*   Cytoscape has its own styling system. You can try to match Tailwind's color palette and design tokens within Cytoscape's stylesheet for visual consistency (as shown in `cytoscapeUtils.ts` with Tailwind color comments).
*   If Tailwind CSS 4 introduces new features relevant to dynamic class generation or component-like structures, leverage them for Svelte components.
*   Ensure your `tailwind.config.js` is set up correctly for Svelte file parsing.

---

### 8. Event Flow Example: Assigning a Developer to a Product Idea

1.  **User Action:** User drags a `PersonnelNode` (Developer) and drops it onto a `ProductIdeaNode` in `CytoscapeGraph.svelte`.
2.  **Cytoscape Event:** `CytoscapeGraph.svelte` detects the `free` event and determines a drop target. It emits `onNodeDrop('developerId123', 'productId456')`.
3.  **Svelte Parent Handler:** `App.svelte` (or a dedicated controller logic if abstracted) receives this event.
4.  **Dispatch to Store/Engine:** The handler calls `gameStore.dispatchGameAction('ASSIGN_DEVELOPER_TO_PRODUCT', { personnelId: 'developerId123', productId: 'productId456' })`.
5.  **Game Engine Logic:**
    *   `gameEngine.performAction` receives the action.
    *   It validates if the developer can work on the product idea.
    *   If valid:
        *   It might create a new `TaskNode` ("Develop Prototype for Product X").
        *   It updates the `PersonnelNode`'s `assignedToTaskId`.
        *   It creates an `EdgeData` connecting the developer to the task, and the task to the product.
        *   It updates the internal `GameState`.
        *   It emits a `stateChanged` event with the new `GameState`.
6.  **Store Update:** `gameStore.ts` (listening to `gameEngine`) receives the new state and updates its reactive `$state` variables (`nodes`, `edges`).
7.  **UI Reactivity (Svelte 5 + Cytoscape):**
    *   The `$effect` in `CytoscapeGraph.svelte` detects changes in its `nodes` and `edges` props.
    *   It intelligently adds/updates/removes elements in the Cytoscape instance (e.g., new task node, new edges, updated developer node data).
    *   Other components bound to `gameStore` (like `InfoPanel` if the selected node was affected) also update reactively.

---

### 9. Key Development Considerations & Challenges

*   **State Management Complexity:** Keeping `gameEngine` state, `gameStore` Svelte state, and Cytoscape's internal element state in sync requires careful handling. The `$effect` hook in Svelte 5 is crucial here for reactive updates to Cytoscape.
*   **Cytoscape Performance:** For very large graphs (many hundreds/thousands of nodes/edges), performance can degrade. Consider:
    *   Virtualization (only rendering visible elements - Cytoscape has some support).
    *   Simplifying styles.
    *   Batching updates to Cytoscape.
*   **User Experience for Interactions:** Translating Stacklands' simple "stacking" to a graph interface needs thoughtful UX. Drag-and-drop is intuitive but can be finicky. Context menus must be clear.
*   **Balancing Game Mechanics:** This is a game design challenge, independent of tech, but crucial.
*   **Persistence:** Implement saving/loading game state (e.g., to `localStorage` or a backend). Serialize `gameEngine.getState()`.
*   **Modularity:** Keep game logic in `engine` separate from UI concerns in Svelte components.
*   **TypeScript:** Use it rigorously for better maintainability and fewer runtime errors, especially with complex data structures.

---

This detailed document should provide a strong foundation for your development team to start building "ProductGraphTycoon" using Svelte 5, Tailwind CSS 4, and Cytoscape.js. Good luck!