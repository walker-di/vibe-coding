<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, userEvent, within } from 'storybook/test';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import InfoPanel from '../components/InfoPanel.svelte';
  import ContextMenu from '../components/ContextMenu.svelte';
  import Shop from '../components/Shop.svelte';
  import { mockPersonnelData, mockProductData } from './mockData';

  const { Story } = defineMeta({
    title: 'Interactions/User Workflows',
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Interactive stories testing user workflows and component interactions.'
        }
      }
    }
  });
</script>

<!-- Shop Purchase Workflow -->
<Story name="Shop Purchase Workflow">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-white text-xl font-semibold mb-4">Shop Purchase Workflow</h2>
      <div class="bg-gray-800 p-4 rounded mb-4">
        <h3 class="text-white font-semibold mb-2">Test Scenario:</h3>
        <ol class="text-gray-300 text-sm space-y-1">
          <li>1. Check current capital display</li>
          <li>2. Identify affordable items (enabled buttons)</li>
          <li>3. Click on an affordable item to purchase</li>
          <li>4. Verify purchase callback is triggered</li>
          <li>5. Notice visual feedback on hover states</li>
        </ol>
      </div>
      <Shop 
        currentCapital={25000}
        onPurchase={(item) => {
          console.log('Purchased:', item);
          alert(`Purchased: ${item.label} for $${item.cost}`);
        }}
      />
    </div>
  </div>
</Story>

<!-- InfoPanel Navigation -->
<Story name="InfoPanel Navigation">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="max-w-md">
      <h2 class="text-white text-xl font-semibold mb-4">InfoPanel Navigation</h2>
      <div class="bg-gray-800 p-4 rounded mb-4">
        <h3 class="text-white font-semibold mb-2">Test Scenario:</h3>
        <ol class="text-gray-300 text-sm space-y-1">
          <li>1. Panel shows detailed node information</li>
          <li>2. Scroll through different sections</li>
          <li>3. Click the close button (✕)</li>
          <li>4. Verify close callback is triggered</li>
        </ol>
      </div>
    </div>
    <InfoPanel 
      data={mockPersonnelData[0]}
      onClose={() => {
        console.log('InfoPanel closed');
        alert('InfoPanel closed!');
      }}
    />
  </div>
</Story>

<!-- Context Menu Actions -->
<Story name="Context Menu Actions">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="max-w-md">
      <h2 class="text-white text-xl font-semibold mb-4">Context Menu Actions</h2>
      <div class="bg-gray-800 p-4 rounded mb-4">
        <h3 class="text-white font-semibold mb-2">Test Scenario:</h3>
        <ol class="text-gray-300 text-sm space-y-1">
          <li>1. Context menu appears at specified position</li>
          <li>2. Hover over different action items</li>
          <li>3. Click on an action</li>
          <li>4. Verify action callback with correct parameters</li>
          <li>5. Click outside to close menu</li>
        </ol>
      </div>
    </div>
    <ContextMenu 
      isVisible={true}
      position={{ x: 200, y: 200 }}
      nodeData={mockPersonnelData[0]}
      onAction={(action, nodeId) => {
        console.log('Action triggered:', action, 'on node:', nodeId);
        alert(`Action: ${action} on ${nodeId}`);
      }}
      onClose={() => {
        console.log('Context menu closed');
        alert('Context menu closed!');
      }}
    />
  </div>
</Story>

<!-- Graph Interaction Workflow -->
<Story name="Graph Interaction Workflow">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-gray-800 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">Graph Interaction Test</h3>
      <ol class="text-sm space-y-1">
        <li>1. Click on any node</li>
        <li>2. Try dragging nodes around</li>
        <li>3. Right-click on a node</li>
        <li>4. Use mouse wheel to zoom</li>
        <li>5. Drag empty space to pan</li>
        <li>6. Try dropping one node on another</li>
      </ol>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelData, ...mockProductData]}
        edges={[
          {
            id: 'test-edge-1',
            source: mockPersonnelData[0].id,
            target: mockProductData[0].id,
            type: 'assignment',
            label: 'Working on'
          }
        ]}
        layout="cose"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Node clicked:', nodeId, nodeData);
          alert(`Clicked: ${nodeData.label}`);
        }}
        onEdgeClick={(edgeId, edgeData) => {
          console.log('Edge clicked:', edgeId, edgeData);
          alert(`Edge clicked: ${edgeData.label}`);
        }}
        onCanvasClick={() => {
          console.log('Canvas clicked');
          alert('Canvas clicked - selection cleared');
        }}
        onNodeRightClick={(nodeId, position, nodeData) => {
          console.log('Node right-clicked:', nodeId, position, nodeData);
          alert(`Right-clicked: ${nodeData.label} at (${position.x}, ${position.y})`);
        }}
        onNodeDrop={(draggedNodeId, targetNodeId) => {
          console.log('Node dropped:', draggedNodeId, 'on', targetNodeId);
          alert(`Dropped ${draggedNodeId} on ${targetNodeId || 'canvas'}`);
        }}
      />
    </div>
  </div>
