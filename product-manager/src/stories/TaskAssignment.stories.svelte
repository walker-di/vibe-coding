<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import InfoPanel from '../components/InfoPanel.svelte';
  import { fn } from 'storybook/test';

  // Mock data for task assignment testing
  const mockPersonnelWithSkills = [
    {
      id: 'personnel-frontend',
      type: 'Personnel',
      label: 'Alice Frontend',
      description: 'Frontend specialist with React and Svelte skills',
      cost: 8000,
      salary: 8000,
      skills: ['frontend-development', 'react', 'svelte', 'typescript'],
      efficiency: 1.2,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Senior',
      isAvailable: true,
      assignedToTaskId: null,
      position: { x: 100, y: 100 }
    },
    {
      id: 'personnel-backend',
      type: 'Personnel',
      label: 'Bob Backend',
      description: 'Backend developer with Node.js expertise',
      cost: 7500,
      salary: 7500,
      skills: ['backend-development', 'nodejs', 'databases', 'api-design'],
      efficiency: 1.1,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Mid-level',
      isAvailable: true,
      assignedToTaskId: null,
      position: { x: 200, y: 100 }
    },
    {
      id: 'personnel-designer',
      type: 'Personnel',
      label: 'Carol Designer',
      description: 'UX/UI Designer with prototyping skills',
      cost: 6500,
      salary: 6500,
      skills: ['ui-design', 'ux-research', 'prototyping', 'figma'],
      efficiency: 1.0,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Designer',
      experience: 'Mid-level',
      isAvailable: true,
      assignedToTaskId: null,
      position: { x: 300, y: 100 }
    },
    {
      id: 'personnel-assigned',
      type: 'Personnel',
      label: 'Dave Assigned',
      description: 'Already assigned to another task',
      cost: 7000,
      salary: 7000,
      skills: ['frontend-development', 'backend-development'],
      efficiency: 1.0,
      actionPoints: 2,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Senior',
      isAvailable: false,
      assignedToTaskId: 'task-other',
      position: { x: 400, y: 100 }
    }
  ];

  const mockTasks = [
    {
      id: 'task-frontend',
      type: 'Task',
      label: 'Build User Interface',
      description: 'Create responsive UI components using React',
      cost: 0,
      requiredSkills: ['frontend-development', 'react'],
      assignedPersonnelIds: [],
      progress: 0,
      isCompleted: false,
      estimatedDuration: 240, // 4 hours
      startTime: null,
      remainingTime: null,
      outputs: ['ui-components'],
      parentProductId: 'product-1',
      position: { x: 100, y: 300 }
    },
    {
      id: 'task-backend',
      type: 'Task',
      label: 'API Development',
      description: 'Build REST API with authentication',
      cost: 0,
      requiredSkills: ['backend-development', 'api-design'],
      assignedPersonnelIds: [],
      progress: 0,
      isCompleted: false,
      estimatedDuration: 360, // 6 hours
      startTime: null,
      remainingTime: null,
      outputs: ['api-endpoints'],
      parentProductId: 'product-1',
      position: { x: 300, y: 300 }
    },
    {
      id: 'task-design',
      type: 'Task',
      label: 'User Experience Design',
      description: 'Design user flows and wireframes',
      cost: 0,
      requiredSkills: ['ui-design', 'ux-research'],
      assignedPersonnelIds: [],
      progress: 0,
      isCompleted: false,
      estimatedDuration: 180, // 3 hours
      startTime: null,
      remainingTime: null,
      outputs: ['design-mockups'],
      parentProductId: 'product-1',
      position: { x: 500, y: 300 }
    },
    {
      id: 'task-assigned',
      type: 'Task',
      label: 'Database Setup',
      description: 'Configure database and migrations',
      cost: 0,
      requiredSkills: ['backend-development', 'databases'],
      assignedPersonnelIds: ['personnel-backend'],
      progress: 45,
      isCompleted: false,
      estimatedDuration: 120,
      startTime: Date.now() - 54000, // Started 54 minutes ago
      remainingTime: 66000, // 66 minutes remaining
      outputs: ['database-schema'],
      parentProductId: 'product-1',
      position: { x: 200, y: 450 }
    },
    {
      id: 'task-no-skills',
      type: 'Task',
      label: 'Machine Learning Model',
      description: 'Develop AI/ML algorithms',
      cost: 0,
      requiredSkills: ['machine-learning', 'python', 'data-science'],
      assignedPersonnelIds: [],
      progress: 0,
      isCompleted: false,
      estimatedDuration: 480, // 8 hours
      startTime: null,
      remainingTime: null,
      outputs: ['ml-model'],
      parentProductId: 'product-2',
      position: { x: 400, y: 450 }
    }
  ];

  const { Story } = defineMeta({
    title: 'Game Mechanics/Task Assignment',
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Task assignment system testing - personnel assignment to tasks with skill validation, progress tracking, and visual feedback.'
        }
      }
    }
  });
</script>

