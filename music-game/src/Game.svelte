<script>
  import { onMount, onDestroy, tick } from "svelte";
  import Phaser from "phaser";
  import { Midi } from "@tonejs/midi";
  import * as Tone from "tone"; // Import Tone.js

  let game;
  let gameContainer;

  let score = 0;
  let isGameStarted = false;
  let beatMap = [];
  let midiData;
  let trackList = [];
  let selectedTrackIndex = null;
  let showTrackSelection = false;
  let showBeatmapVisualization = false;

  let gameState = {
    isGameStarted,
    score,
    beatMapLength: 0,
    currentTime: 0,
  };

  let syncDelay = 0; // Synchronization delay in seconds

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".mid")) {
      console.log("MIDI file selected:", file.name);
      const reader = new FileReader();
      reader.onload = async function (e) {
        const arrayBuffer = e.target.result;
        console.log("MIDI file loaded, parsing...");
        await parseMidiFile(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Please upload a valid MIDI file.");
    }
  }

  async function parseMidiFile(arrayBuffer) {
    try {
      midiData = new Midi(arrayBuffer);
      console.log("Parsed MIDI data:", midiData);

      // Populate track list
      trackList = midiData.tracks.map((track, index) => ({
        name: track.name || `Track ${index + 1}`,
        index,
        notesCount: track.notes.length,
      }));

      if (trackList.length === 0) {
        alert("No tracks found in the MIDI file.");
        return;
      }

      showTrackSelection = true;
    } catch (error) {
      console.error("Error parsing MIDI file:", error);
      alert("Error parsing MIDI file. Please try a different file.");
    }
  }

  function selectTrack(index) {
    selectedTrackIndex = index;
    showTrackSelection = false;
    extractBeatMap();
  }

  function extractBeatMap() {
    // Use the selected track
    beatMap = [];
    const track = midiData.tracks[selectedTrackIndex];
    console.log(
      `Using Track ${selectedTrackIndex} name: ${track.name}, notes: ${track.notes.length}`
    );

    if (track.notes.length === 0) {
      alert("No notes found in the selected track.");
      return;
    }

    // Adjust note times to start from zero and keep times in seconds
    const minTime = Math.min(...track.notes.map((note) => note.time));

    track.notes.forEach((note) => {
      beatMap.push({
        time: note.time - minTime, // Shift times to start at zero
        midi: note.midi,
      });
    });

    beatMap.sort((a, b) => a.time - b.time);
    console.log("Total notes collected:", beatMap.length);

    showBeatmapVisualization = true;
  }

  async function startGame() {
    isGameStarted = true;
    showBeatmapVisualization = false;
    await tick(); // Ensures DOM is updated
    initializeGame();
    await startMidiPlayback(); // Start MIDI playback after game initialization
  }

  async function startMidiPlayback() {
    await Tone.start();
    console.log("AudioContext started");

    // Create a synth and connect it to the master output
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();

    // Set the BPM to match the MIDI file's tempo
    if (midiData.header.tempos.length > 0) {
      Tone.Transport.bpm.value = midiData.header.tempos[0].bpm;
    } else {
      // Default BPM if tempo is not specified
      Tone.Transport.bpm.value = 120;
    }

    const track = midiData.tracks[selectedTrackIndex];

    // Adjust note times to start from zero
    const minTime = Math.min(...track.notes.map((note) => note.time));
    track.notes.forEach((note) => {
      note.time -= minTime; // Align to zero
    });

    // Create a Tone.Part to schedule the notes
    const part = new Tone.Part((time, note) => {
      synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
    }, track.notes).start(0);

    // Start the Transport to begin playback
    Tone.Transport.start();
  }

  async function initializeGame() {
    await tick(); // Ensures DOM is updated
    if (!gameContainer) {
      console.error("gameContainer is not ready yet!");
      return;
    }

    console.log("Initializing Phaser game, gameContainer:", gameContainer);
    const config = {
      type: Phaser.CANVAS, // Force Canvas rendering
      width: 800,
      height: 600,
      parent: gameContainer,
      backgroundColor: "#ffffff",
      physics: {
        default: "arcade",
        arcade: {
          debug: true, // Enable debug mode to see bounding boxes and physics
          gravity: { y: 0 },
        },
      },
      scene: {
        preload,
        create,
        update,
      },
    };

    game = new Phaser.Game(config);
  }

  let notes = [];
  let noteGroup;
  let noteLeadTime = 3; // Time before notes reach target area in seconds
  let targetX = 750; // Position of the target area

  function preload() {
    console.log("Phaser preload");
    // Preload assets if needed
  }

  function create() {
    console.log("Phaser create");

    // Draw target area
    this.add.rectangle(
      targetX,
      this.game.config.height / 2,
      10,
      this.game.config.height,
      0x888888
    );

    // Add score text
    this.scoreText = this.add.text(10, 10, "Score: 0", {
      fontSize: "24px",
      fill: "#000",
    });

    // Initialize note group
    noteGroup = this.physics.add.group();

    // Define updateScore as a method of the scene
    this.updateScore = () => {
      score += 100;
      this.scoreText.setText("Score: " + score);
      gameState.score = score;
    };

    // Define createNote as a method of the scene
    this.createNote = (noteData) => {
      const note = this.add.rectangle(
        0,
        this.game.config.height / 2,
        30,
        30,
        0x000000
      );

      note.hit = false;
      note.canBeHit = false;
      note.noteData = noteData;

      // Calculate velocityX so that note reaches targetX in noteLeadTime seconds
      note.velocityX = targetX / noteLeadTime;

      noteGroup.add(note);

      console.log("Note created:", note);
    };

    // Set up input handling
    this.input.keyboard.on("keydown", (event) => {
      if (event.code === "Space") {
        let hitNote = false;
        noteGroup.getChildren().forEach((note) => {
          console.log(
            `Note ID: ${note.noteData.midi}, Position: (${note.x}, ${note.y})`
          );

          if (note.canBeHit && !note.hit) {
            note.hit = true;
            note.destroy();
            hitNote = true;
          }
        });
        if (hitNote) {
          this.updateScore();
        }
      }
    });
  }

  function update(time, delta) {
    const currentTime = Tone.Transport.seconds + syncDelay; // Apply syncDelay

    gameState.currentTime = currentTime;

    // Add new notes based on the beat map
    while (
      beatMap.length > 0 &&
      currentTime + noteLeadTime >= beatMap[0].time
    ) {
      const noteData = beatMap.shift();
      this.createNote(noteData);
      gameState.beatMapLength = beatMap.length;
    }

    // Update notes
    noteGroup.getChildren().forEach((note) => {
      note.x += note.velocityX * (delta / 1000); // delta is in milliseconds
      if (!note.hit && note.x >= targetX - 20 && note.x <= targetX + 20) {
        note.canBeHit = true;
      } else {
        note.canBeHit = false;
      }

      // Remove notes that have passed beyond the screen
      if (note.x > this.game.config.width) {
        if (!note.hit) {
          note.destroy();
        }
      }
    });
  }

  onDestroy(() => {
    console.log("Svelte component destroyed");
    // Clean up Phaser game instance
    if (game) {
      game.destroy(true);
    }
    // Stop Tone.Transport
    Tone.Transport.stop();
  });

  $: gameState.isGameStarted = isGameStarted;
  $: gameState.score = score;
</script>

{#if !isGameStarted && !showTrackSelection && !showBeatmapVisualization}
  <div class="upload-container">
    <h2>Upload a MIDI file to start the game</h2>
    <input type="file" accept=".mid" on:change={handleFileUpload} />
  </div>
{/if}

{#if showTrackSelection}
  <div class="track-selection">
    <h2>Select a Track</h2>
    <ul>
      {#each trackList as track}
        <li>
          <button on:click={() => selectTrack(track.index)}>
            {track.name} (Notes: {track.notesCount})
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if showBeatmapVisualization}
  <div class="beatmap-visualization">
    <h2>Beatmap Visualization</h2>
    <div class="beatmap-container">
      <!-- Simple visualization of the beatmap -->
      {#each beatMap as note}
        <div
          class="note"
          style="left: {(note.time / beatMap[beatMap.length - 1].time) * 100}%"
        ></div>
      {/each}
    </div>
    <button on:click={startGame}>Start Game</button>
  </div>
{/if}

{#if isGameStarted}
  <div class="sync-slider">
    <label for="syncDelay"
      >Adjust Sync Delay (seconds): {syncDelay.toFixed(2)}</label
    >
    <input
      type="range"
      id="syncDelay"
      min="-1"
      max="1"
      step="0.01"
      bind:value={syncDelay}
    />
  </div>
{/if}

<div bind:this={gameContainer} class="game-container"></div>

<!-- Display the game state -->
<pre>{JSON.stringify(gameState, null, 2)}</pre>

<style>
  .upload-container {
    text-align: center;
    margin-top: 50px;
  }

  input[type="file"] {
    font-size: 18px;
  }

  .game-container {
    width: 800px;
    height: 600px;
    margin: 0 auto;
    border: 2px solid red;
  }

  .track-selection {
    text-align: center;
    margin-top: 50px;
  }

  .track-selection ul {
    list-style: none;
    padding: 0;
  }

  .track-selection li {
    margin: 10px 0;
  }

  .track-selection button {
    font-size: 18px;
    padding: 10px 20px;
  }

  .beatmap-visualization {
    text-align: center;
    margin-top: 50px;
  }

  .beatmap-container {
    position: relative;
    width: 80%;
    height: 50px;
    margin: 20px auto;
    background-color: #f0f0f0;
    overflow: hidden;
  }

  .note {
    position: absolute;
    top: 0;
    width: 2px;
    height: 50px;
    background-color: #000;
  }

  .beatmap-visualization button {
    font-size: 18px;
    padding: 10px 20px;
  }

  .sync-slider {
    text-align: center;
    margin: 20px;
  }

  .sync-slider label {
    font-size: 18px;
    margin-right: 10px;
  }

  .sync-slider input[type="range"] {
    width: 300px;
  }

  pre {
    background-color: #f0f0f0;
    padding: 1rem;
    margin: 1rem;
    overflow: auto;
    max-height: 200px;
  }
</style>
