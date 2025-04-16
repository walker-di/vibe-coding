<script lang="ts">
  let { activeTab = $bindable("shapes") }: { activeTab: string } = $props();

  const tabs = [
    { id: "templates", label: "Templates", icon: "📋" },
    { id: "text", label: "Text", icon: "T" },
    { id: "photos", label: "Photos", icon: "🖼️" },
    { id: "elements", label: "Elements", icon: "⚪" },
    { id: "upload", label: "Upload", icon: "⬆️" },
    { id: "background", label: "Background", icon: "🎨" },
    { id: "layers", label: "Layers", icon: "📚" },
    { id: "resize", label: "Resize", icon: "↔️" },
    { id: "ai", label: "AI Img", icon: "🤖" },
  ];

  function tabChange(tabId: string) {
    activeTab = tabId;
  }
</script>

<div class="sidebar">
  <div class="sidebar-tabs">
    {#each tabs as tab}
      <button
        type="button"
        class="sidebar-tab"
        class:active={activeTab === tab.id}
        onclick={() => tabChange(tab.id)}
        aria-label={`Select ${tab.label} tab`}
      >
        <div class="tab-icon">{tab.icon}</div>
        <div class="tab-label">{tab.label}</div>
      </button>
    {/each}
  </div>
</div>

<style>
  .sidebar {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: hsl(var(--sidebar-background));
    border-right: 1px solid hsl(var(--sidebar-border));
    width: 80px;
    overflow: hidden;
  }

  .sidebar-tabs {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
  }

  .sidebar-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    cursor: pointer;
    color: hsl(var(--sidebar-foreground));
    transition: all 0.2s ease;
    border-radius: 4px;
    margin: 0 4px;
  }

  .sidebar-tab:hover {
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-accent-foreground));
  }

  .sidebar-tab.active {
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-primary));
  }

  .tab-icon {
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .tab-label {
    font-size: 0.7rem;
    text-align: center;
  }
</style>
