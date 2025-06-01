<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Hud from '../components/Hud.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Components/HUD',
    component: Hud,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'HUD (Heads-Up Display) shows game controls, financial information, HR section, and shop interface. The main control panel for the game.'
        }
      }
    },
    argTypes: {
      onOpenCourseModal: {
        action: 'openCourseModal',
        description: 'Callback to open the course training modal'
      },
      onOpenHiringModal: {
        action: 'openHiringModal',
        description: 'Callback to open the personnel hiring modal'
      },
      onOpenFinanceModal: {
        action: 'openFinanceModal',
        description: 'Callback to open the finance/marketing modal'
      }
    },
    args: {
      onOpenCourseModal: fn(),
      onOpenHiringModal: fn(),
      onOpenFinanceModal: fn()
    }
  });
</script>

<!-- Default HUD -->
<Story name="Default">
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Game Area</h2>
      <p class="text-gray-400">This is where the main game content would appear below the HUD.</p>
    </div>
  </div>
</Story>

<!-- Rich Company State -->
<Story name="Rich Company" parameters={{
  mockData: {
    finances: {
      capital: 150000,
      totalRevenue: 75000,
      totalExpenses: 25000,
      netProfit: 50000
    },
    personnel: 12,
    products: 5,
    tasks: 8
  }
}}>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Rich Company Scenario</h2>
      <p class="text-gray-400">Company with high capital and positive cash flow.</p>
    </div>
  </div>
</Story>

<!-- Struggling Company State -->
<Story name="Struggling Company" parameters={{
  mockData: {
    finances: {
      capital: 5000,
      totalRevenue: 8000,
      totalExpenses: 15000,
      netProfit: -7000
    },
    personnel: 3,
    products: 1,
    tasks: 2
  }
}}>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Struggling Company Scenario</h2>
      <p class="text-gray-400">Company with low capital and negative cash flow.</p>
    </div>
  </div>
</Story>

<!-- Early Game State -->
<Story name="Early Game" parameters={{
  mockData: {
    finances: {
      capital: 50000,
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0
    },
    personnel: 1,
    products: 0,
    tasks: 0
  }
}}>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Early Game Scenario</h2>
      <p class="text-gray-400">Starting state with initial capital and founder only.</p>
    </div>
  </div>
</Story>

<!-- Mid Game State -->
<Story name="Mid Game" parameters={{
  mockData: {
    finances: {
      capital: 25000,
      totalRevenue: 30000,
      totalExpenses: 20000,
      netProfit: 10000
    },
    personnel: 6,
    products: 2,
    tasks: 4
  }
}}>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Mid Game Scenario</h2>
      <p class="text-gray-400">Growing company with multiple personnel and products.</p>
    </div>
  </div>
</Story>

<!-- Large Company State -->
<Story name="Large Company" parameters={{
  mockData: {
    finances: {
      capital: 500000,
      totalRevenue: 200000,
      totalExpenses: 120000,
      netProfit: 80000
    },
    personnel: 25,
    products: 12,
    tasks: 18
  }
}}>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Large Company Scenario</h2>
      <p class="text-gray-400">Established company with many personnel and products.</p>
    </div>
  </div>
</Story>

<!-- Interactive -->
<Story name="Interactive" let:args>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={args.onOpenCourseModal}
      onOpenHiringModal={args.onOpenHiringModal}
      onOpenFinanceModal={args.onOpenFinanceModal}
    />
    <div class="p-8 text-white">
      <h2 class="text-xl font-semibold mb-4">Interactive HUD</h2>
      <p class="text-gray-400 mb-4">Click the buttons in the HUD to test the callbacks.</p>
      <div class="bg-gray-800 p-4 rounded">
        <h3 class="font-semibold mb-2">Available Actions:</h3>
        <ul class="text-sm space-y-1">
          <li>• Click "Hire Personnel" to trigger hiring modal</li>
          <li>• Click "Training" to trigger course modal</li>
          <li>• Click "📊 Marketing" to trigger finance modal</li>
          <li>• Use game speed controls to test speed changes</li>
          <li>• Use pause/resume button to test game state</li>
        </ul>
      </div>
    </div>
  </div>
</Story>

<!-- Mobile Layout -->
<Story name="Mobile Layout" parameters={{
  viewport: {
    defaultViewport: 'mobile1'
  }
}}>
  <div class="bg-gray-900 min-h-screen">
    <Hud 
      onOpenCourseModal={fn()}
      onOpenHiringModal={fn()}
      onOpenFinanceModal={fn()}
    />
    <div class="p-4 text-white">
      <h2 class="text-lg font-semibold mb-2">Mobile View</h2>
      <p class="text-gray-400 text-sm">HUD adapted for mobile screens.</p>
    </div>
  </div>
</Story>
