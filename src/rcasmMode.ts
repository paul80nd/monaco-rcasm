/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { WorkerManager } from './workerManager';
import { RCASMWorker } from './rcasmWorker';
import { LanguageServiceDefaultsImpl } from './monaco.contribution';
import * as languageFeatures from './languageFeatures';

import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;

export function setupMode(defaults: LanguageServiceDefaultsImpl): IDisposable {

	const disposables: IDisposable[] = [];
	const providers: IDisposable[] = [];

	const client = new WorkerManager(defaults);
	disposables.push(client);

	const worker: languageFeatures.WorkerAccessor = (...uris: Uri[]): Promise<RCASMWorker> => {
		return client.getLanguageServiceWorker(...uris);
	};

	function registerProviders(): void {
		const { languageId, modeConfiguration } = defaults;

		disposeAll(providers);

		if (modeConfiguration.completionItems) {
			providers.push(monaco.languages.registerCompletionItemProvider(languageId, new languageFeatures.CompletionAdapter(worker)));
		}
		if (modeConfiguration.hovers) {
			providers.push(monaco.languages.registerHoverProvider(languageId, new languageFeatures.HoverAdapter(worker)));
		}
		if (modeConfiguration.definitions) {
			providers.push(monaco.languages.registerDefinitionProvider(languageId, new languageFeatures.DefinitionAdapter(worker)));
		}
		if (modeConfiguration.references) {
			providers.push(monaco.languages.registerReferenceProvider(languageId, new languageFeatures.ReferenceAdapter(worker)));
		}
		if (modeConfiguration.documentHighlights) {
			providers.push(monaco.languages.registerDocumentHighlightProvider(languageId, new languageFeatures.DocumentHighlightAdapter(worker)));
		}
		if (modeConfiguration.documentSymbols) {
			providers.push(monaco.languages.registerDocumentSymbolProvider(languageId, new languageFeatures.DocumentSymbolAdapter(worker)));
		}
		// if (modeConfiguration.rename) {
		// 	providers.push(monaco.languages.registerRenameProvider(languageId, new languageFeatures.RenameAdapter(worker)));
		// }
		// if (modeConfiguration.foldingRanges) {
		// 	providers.push(monaco.languages.registerFoldingRangeProvider(languageId, new languageFeatures.FoldingRangeAdapter(worker)));
		// }
		// if (modeConfiguration.selectionRanges) {
		// 	providers.push(monaco.languages.registerSelectionRangeProvider(languageId, new languageFeatures.SelectionRangeAdapter(worker)));
		// }
		// if (modeConfiguration.documentFormattingEdits) {
		// 	providers.push(monaco.languages.registerDocumentFormattingEditProvider(languageId, new languageFeatures.DocumentFormattingEditProvider(worker)));
		// }
		// if (modeConfiguration.documentRangeFormattingEdits) {
		// 	providers.push(monaco.languages.registerDocumentRangeFormattingEditProvider(languageId, new languageFeatures.DocumentRangeFormattingEditProvider(worker)));
		// }
		if (modeConfiguration.diagnostics) {
			providers.push(new languageFeatures.DiagnosticsAdapter(languageId, worker, defaults));
		}
	}

	registerProviders();


	disposables.push(asDisposable(providers));

	return asDisposable(disposables);
}

function asDisposable(disposables: IDisposable[]): IDisposable {
	return { dispose: () => disposeAll(disposables) };
}

function disposeAll(disposables: IDisposable[]) {
	while (disposables.length) {
		disposables.pop().dispose();
	}
}
