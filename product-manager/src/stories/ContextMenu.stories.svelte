<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ContextMenu from '../components/ContextMenu.svelte';
  import { mockPersonnelData, mockProductData, mockTaskData } from './mockData';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Components/ContextMenu',
    component: ContextMenu,
    tags: ['autodocs'],
    parameters: {
      layout: 'centered',
      docs: {
        description: {
          component: 'ContextMenu provides right-click actions for different node types. Shows available actions based on node type and current state.'
        }
      }
    },
    argTypes: {
      isVisible: {
        control: { type: 'boolean' },
        description: 'Whether the context menu is visible'
      },
      position: {
        control: { type: 'object' },
        description: 'Position of the context menu (x, y coordinates)'
      },
      nodeData: {
        control: { type: 'object' },
        description: 'Data of the node the context menu is for'
      },
      onAction: {
        action: 'action',
        description: 'Callback when an action is selected'
      },
      onClose: {
        action: 'close',
        description: 'Callback when the menu is closed'
      }
    },
    args: {
      isVisible: true,
      position: { x: 200, y: 150 },
      nodeData: mockPersonnelData[0],
      onAction: fn(),
      onClose: fn()
    }
  });
</script>

<!-- Personnel Context Menu -->
<Story name="Personnel Menu" args={{
  isVisible: true,
  position: { x: 200, y: 150 },
  nodeData: mockPersonnelData[0],
  onAction: fn(),
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Personnel Context Menu</h3>
      <p class="text-gray-400">Right-click menu for available personnel</p>
    </div>
    <ContextMenu 
      isVisible={true}
      position={{ x: 200, y: 150 }}
      nodeData={mockPersonnelData[0]}
      onAction={fn()}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Personnel - Busy -->
<Story name="Personnel - Busy" args={{
  isVisible: true,
  position: { x: 250, y: 200 },
  nodeData: mockPersonnelData[1],
  onAction: fn(),
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Busy Personnel Context Menu</h3>
      <p class="text-gray-400">Menu for personnel currently assigned to tasks</p>
    </div>
    <ContextMenu 
      isVisible={true}
      position={{ x: 250, y: 200 }}
      nodeData={mockPersonnelData[1]}
      onAction={fn()}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Product Context Menu -->
<Story name="Product Menu" args={{
  isVisible: true,
  position: { x: 180, y: 120 },
  nodeData: mockProductData[0],
  onAction: fn(),
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Product Context Menu</h3>
      <p class="text-gray-400">Right-click menu for completed products</p>
    </div>
    <ContextMenu 
      isVisible={true}
      position={{ x: 180, y: 120 }}
      nodeData={mockProductData[0]}
      onAction={fn()}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Task Context Menu -->
<Story name="Task Menu" args={{
  isVisible: true,
  position: { x: 300, y: 180 },
  nodeData: mockTaskData[0],
  onAction: fn(),
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Task Context Menu</h3>
      <p class="text-gray-400">Right-click menu for active tasks</p>
    </div>
    <ContextMenu 
      isVisible={true}
      position={{ x: 300, y: 180 }}
      nodeData={mockTaskData[0]}
      onAction={fn()}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Hidden Menu -->
<Story name="Hidden" args={{
  isVisible: false,
  position: { x: 200, y: 150 },
  nodeData: mockPersonnelData[0],
  onAction: fn(),
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Hidden Context Menu</h3>
      <p class="text-gray-400">Menu is not visible (isVisible = false)</p>
    </div>
    <ContextMenu 
      isVisible={false}
      position={{ x: 200, y: 150 }}
      nodeData={mockPersonnelData[0]}
      onAction={fn()}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Different Positions -->
<Story name="Different Positions">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Multiple Context Menus</h3>
      <p class="text-gray-400">Showing menus at different positions</p>
    </div>
    
    <!-- Top-left -->
    <ContextMenu 
      isVisible={true}
      position={{ x: 50, y: 100 }}
      nodeData={mockPersonnelData[0]}
      onAction={fn()}
      onClose={fn()}
    />
    
    <!-- Center -->
    <ContextMenu 
      isVisible={true}
      position={{ x: 300, y: 250 }}
      nodeData={mockProductData[0]}
      onAction={fn()}
      onClose={fn()}
    />
    
    <!-- Bottom-right -->
    <ContextMenu 
      isVisible={true}
      position={{ x: 500, y: 400 }}
      nodeData={mockTaskData[0]}
      onAction={fn()}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Interactive -->
<Story name="Interactive" let:args>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="text-white mb-4">
      <h3 class="text-lg font-semibold">Interactive Context Menu</h3>
      <p class="text-gray-400">Use controls to modify menu properties</p>
    </div>
    <ContextMenu 
      isVisible={args.isVisible}
      position={args.position}
      nodeData={args.nodeData}
      onAction={args.onAction}
      onClose={args.onClose}
    />
  </div>
</Story>