<!-- Valid Assignment Scenario -->
<Story name="Valid Assignment">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-green-900 border border-green-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">✅ Valid Assignment Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Alice (Frontend) → UI Task ✅</li>
        <li>• Bob (Backend) → API Task ✅</li>
        <li>• Carol (Designer) → UX Task ✅</li>
        <li>• All personnel have required skills</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelWithSkills.slice(0, 3), ...mockTasks.slice(0, 3)]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId) {
            console.log(`Assignment attempt: ${draggedId} → ${targetId}`);
            alert(`Assignment: ${draggedId} → ${targetId}`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Skill Mismatch Scenario -->
<Story name="Skill Mismatch">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-red-900 border border-red-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">❌ Skill Mismatch Test</h3>
      <ul class="text-sm space-y-1">
        <li>• ML Task requires: machine-learning, python</li>
        <li>• Available personnel lack these skills</li>
        <li>• Assignment should fail with error message</li>
        <li>• Try dropping any personnel on ML task</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelWithSkills.slice(0, 3), mockTasks[4]]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId === 'task-no-skills') {
            console.log(`Skill mismatch: ${draggedId} → ${targetId}`);
            alert(`❌ Skill mismatch! Personnel lacks required skills: machine-learning, python, data-science`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Already Assigned Personnel -->
<Story name="Already Assigned">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-yellow-900 border border-yellow-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">⚠️ Already Assigned Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Dave is already assigned to another task</li>
        <li>• Should prevent reassignment</li>
        <li>• Must unassign first before new assignment</li>
        <li>• Try dropping Dave on any task</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockPersonnelWithSkills[3], ...mockTasks.slice(0, 2)]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (draggedId === 'personnel-assigned') {
            console.log(`Already assigned: ${draggedId} → ${targetId}`);
            alert(`❌ Personnel is already assigned to another task. Unassign first.`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Task Progress Visualization -->
<Story name="Task Progress">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-blue-900 border border-blue-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📊 Task Progress Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Database task: 45% complete</li>
        <li>• Bob assigned and working</li>
        <li>• Progress bar and timer visible</li>
        <li>• Click task to see detailed progress</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockPersonnelWithSkills[1], mockTasks[3]]}
        edges={[{
          id: 'assignment-edge',
          source: 'personnel-backend',
          target: 'task-assigned',
          type: 'assignment',
          label: 'Working on'
        }]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeId === 'task-assigned') {
            console.log('Task progress details:', nodeData);
            alert(`Task Progress: ${nodeData.progress}% complete\nRemaining: ${Math.round(nodeData.remainingTime / 60000)} minutes`);
          }
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Multi-Personnel Assignment -->
<Story name="Multi-Personnel Assignment">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-purple-900 border border-purple-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">👥 Multi-Personnel Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Complex task requiring multiple skills</li>
        <li>• Can assign multiple personnel</li>
        <li>• Personnel positioned around task</li>
        <li>• Collaborative work simulation</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[
          ...mockPersonnelWithSkills.slice(0, 3),
          {
            id: 'task-complex',
            type: 'Task',
            label: 'Full-Stack Development',
            description: 'Complete web application with frontend, backend, and design',
            cost: 0,
            requiredSkills: ['frontend-development', 'backend-development', 'ui-design'],
            assignedPersonnelIds: ['personnel-frontend', 'personnel-backend'],
            progress: 25,
            isCompleted: false,
            estimatedDuration: 720, // 12 hours
            startTime: Date.now() - 180000, // Started 3 hours ago
            remainingTime: 540000, // 9 hours remaining
            outputs: ['full-stack-app'],
            parentProductId: 'product-1',
            position: { x: 300, y: 300 }
          }
        ]}
        edges={[
          {
            id: 'edge-1',
            source: 'personnel-frontend',
            target: 'task-complex',
            type: 'assignment',
            label: 'Frontend work'
          },
          {
            id: 'edge-2',
            source: 'personnel-backend',
            target: 'task-complex',
            type: 'assignment',
            label: 'Backend work'
          }
        ]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId === 'task-complex' && draggedId === 'personnel-designer') {
            console.log(`Adding designer to complex task: ${draggedId} → ${targetId}`);
            alert(`✅ Designer added to full-stack team! Now handling UI/UX aspects.`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Assignment with InfoPanel -->
<Story name="Assignment with InfoPanel">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="absolute top-4 left-4 z-20 bg-gray-800 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📋 Assignment + InfoPanel</h3>
      <ul class="text-sm space-y-1">
        <li>• Click personnel to see skills</li>
        <li>• Click task to see requirements</li>
        <li>• Drag and drop to assign</li>
        <li>• InfoPanel shows assignment status</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelWithSkills.slice(0, 2), ...mockTasks.slice(0, 2)]}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Node selected for InfoPanel:', nodeData);
        }}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId && targetId.startsWith('task-')) {
            console.log(`Assignment with InfoPanel: ${draggedId} → ${targetId}`);
            alert(`Assignment successful! Check InfoPanel for updated status.`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
    <InfoPanel 
      data={mockPersonnelWithSkills[0]}
      onClose={() => console.log('InfoPanel closed')}
    />
  </div>
</Story>
