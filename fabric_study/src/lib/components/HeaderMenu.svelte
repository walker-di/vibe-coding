<script lang="ts">
  // Props
  let { duration = "5.0s" } = $props<{duration?: string}>();

  // State variables
  let canUndo = $state(false);
  let canRedo = $state(false);

  // Functions for the header menu actions
  function handleUndo() {
    // Implement undo functionality
    console.log('Undo clicked');
  }

  function handleRedo() {
    // Implement redo functionality
    console.log('Redo clicked');
  }

  function handlePosition() {
    // Implement position functionality
    console.log('Position clicked');
  }

  function handleRenderVideo() {
    // Implement render video functionality
    console.log('Render video clicked');
  }
</script>

<div class="header-menu">
  <div class="left-controls">
    <button class="icon-button" title="Undo" onclick={handleUndo} disabled={!canUndo} aria-label="Undo">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7v6h6"></path>
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
      </svg>
    </button>
    <button class="icon-button" title="Redo" onclick={handleRedo} disabled={!canRedo} aria-label="Redo">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 7v6h-6"></path>
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
      </svg>
    </button>
    <div class="blank-square"></div>
  </div>

  <div class="center-controls">
    <div class="timer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>{duration}</span>
    </div>
  </div>

  <div class="right-controls">
    <button class="icon-button" title="Position" onclick={handlePosition} aria-label="Position">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 3H3v18h18V3z"></path>
        <path d="M9 9h6v6H9V9z"></path>
      </svg>
    </button>
    <button class="icon-button" title="Align" aria-label="Align">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="21" y1="6" x2="3" y2="6"></line>
        <line x1="17" y1="12" x2="7" y2="12"></line>
        <line x1="21" y1="18" x2="3" y2="18"></line>
      </svg>
    </button>
    <button class="icon-button" title="Layer" aria-label="Layer">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    </button>
    <button class="icon-button" title="Delete" aria-label="Delete">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
    <button class="icon-button" title="Help" aria-label="Help">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </button>
    <button class="render-button" onclick={handleRenderVideo}>
      Render video
    </button>
  </div>
</div>

<style>
  .header-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 16px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    height: 40px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .left-controls, .right-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .center-controls {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    color: #6c757d;
  }

  .icon-button:hover {
    background-color: #e9ecef;
    color: #495057;
  }

  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .blank-square {
    width: 20px;
    height: 20px;
    border: 1px solid #ced4da;
    background-color: white;
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #495057;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: white;
    border: 1px solid #ced4da;
  }

  .render-button {
    background-color: #4a6ee0;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-left: 8px;
  }

  .render-button:hover {
    background-color: #3a5bbf;
  }
</style>
