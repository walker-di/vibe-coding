<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Shop from '../components/Shop.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Game Components/Shop',
    component: Shop,
    tags: ['autodocs'],
    parameters: {
      layout: 'centered',
      docs: {
        description: {
          component: 'Shop component displays purchasable items in a Stacklands-style card interface. Shows resources and ideas with real-time affordability checking.'
        }
      }
    },
    argTypes: {
      currentCapital: {
        control: { type: 'number', min: 0, max: 100000, step: 1000 },
        description: 'Current company capital for affordability checking'
      },
      onPurchase: {
        action: 'purchase',
        description: 'Callback when an item is purchased'
      }
    },
    args: {
      currentCapital: 25000,
      onPurchase: fn()
    }
  });
</script>

<!-- Default shop with moderate capital -->
<Story name="Default">
  <div class="bg-gray-900 p-6 rounded-lg">
    <div class="max-w-2xl">
      <h3 class="text-white text-lg font-semibold mb-4">Shop</h3>
      <Shop 
        currentCapital={25000}
        onPurchase={fn()}
      />
    </div>
  </div>
</Story>

<!-- Rich player - can afford everything -->
<Story name="Rich Player" args={{
  currentCapital: 100000
}}>
  <div class="bg-gray-900 p-6 rounded-lg">
    <div class="max-w-2xl">
      <h3 class="text-white text-lg font-semibold mb-4">Shop - Rich Player</h3>
      <Shop 
        currentCapital={100000}
        onPurchase={fn()}
      />
    </div>
  </div>
</Story>

<!-- Poor player - can afford very little -->
<Story name="Poor Player" args={{
  currentCapital: 2000
}}>
  <div class="bg-gray-900 p-6 rounded-lg">
    <div class="max-w-2xl">
      <h3 class="text-white text-lg font-semibold mb-4">Shop - Poor Player</h3>
      <Shop 
        currentCapital={2000}
        onPurchase={fn()}
      />
    </div>
  </div>
</Story>

<!-- Broke player - can't afford anything -->
<Story name="Broke Player" args={{
  currentCapital: 500
}}>
  <div class="bg-gray-900 p-6 rounded-lg">
    <div class="max-w-2xl">
      <h3 class="text-white text-lg font-semibold mb-4">Shop - Broke Player</h3>
      <Shop 
        currentCapital={500}
        onPurchase={fn()}
      />
    </div>
  </div>
</Story>

<!-- Mid-game scenario -->
<Story name="Mid Game" args={{
  currentCapital: 15000
}}>
  <div class="bg-gray-900 p-6 rounded-lg">
    <div class="max-w-2xl">
      <h3 class="text-white text-lg font-semibold mb-4">Shop - Mid Game</h3>
      <Shop 
        currentCapital={15000}
        onPurchase={fn()}
      />
    </div>
  </div>
</Story>

<!-- Interactive playground -->
<Story name="Interactive" let:args>
  <div class="bg-gray-900 p-6 rounded-lg">
    <div class="max-w-2xl">
      <h3 class="text-white text-lg font-semibold mb-4">Shop - Interactive</h3>
      <Shop 
        currentCapital={args.currentCapital}
        onPurchase={args.onPurchase}
      />
      <div class="mt-4 p-3 bg-gray-800 rounded text-white text-sm">
        <strong>Current Capital:</strong> ${args.currentCapital.toLocaleString()}
      </div>
    </div>
  </div>
</Story>

<!-- Responsive layout test -->
<Story name="Responsive" parameters={{ layout: 'fullscreen' }}>
  <div class="bg-gray-900 min-h-screen p-4">
    <div class="max-w-6xl mx-auto">
      <h3 class="text-white text-lg font-semibold mb-4">Shop - Responsive Layout</h3>
      <Shop 
        currentCapital={30000}
        onPurchase={fn()}
      />
    </div>
  </div>
</Story>
