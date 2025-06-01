<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import Hud from '../components/Hud.svelte';
  import InfoPanel from '../components/InfoPanel.svelte';
  import { mockGameState, mockPersonnelData, generateRandomPersonnel } from './mockData';
  import { fn } from 'storybook/test';

  // Game state scenarios
  const earlyGameState = {
    nodes: [
      {
        id: 'founder',
        type: 'Personnel',
        label: 'Founder',
        description: 'Company founder with entrepreneurial skills',
        cost: 0,
        salary: 0,
        skills: ['leadership', 'business-development'],
        efficiency: 1.0,
        actionPoints: 3,
        maxActionPoints: 3,
        category: 'Manager',
        experience: 'Senior',
        isAvailable: true,
        currentTaskId: null,
        currentCourseId: null,
        courseProgress: null,
        courseStartTime: null
      },
      {
        id: 'initial-capital',
        type: 'Resource',
        label: 'Initial Capital',
        description: 'Starting investment capital',
        cost: 0,
        quantity: 50000,
        category: 'Financial'
      },
      {
        id: 'app-idea',
        type: 'Idea',
        label: 'Mobile App Idea',
        description: 'Revolutionary mobile application concept',
        cost: 0,
        marketPotential: 'High',
        complexity: 'Medium',
        requiredSkills: ['mobile-development', 'ui-design'],
        estimatedDevelopmentTime: 3
      }
    ],
    edges: []
  };

  const midGameState = {
    nodes: [
      ...earlyGameState.nodes,
      ...mockPersonnelData.slice(0, 2),
      ...mockGameState.nodes.filter(n => n.type === 'Product').slice(0, 1),
      ...mockGameState.nodes.filter(n => n.type === 'Task').slice(0, 2)
    ],
    edges: mockGameState.edges.slice(0, 3)
  };

  const lateGameState = {
    nodes: [
      ...mockGameState.nodes,
      ...generateRandomPersonnel(5)
    ],
    edges: mockGameState.edges
  };

  const { Story } = defineMeta({
    title: 'Game Scenarios/Game States',
    component: CytoscapeGraph,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Different game states showing progression from early game to established company.'
        }
      }
    }
  });
</script>

<!-- Early Game State -->
<Story name="Early Game">
  <div class="bg-gray-900 min-h-screen flex flex-col">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="flex-1 relative">
      <CytoscapeGraph 
        nodes={earlyGameState.nodes}
        edges={earlyGameState.edges}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
      <div class="absolute top-4 left-4 bg-gray-800 p-4 rounded text-white max-w-sm">
        <h3 class="font-semibold mb-2">🚀 Early Game</h3>
        <ul class="text-sm space-y-1">
          <li>• Just the founder and initial capital</li>
          <li>• One promising app idea</li>
          <li>• Need to hire first employees</li>
          <li>• Focus on building MVP</li>
        </ul>
      </div>
    </div>
  </div>
</Story>

<!-- Mid Game State -->
<Story name="Mid Game">
  <div class="bg-gray-900 min-h-screen flex flex-col">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="flex-1 relative">
      <CytoscapeGraph 
        nodes={midGameState.nodes}
        edges={midGameState.edges}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
      <div class="absolute top-4 left-4 bg-gray-800 p-4 rounded text-white max-w-sm">
        <h3 class="font-semibold mb-2">📈 Mid Game</h3>
        <ul class="text-sm space-y-1">
          <li>• Small team of 3-4 people</li>
          <li>• First product in development</li>
          <li>• Active tasks and assignments</li>
          <li>• Growing network of connections</li>
        </ul>
      </div>
    </div>
  </div>
</Story>

<!-- Late Game State -->
<Story name="Late Game">
  <div class="bg-gray-900 min-h-screen flex flex-col">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="flex-1 relative">
      <CytoscapeGraph 
        nodes={lateGameState.nodes}
        edges={lateGameState.edges}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
      <div class="absolute top-4 left-4 bg-gray-800 p-4 rounded text-white max-w-sm">
        <h3 class="font-semibold mb-2">🏢 Late Game</h3>
        <ul class="text-sm space-y-1">
          <li>• Large team with specialists</li>
          <li>• Multiple products and projects</li>
          <li>• Complex task dependencies</li>
          <li>• Established company structure</li>
        </ul>
      </div>
    </div>
  </div>
</Story>

