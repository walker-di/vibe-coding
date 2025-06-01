<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import CourseModalSimple from '../components/CourseModalSimple.svelte';
  import InfoPanel from '../components/InfoPanel.svelte';
  import { fn } from 'storybook/test';

  // Mock personnel for course testing
  const mockPersonnelForCourses = [
    {
      id: 'personnel-junior',
      type: 'Personnel',
      label: 'Emma Junior',
      description: 'Junior developer looking to improve skills',
      cost: 5000,
      salary: 5000,
      skills: ['basic-programming'],
      efficiency: 0.8,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Junior',
      isAvailable: true,
      currentCourseId: null,
      courseProgress: null,
      courseStartTime: null,
      position: { x: 100, y: 100 }
    },
    {
      id: 'personnel-mid',
      type: 'Personnel',
      label: 'Frank Mid-level',
      description: 'Mid-level developer wanting to specialize',
      cost: 7000,
      salary: 7000,
      skills: ['frontend-development', 'javascript'],
      efficiency: 1.0,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Mid-level',
      isAvailable: true,
      currentCourseId: null,
      courseProgress: null,
      courseStartTime: null,
      position: { x: 200, y: 100 }
    },
    {
      id: 'personnel-in-course',
      type: 'Personnel',
      label: 'Grace Learning',
      description: 'Currently enrolled in React course',
      cost: 6500,
      salary: 6500,
      skills: ['frontend-development'],
      efficiency: 0.9,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Mid-level',
      isAvailable: false,
      currentCourseId: 'course-react',
      courseProgress: 65,
      courseStartTime: Date.now() - 195000, // Started 3.25 minutes ago
      position: { x: 300, y: 100 }
    },
    {
      id: 'personnel-completed',
      type: 'Personnel',
      label: 'Henry Skilled',
      description: 'Completed multiple courses, high efficiency',
      cost: 9000,
      salary: 9000,
      skills: ['frontend-development', 'react', 'typescript', 'performance-optimization'],
      efficiency: 1.4,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Senior',
      isAvailable: true,
      currentCourseId: null,
      courseProgress: null,
      courseStartTime: null,
      position: { x: 400, y: 100 }
    }
  ];

  // Mock courses with different states
  const mockCourses = [
    {
      id: 'course-react',
      type: 'Course',
      label: 'Advanced React Development',
      description: 'Master advanced React patterns and hooks',
      courseTemplateId: 'react-advanced',
      skillsImproved: ['react', 'frontend-development', 'performance-optimization'],
      efficiencyBoost: 0.2,
      duration: 300, // 5 minutes for demo
      cost: 2500,
      category: 'technical',
      maxParticipants: 5,
      enrolledPersonnelIds: ['personnel-in-course'],
      personnelProgress: {
        'personnel-in-course': {
          startTime: Date.now() - 195000, // Started 3.25 minutes ago
          remainingTime: 105000 // 1.75 minutes remaining
        }
      },
      isActive: true,
      isCompleted: false,
      position: { x: 300, y: 300 }
    },
    {
      id: 'course-typescript',
      type: 'Course',
      label: 'TypeScript Fundamentals',
      description: 'Learn TypeScript for better code quality',
      courseTemplateId: 'typescript-basics',
      skillsImproved: ['typescript', 'frontend-development'],
      efficiencyBoost: 0.15,
      duration: 240, // 4 minutes for demo
      cost: 2000,
      category: 'technical',
      maxParticipants: 8,
      enrolledPersonnelIds: [],
      personnelProgress: {},
      isActive: false,
      isCompleted: false,
      position: { x: 500, y: 300 }
    },
    {
      id: 'course-ux',
      type: 'Course',
      label: 'UX Research Methods',
      description: 'Learn user research and testing methodologies',
      courseTemplateId: 'ux-research',
      skillsImproved: ['ux-research', 'user-testing', 'data-analysis'],
      efficiencyBoost: 0.1,
      duration: 180, // 3 minutes for demo
      cost: 1800,
      category: 'design',
      maxParticipants: 6,
      enrolledPersonnelIds: ['personnel-junior', 'personnel-mid'],
      personnelProgress: {
        'personnel-junior': {
          startTime: Date.now() - 60000, // Started 1 minute ago
          remainingTime: 120000 // 2 minutes remaining
        },
        'personnel-mid': {
          startTime: Date.now() - 90000, // Started 1.5 minutes ago
          remainingTime: 90000 // 1.5 minutes remaining
        }
      },
      isActive: true,
      isCompleted: false,
      position: { x: 100, y: 450 }
    },
    {
      id: 'course-completed',
      type: 'Course',
      label: 'JavaScript Mastery',
      description: 'Advanced JavaScript concepts and patterns',
      courseTemplateId: 'javascript-advanced',
      skillsImproved: ['javascript', 'frontend-development'],
      efficiencyBoost: 0.2,
      duration: 300,
      cost: 2200,
      category: 'technical',
      maxParticipants: 10,
      enrolledPersonnelIds: [],
      personnelProgress: {},
      isActive: false,
      isCompleted: true,
      position: { x: 300, y: 450 }
    },
    {
      id: 'course-full',
      type: 'Course',
      label: 'Leadership Skills',
      description: 'Develop management and leadership abilities',
      courseTemplateId: 'leadership-basics',
      skillsImproved: ['leadership', 'team-management', 'communication'],
      efficiencyBoost: 0.25,
      duration: 360, // 6 minutes for demo
      cost: 3000,
      category: 'management',
      maxParticipants: 3,
      enrolledPersonnelIds: ['personnel-1', 'personnel-2', 'personnel-3'],
      personnelProgress: {
        'personnel-1': { startTime: Date.now() - 120000, remainingTime: 240000 },
        'personnel-2': { startTime: Date.now() - 120000, remainingTime: 240000 },
        'personnel-3': { startTime: Date.now() - 120000, remainingTime: 240000 }
      },
      isActive: true,
      isCompleted: false,
      position: { x: 500, y: 450 }
    }
  ];

  const { Story } = defineMeta({
    title: 'Game Mechanics/Course System',
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Course training system testing - personnel enrollment, individual progress tracking, skill improvement, and efficiency boosts.'
        }
      }
    }
  });
