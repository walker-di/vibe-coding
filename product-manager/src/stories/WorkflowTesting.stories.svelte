<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import { mockPersonnelData, mockTaskData, mockCourseData } from './mockData';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Mechanics/Workflow Testing',
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Simplified workflow testing for assignment tasks, courses, and investor systems.'
        }
      }
    }
  });
</script>

<!-- Assignment Workflow Test -->
<Story name="Assignment Workflow">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-blue-900 border border-blue-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📋 Assignment Workflow Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Drag personnel onto tasks</li>
        <li>• Check skill requirements</li>
        <li>• Validate assignment logic</li>
        <li>• Monitor progress updates</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelData.slice(0, 2), ...mockTaskData.slice(0, 2)]}
        edges={[]}
        layout="grid"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Assignment test - node clicked:', nodeId, nodeData);
          alert(`Node: ${nodeData.label}\nType: ${nodeData.type}\nClick to see details`);
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log('Assignment test - drop:', draggedId, 'onto', targetId);
          if (targetId && targetId.startsWith('task-')) {
            alert(`Assignment Test: ${draggedId} → ${targetId}\nValidating skills and availability...`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Course Training Workflow Test -->
<Story name="Course Training Workflow">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-green-900 border border-green-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🎓 Course Training Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Enroll personnel in courses</li>
        <li>• Track individual progress</li>
        <li>• Monitor skill improvements</li>
        <li>• Test capacity limits</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelData.slice(0, 3), ...mockCourseData.slice(0, 2)]}
        edges={[]}
        layout="grid"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Course test - node clicked:', nodeId, nodeData);
          alert(`Node: ${nodeData.label}\nType: ${nodeData.type}\nClick to see course details`);
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log('Course test - drop:', draggedId, 'onto', targetId);
          if (targetId && targetId.startsWith('course-')) {
            alert(`Course Enrollment Test: ${draggedId} → ${targetId}\nChecking prerequisites and capacity...`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Skill Development Pipeline -->
<Story name="Skill Development Pipeline">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-purple-900 border border-purple-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📈 Skill Development Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Junior personnel training</li>
        <li>• Skill acquisition process</li>
        <li>• Efficiency improvements</li>
        <li>• Task assignment readiness</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[
          {
            id: 'junior-dev-test',
            type: 'Personnel',
            label: 'Junior Developer',
            description: 'Learning new skills through training',
            cost: 5000,
            position: { x: 100, y: 100 }
          },
          {
            id: 'react-course-test',
            type: 'Course',
            label: 'React Training',
            description: 'Frontend development course',
            cost: 2000,
            position: { x: 300, y: 100 }
          },
          {
            id: 'frontend-task-test',
            type: 'Task',
            label: 'Frontend Development',
            description: 'Build user interface',
            cost: 0,
            position: { x: 500, y: 100 }
          }
        ]}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Skill development test - node clicked:', nodeId);
          if (nodeId === 'junior-dev-test') {
            alert('Junior Developer\n• Current skills: basic-programming\n• Training: React course\n• Goal: Frontend development capability');
          } else if (nodeId === 'react-course-test') {
            alert('React Training Course\n• Duration: 5 minutes\n• Skills gained: react, frontend-development\n• Efficiency boost: +0.2');
          } else if (nodeId === 'frontend-task-test') {
            alert('Frontend Task\n• Requires: react, frontend-development\n• Available after training\n• Estimated duration: 4 hours');
          }
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log('Skill development test - drop:', draggedId, 'onto', targetId);
          if (draggedId === 'junior-dev-test' && targetId === 'react-course-test') {
            alert('✅ Junior developer enrolled in React course!\nTraining will improve skills and efficiency.');
          } else if (draggedId === 'junior-dev-test' && targetId === 'frontend-task-test') {
            alert('❌ Junior developer needs React training first!\nComplete course to unlock frontend tasks.');
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Multi-System Integration Test -->
<Story name="Multi-System Integration">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-yellow-900 border border-yellow-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🔄 Integration Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Training → Skills → Tasks</li>
        <li>• Personnel development flow</li>
        <li>• Cross-system dependencies</li>
        <li>• Workflow validation</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[
          {
            id: 'ceo-test',
            type: 'Personnel',
            label: 'CEO',
            description: 'Company leader with business skills',
            cost: 0,
            position: { x: 100, y: 100 }
          },
          {
            id: 'dev-test',
            type: 'Personnel',
            label: 'Developer',
            description: 'Technical team member',
            cost: 8000,
            position: { x: 300, y: 100 }
          },
          {
            id: 'pitch-task-test',
            type: 'Task',
            label: 'Create Pitch',
            description: 'Develop investor presentation',
            cost: 0,
            position: { x: 100, y: 300 }
          },
          {
            id: 'dev-task-test',
            type: 'Task',
            label: 'Build Product',
            description: 'Develop software product',
            cost: 0,
            position: { x: 300, y: 300 }
          }
        ]}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Integration test - node clicked:', nodeId);
          alert(`Integration Test\nNode: ${nodeData.label}\nType: ${nodeData.type}\nTest different workflows`);
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log('Integration test - drop:', draggedId, 'onto', targetId);
          
          if (draggedId === 'ceo-test' && targetId === 'pitch-task-test') {
            alert('🎯 CEO → Pitch Creation\n✅ Valid assignment\n• CEO has business skills\n• Can create high-quality pitches');
          } else if (draggedId === 'dev-test' && targetId === 'dev-task-test') {
            alert('💻 Developer → Product Development\n✅ Valid assignment\n• Developer has technical skills\n• Can build software products');
          } else if (draggedId === 'dev-test' && targetId === 'pitch-task-test') {
            alert('❌ Developer → Pitch Creation\n• Developer lacks business skills\n• Cannot create investor pitches');
          } else if (draggedId === 'ceo-test' && targetId === 'dev-task-test') {
            alert('❌ CEO → Product Development\n• CEO lacks technical skills\n• Cannot develop software products');
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Error Handling Test -->
<Story name="Error Handling">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-red-900 border border-red-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🚨 Error Handling Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Invalid assignments</li>
        <li>• Skill mismatches</li>
        <li>• Capacity limits</li>
        <li>• Conflict resolution</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[
          {
            id: 'busy-personnel',
            type: 'Personnel',
            label: 'Busy Personnel',
            description: 'Already assigned to another task',
            cost: 7000,
            position: { x: 100, y: 100 }
          },
          {
            id: 'no-skills-personnel',
            type: 'Personnel',
            label: 'No Skills Personnel',
            description: 'Lacks required skills',
            cost: 4000,
            position: { x: 300, y: 100 }
          },
          {
            id: 'complex-task',
            type: 'Task',
            label: 'Complex Task',
            description: 'Requires specific skills',
            cost: 0,
            position: { x: 200, y: 300 }
          },
          {
            id: 'full-course',
            type: 'Course',
            label: 'Full Course',
            description: 'At maximum capacity',
            cost: 3000,
            position: { x: 400, y: 300 }
          }
        ]}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Error handling test - node clicked:', nodeId);
          alert(`Error Test Node: ${nodeData.label}\nTest various error scenarios`);
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log('Error handling test - drop:', draggedId, 'onto', targetId);
          
          if (draggedId === 'busy-personnel') {
            alert('❌ Assignment Error\n• Personnel is already assigned\n• Must unassign from current task first\n• Cannot work on multiple tasks simultaneously');
          } else if (draggedId === 'no-skills-personnel' && targetId === 'complex-task') {
            alert('❌ Skill Mismatch Error\n• Personnel lacks required skills\n• Task requires: advanced-programming, system-design\n• Personnel has: basic-skills only');
          } else if (targetId === 'full-course') {
            alert('❌ Capacity Error\n• Course is at maximum capacity\n• Current enrollment: 5/5\n• Cannot accept more participants');
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Performance Test -->
<Story name="Performance Test">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-indigo-900 border border-indigo-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">⚡ Performance Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Large number of nodes</li>
        <li>• Complex interactions</li>
        <li>• Real-time updates</li>
        <li>• Memory efficiency</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[
          ...mockPersonnelData,
          ...mockTaskData,
          ...mockCourseData
        ]}
        edges={[]}
        layout="cose"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Performance test - node clicked:', nodeId);
          const startTime = performance.now();
          alert(`Performance Test\nNode: ${nodeData.label}\nClick time: ${startTime.toFixed(2)}ms`);
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log('Performance test - drop:', draggedId, 'onto', targetId);
          const startTime = performance.now();
          alert(`Performance Test\nDrop operation: ${draggedId} → ${targetId}\nProcessing time: ${startTime.toFixed(2)}ms`);
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>
