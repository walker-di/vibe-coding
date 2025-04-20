<script lang="ts">
    // Props
    export let isEditorMode;
    export let selectedObjectType;
    export let toggleMode;
    export let handleObjectTypeChange;
    export let saveLevel;
    export let loadLevel;
    export let newLevel;
  </script>
  
  <div class="interface">
    <h3>Platformer Editor</h3>
    <div>
      <label for="objectType">Tipo de Objeto:</label>
      <select id="objectType" value={selectedObjectType} on:change={handleObjectTypeChange}>
        <option value="platform">Plataforma</option>
        <option value="obstacle">Obstáculo</option>
        <option value="goal">Objetivo</option>
      </select>
    </div>
    <button on:click={toggleMode}>
      Modo: {isEditorMode ? 'Editor' : 'Jogo'}
    </button>
    <button on:click={saveLevel}>Salvar Nível</button>
    <button on:click={loadLevel}>Carregar Nível</button>
    <button on:click={newLevel}>Novo Nível</button>
    <div class="instructions">
      <p>Editor: Clique para adicionar objetos</p>
      <p>Jogo: Use WASD para mover, ESPAÇO para pular</p>
      <p>Câmera: Use Q e E para rotacionar</p>
    </div>
  </div>
  
  <style>
    .interface {
      position: absolute;
      top: 10px;
      left: 10px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      padding: 10px;
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100;
    }
  
    button {
      padding: 8px 12px;
      cursor: pointer;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
    }
  
    button:hover {
      background-color: #45a049;
    }
  
    select {
      padding: 8px;
    }
  
    .instructions {
      font-size: 0.9em;
    }
  </style>