<!-- Crisis Scenario -->
<Story name="Crisis Scenario">
  <div class="bg-gray-900 min-h-screen flex flex-col">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="flex-1 relative">
      <CytoscapeGraph 
        nodes={[
          {
            id: 'founder',
            type: 'Personnel',
            label: 'Founder (Stressed)',
            description: 'Overworked founder trying to save the company',
            cost: 0,
            salary: 0,
            skills: ['leadership', 'crisis-management'],
            efficiency: 0.6,
            actionPoints: 1,
            maxActionPoints: 3,
            category: 'Manager',
            experience: 'Senior',
            isAvailable: false,
            currentTaskId: 'crisis-task',
            currentCourseId: null,
            courseProgress: null,
            courseStartTime: null
          },
          {
            id: 'crisis-task',
            type: 'Task',
            label: 'Emergency Bug Fixes',
            description: 'Critical bugs threatening product launch',
            cost: 0,
            requiredSkills: ['debugging', 'crisis-management'],
            assignedPersonnelIds: ['founder'],
            progress: 25,
            isCompleted: false,
            estimatedDuration: 480,
            startTime: Date.now() - 120000,
            remainingTime: 360000,
            outputs: ['stable-product'],
            parentProductId: 'failing-product'
          },
          {
            id: 'failing-product',
            type: 'Product',
            label: 'Failing Product',
            description: 'Product with critical issues',
            cost: 0,
            quality: 30,
            features: ['basic-functionality'],
            marketValue: 5000,
            developmentProgress: 80,
            isCompleted: false,
            requiredSkills: ['debugging', 'quality-assurance'],
            assignedPersonnelIds: ['founder']
          }
        ]}
        edges={[
          {
            id: 'crisis-edge-1',
            source: 'founder',
            target: 'crisis-task',
            type: 'assignment',
            label: 'Working on'
          },
          {
            id: 'crisis-edge-2',
            source: 'crisis-task',
            target: 'failing-product',
            type: 'development',
            label: 'Fixing'
          }
        ]}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
      <div class="absolute top-4 left-4 bg-red-900 border border-red-700 p-4 rounded text-white max-w-sm">
        <h3 class="font-semibold mb-2">🚨 Crisis Mode</h3>
        <ul class="text-sm space-y-1">
          <li>• Critical product issues</li>
          <li>• Founder working overtime</li>
          <li>• Low team morale</li>
          <li>• Emergency damage control</li>
        </ul>
      </div>
    </div>
  </div>
</Story>

<!-- Success Scenario -->
<Story name="Success Scenario">
  <div class="bg-gray-900 min-h-screen flex flex-col">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="flex-1 relative">
      <CytoscapeGraph 
        nodes={[
          ...lateGameState.nodes,
          {
            id: 'angel-investor',
            type: 'AngelFounder',
            label: 'Angel Investor',
            description: 'Interested in funding expansion',
            cost: 0,
            investmentAmount: 500000,
            equityRequirement: 20,
            requirements: ['proven-revenue', 'growth-metrics'],
            isAvailable: true
          },
          {
            id: 'successful-product',
            type: 'Product',
            label: 'Market Leader',
            description: 'Dominant product in the market',
            cost: 0,
            quality: 95,
            features: ['ai-powered', 'scalable', 'user-friendly', 'secure'],
            marketValue: 1000000,
            developmentProgress: 100,
            isCompleted: true,
            requiredSkills: [],
            assignedPersonnelIds: []
          }
        ]}
        edges={lateGameState.edges}
        layout="cose"
        onNodeClick={fn()}
        onEdgeClick={fn()}
        onCanvasClick={fn()}
        onNodeRightClick={fn()}
        onNodeDrop={fn()}
      />
      <div class="absolute top-4 left-4 bg-green-900 border border-green-700 p-4 rounded text-white max-w-sm">
        <h3 class="font-semibold mb-2">🎉 Success Story</h3>
        <ul class="text-sm space-y-1">
          <li>• Market-leading products</li>
          <li>• Angel investor interest</li>
          <li>• Skilled team of experts</li>
          <li>• Ready for next level</li>
        </ul>
      </div>
    </div>
  </div>
</Story>

<!-- Empty Company -->
<Story name="Empty Company">
  <div class="bg-gray-900 min-h-screen flex flex-col">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="flex-1 relative">
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
      <div class="absolute top-4 left-4 bg-gray-800 p-4 rounded text-white max-w-sm">
        <h3 class="font-semibold mb-2">🏗️ Starting Fresh</h3>
        <ul class="text-sm space-y-1">
          <li>• No nodes in the graph</li>
          <li>• Clean slate for new company</li>
          <li>• Use shop to purchase items</li>
          <li>• Begin your entrepreneurial journey</li>
        </ul>
      </div>
    </div>
  </div>
</Story>
