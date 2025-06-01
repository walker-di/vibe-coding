<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CytoscapeGraph from '../components/CytoscapeGraph.svelte';
  import FinanceModal from '../components/FinanceModal.svelte';
  import InfoPanel from '../components/InfoPanel.svelte';
  import { fn } from 'storybook/test';

  // Mock personnel for investor pitch creation
  const mockPersonnelForPitches = [
    {
      id: 'personnel-ceo',
      type: 'Personnel',
      label: 'Sarah CEO',
      description: 'Experienced CEO with business development skills',
      cost: 12000,
      salary: 12000,
      skills: ['leadership', 'business-development', 'pitch-creation', 'strategy'],
      efficiency: 1.3,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Manager',
      experience: 'Senior',
      isAvailable: true,
      assignedToTaskId: null,
      position: { x: 100, y: 100 }
    },
    {
      id: 'personnel-marketing',
      type: 'Personnel',
      label: 'Tom Marketing',
      description: 'Marketing specialist with presentation skills',
      cost: 8000,
      salary: 8000,
      skills: ['marketing', 'presentation', 'pitch-creation', 'communication'],
      efficiency: 1.1,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Specialist',
      experience: 'Mid-level',
      isAvailable: true,
      assignedToTaskId: null,
      position: { x: 200, y: 100 }
    },
    {
      id: 'personnel-no-pitch-skills',
      type: 'Personnel',
      label: 'Dave Developer',
      description: 'Great developer but lacks business skills',
      cost: 7500,
      salary: 7500,
      skills: ['frontend-development', 'backend-development'],
      efficiency: 1.2,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Developer',
      experience: 'Senior',
      isAvailable: true,
      assignedToTaskId: null,
      position: { x: 300, y: 100 }
    }
  ];

  // Mock investor pitch tasks
  const mockPitchTasks = [
    {
      id: 'task-create-pitch',
      type: 'Task',
      label: 'Create Investor Pitch',
      description: 'Develop compelling investor presentation',
      cost: 0,
      requiredSkills: ['pitch-creation', 'business-development'],
      assignedPersonnelIds: [],
      progress: 0,
      isCompleted: false,
      estimatedDuration: 180, // 3 hours
      startTime: null,
      remainingTime: null,
      outputs: ['investor-pitch'],
      parentProductId: null,
      position: { x: 100, y: 300 }
    },
    {
      id: 'task-pitch-in-progress',
      type: 'Task',
      label: 'Investor Pitch Development',
      description: 'Creating pitch deck and financial projections',
      cost: 0,
      requiredSkills: ['pitch-creation', 'business-development'],
      assignedPersonnelIds: ['personnel-ceo'],
      progress: 75,
      isCompleted: false,
      estimatedDuration: 180,
      startTime: Date.now() - 135000, // Started 2.25 hours ago
      remainingTime: 45000, // 45 minutes remaining
      outputs: ['investor-pitch'],
      parentProductId: null,
      position: { x: 300, y: 300 }
    }
  ];

  // Mock investor pitches
  const mockInvestorPitches = [
    {
      id: 'pitch-high-quality',
      type: 'InvestorPitch',
      label: 'Series A Pitch Deck',
      description: 'Professional pitch deck with strong financials',
      cost: 0,
      quality: 0.85,
      createdBy: 'personnel-ceo',
      creationTime: Date.now() - 300000, // Created 5 minutes ago
      presentedTo: [],
      isUsed: false,
      position: { x: 100, y: 450 }
    },
    {
      id: 'pitch-medium-quality',
      type: 'InvestorPitch',
      label: 'Seed Funding Pitch',
      description: 'Basic pitch deck with room for improvement',
      cost: 0,
      quality: 0.65,
      createdBy: 'personnel-marketing',
      creationTime: Date.now() - 600000, // Created 10 minutes ago
      presentedTo: ['angel-1'],
      isUsed: false,
      position: { x: 300, y: 450 }
    },
    {
      id: 'pitch-used',
      type: 'InvestorPitch',
      label: 'Used Pitch Deck',
      description: 'Previously presented pitch deck',
      cost: 0,
      quality: 0.75,
      createdBy: 'personnel-ceo',
      creationTime: Date.now() - 900000, // Created 15 minutes ago
      presentedTo: ['angel-1', 'angel-2'],
      isUsed: true,
      position: { x: 500, y: 450 }
    }
  ];

  // Mock angel investors
  const mockAngelInvestors = [
    {
      id: 'angel-available',
      type: 'AngelFounder',
      label: 'Michael Angel',
      description: 'Tech-focused angel investor',
      cost: 0,
      investmentAmount: 500000,
      equityRequirement: 15,
      requirements: ['proven-revenue', 'tech-product'],
      isAvailable: true,
      pitchId: null,
      position: { x: 100, y: 600 }
    },
    {
      id: 'angel-interested',
      type: 'AngelFounder',
      label: 'Lisa Venture',
      description: 'Interested after successful pitch',
      cost: 0,
      investmentAmount: 750000,
      equityRequirement: 20,
      requirements: ['growth-metrics', 'scalable-model'],
      isAvailable: false,
      pitchId: 'pitch-high-quality',
      position: { x: 300, y: 600 }
    },
    {
      id: 'angel-rejected',
      type: 'AngelFounder',
      label: 'Robert Capital',
      description: 'Not convinced by previous pitch',
      cost: 0,
      investmentAmount: 300000,
      equityRequirement: 25,
      requirements: ['market-validation'],
      isAvailable: true,
      pitchId: null,
      position: { x: 500, y: 600 }
    }
  ];

  const { Story } = defineMeta({
    title: 'Game Mechanics/Investor System',
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Investor system testing - pitch creation, angel investor interactions, funding acquisition, and equity management.'
        }
      }
    }
  });
