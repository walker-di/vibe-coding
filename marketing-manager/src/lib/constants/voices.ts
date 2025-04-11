// List of available Brazilian Portuguese voices
export const ptBRVoices = [
	{ name: 'Francisca (Feminino)', value: 'pt-BR-FranciscaNeural' },
	{ name: 'Antonio (Masculino)', value: 'pt-BR-AntonioNeural' },
	{ name: 'Macerio (Masculino, Multilingual)', value: 'pt-BR-MacerioMultilingualNeural' },
	{ name: 'Thalita (Feminino, Multilingual)', value: 'pt-BR-ThalitaMultilingualNeural' },
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

// Default English voices
export const enUSVoices = [
	{ name: 'Jenny (Female)', value: 'en-US-JennyNeural' },
	{ name: 'Guy (Male)', value: 'en-US-GuyNeural' },
	{ name: 'Aria (Female)', value: 'en-US-AriaNeural' },
	{ name: 'Davis (Male)', value: 'en-US-DavisNeural' }
];

// All available voices grouped by language
export const allVoices = {
	'pt-BR': ptBRVoices,
	'en-US': enUSVoices
};

// Default voice by language
export const defaultVoices = {
	'pt-BR': 'pt-BR-FranciscaNeural',
	'en-US': 'en-US-JennyNeural'
};
