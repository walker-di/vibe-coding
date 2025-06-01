<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Timer from '../components/Timer.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Components/Timer',
    component: Timer,
    tags: ['autodocs'],
    parameters: {
      layout: 'centered',
      docs: {
        description: {
          component: 'Timer component displays the current game week progress with a visual progress bar. Shows week number, progress percentage, and remaining time.'
        }
      }
    },
    argTypes: {
      currentTick: {
        control: { type: 'number', min: 0, max: 100 },
        description: 'Current game tick (week number)'
      },
      weekProgress: {
        control: { type: 'range', min: 0, max: 100, step: 1 },
        description: 'Progress through current week (0-100%)'
      },
      remainingTime: {
        control: { type: 'number', min: 0, max: 120 },
        description: 'Remaining time in current week (seconds)'
      },
      gameSpeed: {
        control: { type: 'select' },
        options: [0.5, 1.0, 1.5, 2.0, 3.0, 5.0],
        description: 'Current game speed multiplier'
      },
      isPaused: {
        control: { type: 'boolean' },
        description: 'Whether the game is currently paused'
      }
    },
    args: {
      currentTick: 5,
      weekProgress: 45,
      remainingTime: 66,
      gameSpeed: 1.0,
      isPaused: false
    }
  });
</script>

<!-- Default story -->
<Story name="Default">
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={5}
      weekProgress={45}
      remainingTime={66}
      gameSpeed={1.0}
      isPaused={false}
    />
  </div>
</Story>

<!-- Early week progress -->
<Story name="Early Week" args={{
  currentTick: 1,
  weekProgress: 15,
  remainingTime: 102,
  gameSpeed: 1.0,
  isPaused: false
}}>
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={1}
      weekProgress={15}
      remainingTime={102}
      gameSpeed={1.0}
      isPaused={false}
    />
  </div>
</Story>

<!-- Almost complete week -->
<Story name="Almost Complete" args={{
  currentTick: 12,
  weekProgress: 95,
  remainingTime: 6,
  gameSpeed: 1.0,
  isPaused: false
}}>
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={12}
      weekProgress={95}
      remainingTime={6}
      gameSpeed={1.0}
      isPaused={false}
    />
  </div>
</Story>

<!-- Paused state -->
<Story name="Paused" args={{
  currentTick: 8,
  weekProgress: 60,
  remainingTime: 48,
  gameSpeed: 1.0,
  isPaused: true
}}>
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={8}
      weekProgress={60}
      remainingTime={48}
      gameSpeed={1.0}
      isPaused={true}
    />
  </div>
</Story>

<!-- High speed -->
<Story name="High Speed" args={{
  currentTick: 25,
  weekProgress: 30,
  remainingTime: 84,
  gameSpeed: 5.0,
  isPaused: false
}}>
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={25}
      weekProgress={30}
      remainingTime={84}
      gameSpeed={5.0}
      isPaused={false}
    />
  </div>
</Story>

<!-- Slow speed -->
<Story name="Slow Speed" args={{
  currentTick: 3,
  weekProgress: 75,
  remainingTime: 30,
  gameSpeed: 0.5,
  isPaused: false
}}>
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={3}
      weekProgress={75}
      remainingTime={30}
      gameSpeed={0.5}
      isPaused={false}
    />
  </div>
</Story>

<!-- Interactive playground -->
<Story name="Interactive" let:args>
  <div class="bg-gray-900 p-4 rounded-lg">
    <Timer 
      currentTick={args.currentTick}
      weekProgress={args.weekProgress}
      remainingTime={args.remainingTime}
      gameSpeed={args.gameSpeed}
      isPaused={args.isPaused}
    />
  </div>
</Story>
