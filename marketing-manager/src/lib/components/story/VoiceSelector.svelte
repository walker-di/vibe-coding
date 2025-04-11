<script lang="ts">
  import { ptBRVoices, enUSVoices } from '$lib/constants/voices';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import { Mic } from 'lucide-svelte';

  // Props
  let {
    selectedVoice = $bindable('pt-BR-FranciscaNeural'),
    language = $bindable('pt-BR')
  } = $props<{
    selectedVoice?: string | null;
    language?: 'pt-BR' | 'en-US';
  }>();

  // Ensure selectedVoice is never null
  $effect(() => {
    if (!selectedVoice) {
      selectedVoice = 'pt-BR-FranciscaNeural';
    }
  });

  // Computed property for available voices based on language
  $effect(() => {
    if (language === 'en-US' && selectedVoice && !selectedVoice.startsWith('en-US')) {
      selectedVoice = 'en-US-JennyNeural'; // Default English voice
    } else if (language === 'pt-BR' && selectedVoice && !selectedVoice.startsWith('pt-BR')) {
      selectedVoice = 'pt-BR-FranciscaNeural'; // Default Portuguese voice
    }
  });

  // Get the appropriate voice list based on language
  function getVoiceOptions() {
    return language === 'pt-BR' ? ptBRVoices : enUSVoices;
  }
</script>

<div class="space-y-2">
  <Label for="voice-selector" class="flex items-center">
    <Mic class="h-4 w-4 mr-2" />
    <span>Voice</span>
  </Label>

  <div class="flex gap-2">
    <Select.Root bind:value={language} type="single" class="w-1/3">
      <Select.Trigger id="language-selector">
        {#if language === 'pt-BR'}
          Portuguese (BR)
        {:else if language === 'en-US'}
          English (US)
        {:else}
          <Select.Value placeholder="Select language" />
        {/if}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="pt-BR">Portuguese (BR)</Select.Item>
        <Select.Item value="en-US">English (US)</Select.Item>
      </Select.Content>
    </Select.Root>

    <Select.Root bind:value={selectedVoice} type="single" class="flex-1">
      <Select.Trigger id="voice-selector">
        {#if selectedVoice}
          {getVoiceOptions().find(v => v.value === selectedVoice)?.name || selectedVoice}
        {:else}
          <Select.Value placeholder="Select voice" />
        {/if}
      </Select.Trigger>
      <Select.Content>
        {#each getVoiceOptions() as voice}
          <Select.Item value={voice.value}>{voice.name}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <p class="text-xs text-muted-foreground">
    Select the voice that will be used to generate the narration audio.
  </p>
</div>
