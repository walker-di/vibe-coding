<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Documentation/Getting Started',
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'ProductGraphTycoon - Comprehensive Storybook Documentation and Component Library'
        }
      }
    }
  });
</script>

<Story name="Overview">
  <div class="bg-gray-900 min-h-screen p-8 text-white">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-6 text-blue-400">ProductGraphTycoon</h1>
      <h2 class="text-2xl font-semibold mb-4 text-gray-300">Storybook Documentation</h2>
      
      <div class="bg-gray-800 p-6 rounded-lg mb-8">
        <p class="text-lg mb-4">
          Welcome to the ProductGraphTycoon Storybook! This interactive documentation showcases all the components, 
          game states, and user interactions in our business simulation game.
        </p>
        <p class="text-gray-400">
          Navigate through the sidebar to explore different component categories and interactive examples.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-gray-800 p-6 rounded-lg">
          <h3 class="text-xl font-semibold mb-3 text-green-400">🎮 About the Game</h3>
          <p class="text-gray-300 mb-3">
            ProductGraphTycoon is a business simulation game where players build and manage a tech company 
            through an interactive graph interface.
          </p>
          <ul class="text-sm text-gray-400 space-y-1">
            <li>• Hire personnel with different skills</li>
            <li>• Develop products and manage projects</li>
            <li>• Handle resources and company finances</li>
            <li>• Grow from startup to enterprise</li>
          </ul>
        </div>

        <div class="bg-gray-800 p-6 rounded-lg">
          <h3 class="text-xl font-semibold mb-3 text-blue-400">🏗️ Architecture</h3>
          <ul class="text-sm text-gray-300 space-y-2">
            <li><strong>Frontend:</strong> Svelte 5 with TypeScript</li>
            <li><strong>Styling:</strong> Tailwind CSS 4</li>
            <li><strong>Graph:</strong> Cytoscape.js</li>
            <li><strong>State:</strong> Svelte stores</li>
            <li><strong>Build:</strong> Vite</li>
            <li><strong>Testing:</strong> Vitest + Storybook + Playwright</li>
          </ul>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg mb-8">
        <h3 class="text-xl font-semibold mb-4 text-purple-400">📚 Component Categories</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="font-semibold text-white mb-2">Game Components</h4>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• HUD - Main control panel</li>
              <li>• CytoscapeGraph - Interactive graph</li>
              <li>• InfoPanel - Node details</li>
              <li>• ContextMenu - Right-click actions</li>
              <li>• Shop - Purchase interface</li>
              <li>• Timer - Game progress display</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-2">Game Scenarios</h4>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Early Game - Founder + initial capital</li>
              <li>• Mid Game - Small team development</li>
              <li>• Late Game - Large company</li>
              <li>• Crisis Scenarios - Emergency situations</li>
              <li>• Success Stories - Thriving business</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg mb-8">
        <h3 class="text-xl font-semibold mb-4 text-yellow-400">🎯 Game Mechanics</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 class="font-semibold text-white mb-2">Nodes</h4>
            <ul class="text-xs text-gray-400 space-y-1">
              <li>• Personnel (employees)</li>
              <li>• Products (applications)</li>
              <li>• Tasks (work assignments)</li>
              <li>• Resources (capital, equipment)</li>
              <li>• Ideas (concepts)</li>
              <li>• Courses (training)</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-2">Time System</h4>
            <ul class="text-xs text-gray-400 space-y-1">
              <li>• 1 week = 120 seconds</li>
              <li>• Adjustable speed (0.5x-5x)</li>
              <li>• Action points refresh weekly</li>
              <li>• Pause/resume functionality</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-2">Financial System</h4>
            <ul class="text-xs text-gray-400 space-y-1">
              <li>• Capital for purchases</li>
              <li>• Revenue from sales</li>
              <li>• Expenses (salaries, costs)</li>
              <li>• Net profit tracking</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg mb-8">
        <h3 class="text-xl font-semibold mb-4 text-red-400">🧪 Testing Features</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="font-semibold text-white mb-2">Component Testing</h4>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Interactive controls for props</li>
              <li>• Actions logging and testing</li>
              <li>• Edge cases and error states</li>
              <li>• Responsive design testing</li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-2">Accessibility</h4>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Built-in a11y validation</li>
              <li>• Keyboard navigation testing</li>
              <li>• Screen reader compatibility</li>
              <li>• Color contrast checking</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-blue-900 border border-blue-700 p-6 rounded-lg">
        <h3 class="text-xl font-semibold mb-4 text-blue-300">🚀 Getting Started</h3>
        <div class="space-y-3">
          <div>
            <h4 class="font-semibold text-white">Run Storybook:</h4>
            <code class="bg-gray-800 px-2 py-1 rounded text-green-400">npm run storybook</code>
          </div>
          <div>
            <h4 class="font-semibold text-white">Run Tests:</h4>
            <code class="bg-gray-800 px-2 py-1 rounded text-green-400">npm run test:storybook</code>
          </div>
          <div>
            <h4 class="font-semibold text-white">Build Storybook:</h4>
            <code class="bg-gray-800 px-2 py-1 rounded text-green-400">npm run build-storybook</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</Story>

<Story name="Component Guide">
  <div class="bg-gray-900 min-h-screen p-8 text-white">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-6 text-blue-400">Component Development Guide</h1>
      
      <div class="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 class="text-xl font-semibold mb-4 text-green-400">Story Structure</h2>
        <p class="text-gray-300 mb-4">Each component has comprehensive stories covering:</p>
        <ul class="text-gray-400 space-y-2">
          <li><strong>Default states:</strong> Normal operating conditions</li>
          <li><strong>Edge cases:</strong> Empty data, error states, boundary conditions</li>
          <li><strong>Interactive scenarios:</strong> User interactions and workflows</li>
          <li><strong>Responsive design:</strong> Mobile and desktop layouts</li>
          <li><strong>Accessibility:</strong> Keyboard navigation and screen readers</li>
        </ul>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 class="text-xl font-semibold mb-4 text-purple-400">Design System</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 class="font-semibold text-white mb-2">Colors</h3>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <div class="w-4 h-4 bg-blue-500 rounded"></div>
                <span class="text-sm">Primary (Blue)</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-4 h-4 bg-green-500 rounded"></div>
                <span class="text-sm">Success (Green)</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-4 h-4 bg-yellow-500 rounded"></div>
                <span class="text-sm">Warning (Yellow)</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-4 h-4 bg-red-500 rounded"></div>
                <span class="text-sm">Error (Red)</span>
              </div>
            </div>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-2">Typography</h3>
            <div class="space-y-1 text-sm text-gray-400">
              <div>Headers: 600-700 weight</div>
              <div>Body: 400 weight</div>
              <div>Code: Monospace</div>
            </div>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-2">Spacing</h3>
            <div class="space-y-1 text-sm text-gray-400">
              <div>Base: 4px unit</div>
              <div>Responsive scaling</div>
              <div>Logical grouping</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg">
        <h2 class="text-xl font-semibold mb-4 text-yellow-400">Best Practices</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-semibold text-white mb-2">Component Development</h3>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Use Svelte 5 runes ($state, $derived, $effect)</li>
              <li>• Keep component state local when possible</li>
              <li>• Use stores for shared game state</li>
              <li>• Implement reactive updates</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-2">Story Writing</h3>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Write stories for all component states</li>
              <li>• Include interactive examples</li>
              <li>• Test accessibility features</li>
              <li>• Document expected behaviors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</Story>
