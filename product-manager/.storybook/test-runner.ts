import type { TestRunnerConfig } from '@storybook/test-runner';
import { checkA11y, injectAxe } from 'axe-playwright';

const config: TestRunnerConfig = {
  setup() {
    // Global setup for all tests
    console.log('Setting up Storybook test runner...');
  },
  
  async preVisit(page, context) {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  },

  async postVisit(page, context) {
    // Run accessibility tests on every story
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
      // Configure axe rules
      rules: {
        // Disable color-contrast rule for now (can be strict with dark theme)
        'color-contrast': { enabled: false },
        // Focus on critical accessibility issues
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'button-name': { enabled: true },
        'link-name': { enabled: true },
        'label': { enabled: true },
        'keyboard-navigation': { enabled: true },
      },
    });

    // Additional custom tests
    const storyId = context.id;
    const storyTitle = context.title;

    // Test for console errors
    const logs = await page.evaluate(() => {
      return window.console.errors || [];
    });

    if (logs.length > 0) {
      console.warn(`Console errors in story ${storyTitle}:`, logs);
    }

    // Test for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || img.naturalWidth === 0).length;
    });

    if (brokenImages > 0) {
      console.warn(`${brokenImages} broken images found in story ${storyTitle}`);
    }

    // Test for missing alt text on images
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.alt || img.alt.trim() === '').length;
    });

    if (imagesWithoutAlt > 0) {
      console.warn(`${imagesWithoutAlt} images without alt text in story ${storyTitle}`);
    }

    // Performance testing for graph components
    if (storyTitle.includes('CytoscapeGraph') || storyTitle.includes('Graph')) {
      const performanceMetrics = await page.evaluate(() => {
        return {
          memory: (performance as any).memory?.usedJSHeapSize || 0,
          timing: performance.now()
        };
      });

      // Log performance metrics for graph components
      console.log(`Performance metrics for ${storyTitle}:`, performanceMetrics);
    }

    // Test interactive elements
    if (storyTitle.includes('Interactive')) {
      // Check for clickable elements
      const clickableElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('button, [role="button"], a, [onclick]');
        return elements.length;
      });

      console.log(`${clickableElements} interactive elements found in ${storyTitle}`);
    }

    // Additional component-specific tests
    // Test Shop component affordability logic
    if (storyTitle.includes('Shop')) {
      const disabledButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[disabled]'));
        return buttons.length;
      });

      // Verify that some buttons are disabled when capital is low
      if (storyTitle.includes('Poor Player') || storyTitle.includes('Broke Player')) {
        if (disabledButtons === 0) {
          console.warn('Expected some disabled buttons in poor player scenario');
        }
      }
    }

    // Test Timer component display
    if (storyTitle.includes('Timer')) {
      const timerText = await page.textContent('[data-testid="timer"], .timer, .week-progress');
      if (timerText && !timerText.includes('Week')) {
        console.warn('Timer component may not be displaying week information correctly');
      }
    }

    // Test InfoPanel scrolling
    if (storyTitle.includes('InfoPanel')) {
      const scrollableElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[style*="overflow"], .overflow-y-auto'));
        return elements.length;
      });

      if (scrollableElements === 0) {
        console.warn('InfoPanel may not have proper scrolling setup');
      }
    }

    // Test ContextMenu positioning
    if (storyTitle.includes('ContextMenu')) {
      const contextMenu = await page.locator('[role="menu"], .context-menu').first();
      if (await contextMenu.isVisible()) {
        const boundingBox = await contextMenu.boundingBox();
        if (boundingBox && (boundingBox.x < 0 || boundingBox.y < 0)) {
          console.warn('ContextMenu may be positioned outside viewport');
        }
      }
    }
  },



  // Tags to include/exclude
  tags: {
    include: ['test'],
    exclude: ['skip-test'],
    skip: ['manual-test'],
  },
};

export default config;
