<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import InfoPanel from '../components/InfoPanel.svelte';
  import { mockPersonnelData, mockProductData, mockTaskData, mockCourseData, mockResourceData, mockIdeaData } from './mockData';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Components/InfoPanel',
    component: InfoPanel,
    tags: ['autodocs'],
    parameters: {
      layout: 'centered',
      docs: {
        description: {
          component: 'InfoPanel displays detailed information about selected game nodes including personnel, products, tasks, courses, resources, and ideas.'
        }
      }
    },
    argTypes: {
      data: {
        control: { type: 'object' },
        description: 'Node data to display in the panel'
      },
      onClose: {
        action: 'close',
        description: 'Callback when the panel is closed'
      }
    },
    args: {
      data: mockPersonnelData[0],
      onClose: fn()
    }
  });
</script>

<!-- Personnel - Available -->
<Story name="Personnel - Available" args={{
  data: mockPersonnelData[0],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockPersonnelData[0]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Personnel - Busy with Task -->
<Story name="Personnel - Busy" args={{
  data: mockPersonnelData[1],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockPersonnelData[1]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Personnel - In Course -->
<Story name="Personnel - In Course" args={{
  data: mockPersonnelData[2],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockPersonnelData[2]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Product - Completed -->
<Story name="Product - Completed" args={{
  data: mockProductData[0],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockProductData[0]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Product - In Development -->
<Story name="Product - In Development" args={{
  data: mockProductData[1],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockProductData[1]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Task - In Progress -->
<Story name="Task - In Progress" args={{
  data: mockTaskData[0],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockTaskData[0]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Task - Not Started -->
<Story name="Task - Not Started" args={{
  data: mockTaskData[1],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockTaskData[1]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Course - Active -->
<Story name="Course - Active" args={{
  data: mockCourseData[0],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockCourseData[0]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Course - Inactive -->
<Story name="Course - Inactive" args={{
  data: mockCourseData[1],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockCourseData[1]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Resource -->
<Story name="Resource" args={{
  data: mockResourceData[0],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockResourceData[0]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- Idea -->
<Story name="Idea" args={{
  data: mockIdeaData[0],
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={mockIdeaData[0]}
      onClose={fn()}
    />
  </div>
</Story>

<!-- No Data -->
<Story name="No Data" args={{
  data: null,
  onClose: fn()
}}>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={null}
      onClose={fn()}
    />
    <div class="text-white text-center mt-8">
      No data provided - InfoPanel should not render
    </div>
  </div>
</Story>

<!-- Interactive -->
<Story name="Interactive" let:args>
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <InfoPanel 
      data={args.data}
      onClose={args.onClose}
    />
    <div class="absolute top-4 left-4 bg-gray-800 p-4 rounded text-white text-sm max-w-xs">
      <h4 class="font-semibold mb-2">Controls</h4>
      <p>Use the controls panel to switch between different node types and see how the InfoPanel adapts.</p>
    </div>
  </div>
</Story>