</script>

<!-- Course Enrollment -->
<Story name="Course Enrollment">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-blue-900 border border-blue-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📚 Course Enrollment Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Drag personnel onto available courses</li>
        <li>• TypeScript course: 0/8 enrolled</li>
        <li>• Check skill prerequisites</li>
        <li>• Enrollment creates individual progress</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelForCourses.slice(0, 2), mockCourses[1]]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId === 'course-typescript' && draggedId.startsWith('personnel-')) {
            console.log(`Course enrollment: ${draggedId} → ${targetId}`);
            alert(`✅ Personnel enrolled in TypeScript course! Individual progress tracking started.`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Active Course Progress -->
<Story name="Active Course Progress">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-green-900 border border-green-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">⏱️ Active Course Progress</h3>
      <ul class="text-sm space-y-1">
        <li>• Grace: 65% complete in React course</li>
        <li>• Individual timer: 1.75 min remaining</li>
        <li>• Real-time progress updates</li>
        <li>• Click course to see all participants</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockPersonnelForCourses[2], mockCourses[0]]}
        edges={[{
          id: 'course-edge',
          source: 'personnel-in-course',
          target: 'course-react',
          type: 'enrollment',
          label: 'Learning (65%)'
        }]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeId === 'course-react') {
            console.log('Course progress details:', nodeData);
            alert(`React Course Progress:\n• Grace: 65% complete\n• Remaining: 1.75 minutes\n• Skills: react, frontend-development, performance-optimization`);
          }
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Multi-Personnel Course -->
<Story name="Multi-Personnel Course">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-purple-900 border border-purple-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">👥 Multi-Personnel Course</h3>
      <ul class="text-sm space-y-1">
        <li>• UX Research: 2/6 enrolled</li>
        <li>• Emma: 2 min remaining</li>
        <li>• Frank: 1.5 min remaining</li>
        <li>• Individual progress tracking</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelForCourses.slice(0, 2), mockCourses[2]]}
        edges={[
          {
            id: 'course-edge-1',
            source: 'personnel-junior',
            target: 'course-ux',
            type: 'enrollment',
            label: 'Learning (33%)'
          },
          {
            id: 'course-edge-2',
            source: 'personnel-mid',
            target: 'course-ux',
            type: 'enrollment',
            label: 'Learning (50%)'
          }
        ]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeId === 'course-ux') {
            console.log('Multi-personnel course details:', nodeData);
            alert(`UX Research Course:\n• Emma: 33% (2 min left)\n• Frank: 50% (1.5 min left)\n• Capacity: 2/6 enrolled`);
          }
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Course Capacity Limits -->
<Story name="Course Capacity Limits">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-red-900 border border-red-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🚫 Capacity Limits Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Leadership course: 3/3 FULL</li>
        <li>• Cannot enroll more personnel</li>
        <li>• Try dropping personnel on full course</li>
        <li>• Should show capacity error</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockPersonnelForCourses[0], mockCourses[4]]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId === 'course-full') {
            console.log(`Course capacity limit: ${draggedId} → ${targetId}`);
            alert(`❌ Course is at maximum capacity (3/3). Cannot enroll more personnel.`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Course Completion -->
<Story name="Course Completion">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-yellow-900 border border-yellow-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🎓 Course Completion</h3>
      <ul class="text-sm space-y-1">
        <li>• Henry completed JavaScript course</li>
        <li>• Gained skills: javascript, frontend-development</li>
        <li>• Efficiency boost: +0.2 (now 1.4)</li>
        <li>• Course marked as completed</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockPersonnelForCourses[3], mockCourses[3]]}
        edges={[{
          id: 'completion-edge',
          source: 'personnel-completed',
          target: 'course-completed',
          type: 'completed',
          label: 'Completed ✅'
        }]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeId === 'personnel-completed') {
            console.log('Skilled personnel details:', nodeData);
            alert(`Henry's Skills:\n• javascript ✅\n• frontend-development ✅\n• react ✅\n• typescript ✅\n• performance-optimization ✅\n\nEfficiency: 1.4 (boosted by courses)`);
          }
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Course Prerequisites -->
<Story name="Course Prerequisites">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-orange-900 border border-orange-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📋 Prerequisites Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Advanced React requires: frontend-development</li>
        <li>• Emma (Junior) only has: basic-programming</li>
        <li>• Should prevent enrollment</li>
        <li>• Frank has prerequisites ✅</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelForCourses.slice(0, 2), mockCourses[0]]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId === 'course-react') {
            if (draggedId === 'personnel-junior') {
              console.log(`Prerequisites not met: ${draggedId} → ${targetId}`);
              alert(`❌ Prerequisites not met! Advanced React requires: frontend-development\nEmma only has: basic-programming`);
            } else if (draggedId === 'personnel-mid') {
              console.log(`Prerequisites met: ${draggedId} → ${targetId}`);
              alert(`✅ Prerequisites met! Frank can enroll in Advanced React course.`);
            }
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Course with InfoPanel -->
<Story name="Course with InfoPanel">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="absolute top-4 left-4 z-20 bg-gray-800 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📊 Course InfoPanel</h3>
      <ul class="text-sm space-y-1">
        <li>• Click course to see details</li>
        <li>• View enrolled personnel</li>
        <li>• Check individual progress</li>
        <li>• See skills and efficiency boosts</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelForCourses.slice(0, 3), mockCourses[0]]}
        edges={[{
          id: 'info-edge',
          source: 'personnel-in-course',
          target: 'course-react',
          type: 'enrollment',
          label: 'Learning'
        }]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Node selected for InfoPanel:', nodeData);
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
    <InfoPanel 
      data={mockCourses[0]}
      onClose={() => console.log('Course InfoPanel closed')}
    />
  </div>
</Story>

<!-- Course Modal Integration -->
<Story name="Course Modal Integration">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="absolute top-4 left-4 z-20 bg-indigo-900 border border-indigo-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🎓 Course Creation</h3>
      <ul class="text-sm space-y-1">
        <li>• Course modal for creating new courses</li>
        <li>• Select from available templates</li>
        <li>• Check cost and requirements</li>
        <li>• Course appears in graph when created</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockPersonnelForCourses.slice(0, 2)}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
    <CourseModalSimple 
      isOpen={true}
      onClose={() => console.log('Course modal closed')}
    />
  </div>
</Story>