</script>

<!-- Pitch Creation Process -->
<Story name="Pitch Creation Process">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-blue-900 border border-blue-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📊 Pitch Creation Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Assign personnel with pitch-creation skills</li>
        <li>• Sarah (CEO) ✅ has required skills</li>
        <li>• Tom (Marketing) ✅ has required skills</li>
        <li>• Dave (Developer) ❌ lacks business skills</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[...mockPersonnelForPitches, mockPitchTasks[0]]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={(draggedId, targetId) => {
          if (targetId === 'task-create-pitch') {
            const personnel = mockPersonnelForPitches.find(p => p.id === draggedId);
            if (personnel?.skills.includes('pitch-creation')) {
              console.log(`Valid pitch assignment: ${draggedId} → ${targetId}`);
              alert(`✅ ${personnel.label} assigned to create investor pitch! Has required skills: ${personnel.skills.filter(s => ['pitch-creation', 'business-development'].includes(s)).join(', ')}`);
            } else {
              console.log(`Invalid pitch assignment: ${draggedId} → ${targetId}`);
              alert(`❌ ${personnel?.label} lacks required skills for pitch creation. Needs: pitch-creation, business-development`);
            }
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Pitch Development Progress -->
<Story name="Pitch Development Progress">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-green-900 border border-green-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">⏱️ Pitch Progress Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Sarah working on investor pitch</li>
        <li>• Progress: 75% complete</li>
        <li>• Remaining: 45 minutes</li>
        <li>• Will create InvestorPitch node when done</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockPersonnelForPitches[0], mockPitchTasks[1]]}
        edges={[{
          id: 'pitch-assignment',
          source: 'personnel-ceo',
          target: 'task-pitch-in-progress',
          type: 'assignment',
          label: 'Creating pitch (75%)'
        }]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeId === 'task-pitch-in-progress') {
            console.log('Pitch development progress:', nodeData);
            alert(`Investor Pitch Development:\n• Progress: ${nodeData.progress}%\n• Remaining: ${Math.round(nodeData.remainingTime / 60000)} minutes\n• Creator: Sarah CEO\n• Output: High-quality investor pitch`);
          }
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Pitch Quality Comparison -->
<Story name="Pitch Quality Comparison">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-purple-900 border border-purple-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">⭐ Pitch Quality Test</h3>
      <ul class="text-sm space-y-1">
        <li>• High Quality (85%): Series A ready</li>
        <li>• Medium Quality (65%): Needs improvement</li>
        <li>• Used Pitch: Already presented</li>
        <li>• Quality affects investor success rate</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockInvestorPitches}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Pitch quality details:', nodeData);
          const qualityText = nodeData.quality >= 0.8 ? 'Excellent' : 
                             nodeData.quality >= 0.7 ? 'Good' : 
                             nodeData.quality >= 0.6 ? 'Fair' : 'Poor';
          alert(`${nodeData.label}\n• Quality: ${Math.round(nodeData.quality * 100)}% (${qualityText})\n• Created by: ${nodeData.createdBy}\n• Presented to: ${nodeData.presentedTo.length} investors\n• Status: ${nodeData.isUsed ? 'Used' : 'Available'}`);
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Angel Investor Interaction -->
<Story name="Angel Investor Interaction">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-yellow-900 border border-yellow-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">👼 Angel Investor Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Drag pitch onto available angel investor</li>
        <li>• Michael: Available, $500K, 15% equity</li>
        <li>• Lisa: Interested (already pitched)</li>
        <li>• Robert: Available but rejected before</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockInvestorPitches[0], ...mockAngelInvestors]}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeData.type === 'AngelFounder') {
            console.log('Angel investor details:', nodeData);
            const status = nodeData.isAvailable ? 'Available' : 'Interested/Busy';
            alert(`${nodeData.label}\n• Investment: $${nodeData.investmentAmount.toLocaleString()}\n• Equity: ${nodeData.equityRequirement}%\n• Status: ${status}\n• Requirements: ${nodeData.requirements.join(', ')}`);
          }
        }}
        onNodeDrop={(draggedId, targetId) => {
          if (draggedId.startsWith('pitch-') && targetId.startsWith('angel-')) {
            const pitch = mockInvestorPitches.find(p => p.id === draggedId);
            const angel = mockAngelInvestors.find(a => a.id === targetId);
            
            if (pitch && angel) {
              const success = pitch.quality > 0.7; // 70% threshold
              console.log(`Pitch presentation: ${draggedId} → ${targetId}, Success: ${success}`);
              
              if (success) {
                alert(`🎉 Success! ${angel.label} is interested!\n• Investment: $${angel.investmentAmount.toLocaleString()}\n• Equity: ${angel.equityRequirement}%\n• Pitch Quality: ${Math.round(pitch.quality * 100)}%`);
              } else {
                alert(`😞 ${angel.label} was not convinced.\n• Pitch Quality: ${Math.round(pitch.quality * 100)}% (needs >70%)\n• Try improving the pitch or finding another investor.`);
              }
            }
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Successful Funding Flow -->
<Story name="Successful Funding Flow">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-green-900 border border-green-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">💰 Successful Funding</h3>
      <ul class="text-sm space-y-1">
        <li>• High-quality pitch presented</li>
        <li>• Lisa Venture is interested!</li>
        <li>• $750K investment available</li>
        <li>• 20% equity requirement</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockInvestorPitches[0], mockAngelInvestors[1]]}
        edges={[{
          id: 'funding-edge',
          source: 'pitch-high-quality',
          target: 'angel-interested',
          type: 'presentation',
          label: 'Successful Pitch ✅'
        }]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          if (nodeId === 'angel-interested') {
            console.log('Interested investor details:', nodeData);
            alert(`🎉 Lisa Venture is interested!\n• Ready to invest: $750,000\n• Equity requirement: 20%\n• Next step: Finalize funding agreement\n• This will boost company capital significantly!`);
          }
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Funding Requirements -->
<Story name="Funding Requirements">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-orange-900 border border-orange-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">📋 Funding Requirements</h3>
      <ul class="text-sm space-y-1">
        <li>• Each investor has specific requirements</li>
        <li>• Michael: proven-revenue, tech-product</li>
        <li>• Lisa: growth-metrics, scalable-model</li>
        <li>• Robert: market-validation</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={mockAngelInvestors}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Investor requirements:', nodeData);
          alert(`${nodeData.label} Requirements:\n• ${nodeData.requirements.join('\n• ')}\n\nInvestment Details:\n• Amount: $${nodeData.investmentAmount.toLocaleString()}\n• Equity: ${nodeData.equityRequirement}%\n• Status: ${nodeData.isAvailable ? 'Available' : 'Busy/Interested'}`);
        }}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>

