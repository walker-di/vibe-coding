<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import { mockGameState, mockPersonnelData, mockProductData, mockTaskData, mockEdgeData, generateRandomPersonnel } from './mockData';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Components/CytoscapeGraph',
    component: CytoscapeGraph,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'CytoscapeGraph is the main game visualization component using Cytoscape.js. Displays nodes and edges with interactive features like drag-and-drop, zoom, and pan.'
        }
      }
    },
    argTypes: {
      nodes: {
        control: { type: 'object' },
        description: 'Array of node data to display'
      },
      edges: {
        control: { type: 'object' },
        description: 'Array of edge data to display'
      },
      layout: {
        control: { type: 'select' },
        options: ['cose', 'grid', 'circle', 'breadthfirst', 'concentric'],
        description: 'Layout algorithm for positioning nodes'
      },
      onNodeClick: {
        action: 'nodeClick',
        description: 'Callback when a node is clicked'
      },
      onEdgeClick: {
        action: 'edgeClick',
        description: 'Callback when an edge is clicked'
      },
      onCanvasClick: {
        action: 'canvasClick',
        description: 'Callback when empty canvas is clicked'
      },
      onNodeRightClick: {
        action: 'nodeRightClick',
        description: 'Callback when a node is right-clicked'
      },
      onNodeDrop: {
        action: 'nodeDrop',
        description: 'Callback when a node is dropped on another'
      }
    },
    args: {
      nodes: mockGameState.nodes.slice(0, 6), // Smaller subset for default
      edges: mockGameState.edges.slice(0, 3),
      layout: 'cose',
      onNodeClick: fn(),
      onEdgeClick: fn(),
      onCanvasClick: fn(),
      onNodeRightClick: fn(),
      onNodeDrop: fn()
    }
  });
</script>

<!-- Default Graph -->
<Story name="Default">
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockGameState.nodes.slice(0, 6)}
        edges={mockGameState.edges.slice(0, 3)}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Empty Graph -->
<Story name="Empty Graph" args={{
  nodes: [],
  edges: [],
  layout: 'cose'
}}>
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[]}
        edges={[]}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Personnel Only -->
<Story name="Personnel Only" args={{
  nodes: mockPersonnelData,
  edges: [],
  layout: 'circle'
}}>
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockPersonnelData}
        edges={[]}
        layout="circle"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Complex Network -->
<Story name="Complex Network" args={{
  nodes: mockGameState.nodes,
  edges: mockGameState.edges,
  layout: 'cose'
}}>
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockGameState.nodes}
        edges={mockGameState.edges}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Grid Layout -->
<Story name="Grid Layout" args={{
  nodes: mockGameState.nodes.slice(0, 9),
  edges: [],
  layout: 'grid'
}}>
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockGameState.nodes.slice(0, 9)}
        edges={[]}
        layout="grid"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Breadthfirst Layout -->
<Story name="Breadthfirst Layout" args={{
  nodes: mockGameState.nodes.slice(0, 8),
  edges: mockGameState.edges,
  layout: 'breadthfirst'
}}>
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockGameState.nodes.slice(0, 8)}
        edges={mockGameState.edges}
        layout="breadthfirst"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Large Network (Performance Test) -->
<Story name="Large Network" args={{
  nodes: [...mockGameState.nodes, ...generateRandomPersonnel(20)],
  edges: mockGameState.edges,
  layout: 'cose'
}}>
  <div class="bg-gray-900 h-screen p-4">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockGameState.nodes, ...generateRandomPersonnel(20)]}
        edges={mockGameState.edges}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>

<!-- Interactive -->
<Story name="Interactive" let:args>
  <div class="bg-gray-900 h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-gray-800 p-4 rounded text-white text-sm max-w-xs">
      <h4 class="font-semibold mb-2">Graph Interactions</h4>
      <ul class="space-y-1 text-xs">
        <li>• Click nodes to select</li>
        <li>• Right-click for context menu</li>
        <li>• Drag nodes to move</li>
        <li>• Mouse wheel to zoom</li>
        <li>• Drag canvas to pan</li>
        <li>• Drop nodes on each other</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={args.nodes}
        edges={args.edges}
        layout={args.layout}
        onNodeClick={args.onNodeClick}
        onEdgeClick={args.onEdgeClick}
        onCanvasClick={args.onCanvasClick}
        onNodeRightClick={args.onNodeRightClick}
        onNodeDrop={args.onNodeDrop}
      />
    </div>
  </div>
</Story>

<!-- Mobile View -->
<Story name="Mobile View" parameters={{
  viewport: {
    defaultViewport: 'mobile1'
  }
}}>
  <div class="bg-gray-900 h-screen p-2">
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockGameState.nodes.slice(0, 5)}
        edges={mockGameState.edges.slice(0, 2)}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
    </div>
  </div>
</Story>