</Story>

<!-- Multi-Component Interaction -->
<Story name="Multi-Component Interaction">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="absolute top-4 left-4 z-20 bg-gray-800 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">Multi-Component Test</h3>
      <ol class="text-sm space-y-1">
        <li>1. Click graph node to open InfoPanel</li>
        <li>2. Right-click node for ContextMenu</li>
        <li>3. Test overlapping interactions</li>
        <li>4. Close panels and menus</li>
      </ol>
    </div>
    
    <!-- Graph -->
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockPersonnelData.slice(0, 3)}
        edges={[]}
        layout="circle"
        onNodeClick={(nodeId, nodeData) => {
          // Simulate opening InfoPanel
          console.log('Opening InfoPanel for:', nodeData.label);
        }}
        onNodeRightClick={(nodeId, position, nodeData) => {
          // Simulate opening ContextMenu
          console.log('Opening ContextMenu for:', nodeData.label);
        }}
        onCanvasClick={() => {
          console.log('Canvas clicked - closing all panels');
        }}
        onNodeDrop={(draggedNodeId, targetNodeId) => {
          console.log('Node interaction:', draggedNodeId, targetNodeId);
        }}
      />
    </div>

    <!-- InfoPanel (simulated open state) -->
    <InfoPanel 
      data={mockPersonnelData[0]}
      onClose={() => {
        console.log('InfoPanel closed');
      }}
    />

    <!-- ContextMenu (simulated open state) -->
    <ContextMenu 
      isVisible={true}
      position={{ x: 300, y: 250 }}
      nodeData={mockPersonnelData[1]}
      onAction={(action, nodeId) => {
        console.log('Context action:', action, nodeId);
      }}
      onClose={() => {
        console.log('ContextMenu closed');
      }}
    />
  </div>
</Story>

<!-- Responsive Interaction Test -->
<Story name="Responsive Interaction" parameters={{
  viewport: {
    defaultViewport: 'mobile1'
  }
}}>
  <div class="bg-gray-900 min-h-screen p-2">
    <div class="bg-gray-800 p-3 rounded mb-3">
      <h3 class="text-white font-semibold text-sm mb-2">Mobile Interaction Test</h3>
      <p class="text-gray-300 text-xs">Test touch interactions on mobile devices</p>
    </div>
    
    <div class="h-96 mb-4">
      <CytoscapeGraph 
        nodes={mockPersonnelData.slice(0, 4)}
        edges={[]}
        layout="grid"
        onNodeClick={(nodeId, nodeData) => {
          alert(`Mobile tap: ${nodeData.label}`);
        }}
        onNodeRightClick={(nodeId, position, nodeData) => {
          alert(`Mobile long press: ${nodeData.label}`);
        }}
        onCanvasClick={() => {
          console.log('Mobile canvas tap');
        }}
        onNodeDrop={(draggedNodeId, targetNodeId) => {
          alert(`Mobile drag: ${draggedNodeId} to ${targetNodeId}`);
        }}
      />
    </div>

    <div class="space-y-2">
      <Shop 
        currentCapital={15000}
        onPurchase={(item) => {
          alert(`Mobile purchase: ${item.label}`);
        }}
      />
    </div>
  </div>
</Story>

<!-- Accessibility Test -->
<Story name="Accessibility Test">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="max-w-4xl mx-auto">
      <div class="bg-gray-800 p-4 rounded mb-4">
        <h2 class="text-white text-xl font-semibold mb-2">Accessibility Test</h2>
        <div class="text-gray-300 text-sm space-y-1">
          <p>• Test keyboard navigation (Tab, Enter, Escape)</p>
          <p>• Verify ARIA labels and roles</p>
          <p>• Check color contrast ratios</p>
          <p>• Test screen reader compatibility</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 class="text-white font-semibold mb-2">Shop Component</h3>
          <Shop 
            currentCapital={30000}
            onPurchase={(item) => {
              console.log('Accessible purchase:', item.label);
            }}
          />
        </div>
        
        <div>
          <h3 class="text-white font-semibold mb-2">Graph Component</h3>
          <div class="h-64">
            <CytoscapeGraph 
              nodes={mockPersonnelData.slice(0, 3)}
              edges={[]}
              layout="circle"
              onNodeClick={(nodeId, nodeData) => {
                console.log('Accessible node selection:', nodeData.label);
              }}
              onCanvasClick={() => {
                console.log('Accessible canvas interaction');
              }}
              onNodeRightClick={(nodeId, position, nodeData) => {
                console.log('Accessible context menu:', nodeData.label);
              }}
              onNodeDrop={(draggedNodeId, targetNodeId) => {
                console.log('Accessible drag-drop:', draggedNodeId, targetNodeId);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</Story>