<!-- Finance Modal Integration -->
<Story name="Finance Modal Integration">
  <div class="bg-gray-900 min-h-screen p-4 relative">
    <div class="absolute top-4 left-4 z-20 bg-indigo-900 border border-indigo-700 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🏦 Finance Modal Test</h3>
      <ul class="text-sm space-y-1">
        <li>• Access funding options</li>
        <li>• Find angel investors</li>
        <li>• Compare investment terms</li>
        <li>• Secure funding for growth</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[mockInvestorPitches[0]]}
        edges={[]}
        layout="preset"
        onNodeClick={fn()}
        onNodeDrop={fn()}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
    <FinanceModal 
      isOpen={true}
      onClose={() => console.log('Finance modal closed')}
    />
  </div>
</Story>

<!-- Complete Investor Workflow -->
<Story name="Complete Investor Workflow">
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="absolute top-4 left-4 z-10 bg-gray-800 p-4 rounded text-white max-w-sm">
      <h3 class="font-semibold mb-2">🔄 Complete Workflow</h3>
      <ul class="text-sm space-y-1">
        <li>1. Assign CEO to create pitch</li>
        <li>2. Wait for pitch completion</li>
        <li>3. Drag pitch to angel investor</li>
        <li>4. Negotiate funding terms</li>
        <li>5. Secure investment capital</li>
      </ul>
    </div>
    <div class="h-full">
      <CytoscapeGraph 
        nodes={[
          mockPersonnelForPitches[0], // CEO
          mockPitchTasks[0], // Create pitch task
          mockInvestorPitches[0], // High-quality pitch
          mockAngelInvestors[0] // Available angel
        ]}
        edges={[]}
        layout="preset"
        onNodeClick={(nodeId, nodeData) => {
          console.log('Workflow node clicked:', nodeData);
          if (nodeData.type === 'Task') {
            alert(`Step 1: Assign CEO to create investor pitch\n• Required skills: pitch-creation, business-development\n• Duration: 3 hours\n• Output: High-quality investor pitch`);
          } else if (nodeData.type === 'InvestorPitch') {
            alert(`Step 2: Pitch created successfully!\n• Quality: ${Math.round(nodeData.quality * 100)}%\n• Ready to present to investors\n• Drag onto angel investor to present`);
          } else if (nodeData.type === 'AngelFounder') {
            alert(`Step 3: Present pitch to angel investor\n• Investment: $${nodeData.investmentAmount.toLocaleString()}\n• Equity: ${nodeData.equityRequirement}%\n• Requirements: ${nodeData.requirements.join(', ')}`);
          }
        }}
        onNodeDrop={(draggedId, targetId) => {
          console.log(`Workflow action: ${draggedId} → ${targetId}`);
          
          if (draggedId === 'personnel-ceo' && targetId === 'task-create-pitch') {
            alert(`✅ Step 1 Complete: CEO assigned to create pitch!\n• Progress will update in real-time\n• Pitch will be created when task reaches 100%`);
          } else if (draggedId === 'pitch-high-quality' && targetId === 'angel-available') {
            alert(`🎉 Step 2 Complete: Successful pitch presentation!\n• Michael Angel is interested!\n• $500K investment secured\n• Company capital increased significantly!`);
          }
        }}
        onNodeRightClick={fn()}
        onCanvasClick={fn()}
      />
    </div>
  </div>
</Story>
