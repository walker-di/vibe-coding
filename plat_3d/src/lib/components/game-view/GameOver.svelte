<script lang="ts">
    export let show = false;
    export let onNextLevel;
  </script>
  
  {#if show}
    <div class="game-over">
      <h2>Nível Concluído!</h2>
      <button on:click={onNextLevel}>Continuar</button>
    </div>
  {/if}
  
  <style>
    .game-over {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 20px;
      border-radius: 5px;
      text-align: center;
      z-index: 200;
    }
  
    button {
      padding: 8px 12px;
      cursor: pointer;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      margin-top: 10px;
    }
  
    button:hover {
      background-color: #45a049;
    }
  </style>