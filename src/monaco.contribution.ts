/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as mode from './rcasmMode';

import Emitter = monaco.Emitter;
import IEvent = monaco.IEvent;

// --- RCASM configuration and defaults ---------

export class LanguageServiceDefaultsImpl implements monaco.languages.rcasm.LanguageServiceDefaults {

	private _onDidChange = new Emitter<monaco.languages.rcasm.LanguageServiceDefaults>();
	private _options: monaco.languages.rcasm.Options;
	private _modeConfiguration: monaco.languages.rcasm.ModeConfiguration;
	private _languageId: string;

	constructor(languageId: string, options: monaco.languages.rcasm.Options, modeConfiguration: monaco.languages.rcasm.ModeConfiguration) {
		this._languageId = languageId;
		this.setOptions(options);
		this.setModeConfiguration(modeConfiguration);
	}

	get onDidChange(): IEvent<monaco.languages.rcasm.LanguageServiceDefaults> {
		return this._onDidChange.event;
	}

	get languageId(): string {
		return this._languageId;
	}

	get options(): monaco.languages.rcasm.Options {
		return this._options;
	}

	get modeConfiguration(): monaco.languages.rcasm.ModeConfiguration {
		return this._modeConfiguration;
	}

	setOptions(options: monaco.languages.rcasm.Options): void {
		this._options = options || Object.create(null);
		this._onDidChange.fire(this);
	}

	setModeConfiguration(modeConfiguration: monaco.languages.rcasm.ModeConfiguration): void {
		this._modeConfiguration = modeConfiguration || Object.create(null);
		this._onDidChange.fire(this);
	};
}

// const formatDefaults: Required<monaco.languages.rcasm.HTMLFormatConfiguration> = {
// 	tabSize: 4,
// 	insertSpaces: false,
// 	wrapLineLength: 120,
// 	unformatted: 'default": "a, abbr, acronym, b, bdo, big, br, button, cite, code, dfn, em, i, img, input, kbd, label, map, object, q, samp, select, small, span, strong, sub, sup, textarea, tt, var',
// 	contentUnformatted: 'pre',
// 	indentInnerHtml: false,
// 	preserveNewLines: true,
// 	maxPreserveNewLines: null,
// 	indentHandlebars: false,
// 	endWithNewline: false,
// 	extraLiners: 'head, body, /html',
// 	wrapAttributes: 'auto'
// };

const rcasmOptionsDefault: Required<monaco.languages.rcasm.Options> = {
	// 	format: formatDefaults,
	// 	suggest: { html5: true, angular1: true, ionic: true }
}

// const handlebarOptionsDefault: Required<monaco.languages.rcasm.Options> = {
// 	format: formatDefaults,
// 	suggest: { html5: true }
// }

// const razorOptionsDefault: Required<monaco.languages.rcasm.Options> = {
// 	format: formatDefaults,
// 	suggest: { html5: true, razor: true }
// }

function getConfigurationDefault(languageId: string): Required<monaco.languages.rcasm.ModeConfiguration> {
	return {
		completionItems: true,
		hovers: true,
		// documentSymbols: true,
		// links: true,
		// documentHighlights: true,
		// rename: true,
		// colors: true,
		// foldingRanges: true,
		// selectionRanges: true,
		diagnostics: languageId === rcasmLanguageId, // turned off for Razor and Handlebar
		//		documentFormattingEdits: languageId === rcasmLanguageId, // turned off for Razor and Handlebar
		//		documentRangeFormattingEdits: languageId === rcasmLanguageId // turned off for Razor and Handlebar
	};
}

const rcasmLanguageId = 'rcasm';
// const handlebarsLanguageId = 'handlebars';
// const razorLanguageId = 'razor';

const rcasmDefaults = new LanguageServiceDefaultsImpl(rcasmLanguageId, rcasmOptionsDefault, getConfigurationDefault(rcasmLanguageId));
// const handlebarDefaults = new LanguageServiceDefaultsImpl(handlebarsLanguageId, handlebarOptionsDefault, getConfigurationDefault(handlebarsLanguageId));
// const razorDefaults = new LanguageServiceDefaultsImpl(razorLanguageId, razorOptionsDefault, getConfigurationDefault(razorLanguageId));

// Export API
function createAPI(): typeof monaco.languages.rcasm {
	return {
		rcasmDefaults: rcasmDefaults,
		//		razorDefaults: razorDefaults,
		//		handlebarDefaults: handlebarDefaults
	}
}
monaco.languages.rcasm = createAPI();

// --- Registration to monaco editor ---

function getMode(): Promise<typeof mode> {
	return import('./rcasmMode');
}

monaco.languages.onLanguage(rcasmLanguageId, () => {
	getMode().then(mode => mode.setupMode(rcasmDefaults));
});
// monaco.languages.onLanguage(handlebarsLanguageId, () => {
// 	getMode().then(mode => mode.setupMode(handlebarDefaults));
// });
// monaco.languages.onLanguage(razorLanguageId, () => {
// 	getMode().then(mode => mode.setupMode(razorDefaults));
// });
