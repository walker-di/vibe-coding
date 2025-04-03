import { writable } from 'svelte/store';
import { browser } from '$app/environment'; // To check if we are in the browser

// List of available Brazilian Portuguese voices
export const ptBRVoices = [
	{ name: 'Francisca (Feminino)', value: 'pt-BR-FranciscaNeural' },
	{ name: 'Antonio (Masculino)', value: 'pt-BR-AntonioNeural' },
	{ name: 'Macerio (Masculino, Multilingual)', value: 'pt-BR-MacerioMultilingualNeural' }, // Assuming 4 is part of the name description, not the value
	{ name: 'Thalita (Feminino, Multilingual)', value: 'pt-BR-ThalitaMultilingualNeural' }, // Assuming 4 is part of the name description, not the value
	{ name: 'Brenda (Feminino)', value: 'pt-BR-BrendaNeural' },
	{ name: 'Donato (Masculino)', value: 'pt-BR-DonatoNeural' },
	{ name: 'Elza (Feminino)', value: 'pt-BR-ElzaNeural' },
	{ name: 'Fabio (Masculino)', value: 'pt-BR-FabioNeural' },
	{ name: 'Giovanna (Feminino)', value: 'pt-BR-GiovannaNeural' },
	{ name: 'Humberto (Masculino)', value: 'pt-BR-HumbertoNeural' },
	{ name: 'Julio (Masculino)', value: 'pt-BR-JulioNeural' },
	{ name: 'Leila (Feminino)', value: 'pt-BR-LeilaNeural' },
	{ name: 'Leticia (Feminino)', value: 'pt-BR-LeticiaNeural' },
	{ name: 'Manuela (Feminino)', value: 'pt-BR-ManuelaNeural' },
	{ name: 'Nicolau (Masculino)', value: 'pt-BR-NicolauNeural' },
	{ name: 'Thalita (Feminino)', value: 'pt-BR-ThalitaNeural' },
	{ name: 'Valerio (Masculino)', value: 'pt-BR-ValerioNeural' },
	{ name: 'Yara (Feminino)', value: 'pt-BR-YaraNeural' }
];

const defaultVoice = 'pt-BR-FranciscaNeural';
const storageKey = 'selectedVoice';

// Get initial value from localStorage if in browser, otherwise use default
let initialValue = defaultVoice;
if (browser) {
	const storedValue = localStorage.getItem(storageKey);
	// Check if the stored value is actually one of the valid voices
	if (storedValue && ptBRVoices.some(v => v.value === storedValue)) {
		initialValue = storedValue;
	}
}

// Create the writable store
export const selectedVoice = writable<string>(initialValue);

// Subscribe to changes and update localStorage if in browser
if (browser) {
	selectedVoice.subscribe((value) => {
		localStorage.setItem(storageKey, value);
	});
}
