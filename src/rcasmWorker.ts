/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import IWorkerContext = monaco.worker.IWorkerContext;

import Thenable = monaco.Thenable;

import * as rcasmService from '@paul80nd/vscode-rcasm-languageservice';

import * as poli from './fillers/polyfills';

poli.polyfill();

export class RCASMWorker {

	private _ctx: IWorkerContext;
	private _languageService: rcasmService.LanguageService;
	private _languageSettings: monaco.languages.rcasm.Options;
	private _languageId: string;

	constructor(ctx: IWorkerContext, createData: ICreateData) {
		this._ctx = ctx;
		this._languageSettings = createData.languageSettings;
		this._languageId = createData.languageId;
		this._languageService = rcasmService.getLanguageService();
	}

	doValidation(uri: string): Thenable<rcasmService.Diagnostic[]> {
		let document = this._getTextDocument(uri);
		if (document) {
			let program = this._languageService.parseProgram(document);
			let diagnostics = this._languageService.doValidation(document, program);
			return Promise.resolve(diagnostics)
		}
		return Promise.resolve([]);
	}

	doComplete(uri: string, position: rcasmService.Position): Thenable<rcasmService.CompletionList> {
		let document = this._getTextDocument(uri);
		let program = this._languageService.parseProgram(document);
		return Promise.resolve(this._languageService.doComplete(document, position, program  /*,this._languageSettings && this._languageSettings.suggest*/));
	}
	//format(uri: string, range: rcasmService.Range, options: rcasmService.FormattingOptions): Thenable<rcasmService.TextEdit[]> {
	// 	let document = this._getTextDocument(uri);
	// 	let textEdits = this._languageService.format(document, range, this._languageSettings && this._languageSettings.format);
	// 	return Promise.resolve(textEdits);
	// }
	doHover(uri: string, position: rcasmService.Position): Thenable<rcasmService.Hover> {
		let document = this._getTextDocument(uri);
		let program = this._languageService.parseProgram(document);
		let hover = this._languageService.doHover(document, position, program);
		return Promise.resolve(hover);
	}
	// findDocumentHighlights(uri: string, position: rcasmService.Position): Thenable<rcasmService.DocumentHighlight[]> {
	// 	let document = this._getTextDocument(uri);
	// 	let htmlDocument = this._languageService.parseHTMLDocument(document);
	// 	let highlights = this._languageService.findDocumentHighlights(document, position, htmlDocument);
	// 	return Promise.resolve(highlights);
	// }
	// findDocumentLinks(uri: string): Thenable<rcasmService.DocumentLink[]> {
	// 	let document = this._getTextDocument(uri);
	// 	let links = this._languageService.findDocumentLinks(document, null);
	// 	return Promise.resolve(links);
	// }
	// findDocumentSymbols(uri: string): Thenable<rcasmService.SymbolInformation[]> {
	// 	let document = this._getTextDocument(uri);
	// 	let htmlDocument = this._languageService.parseHTMLDocument(document);
	// 	let symbols = this._languageService.findDocumentSymbols(document, htmlDocument);
	// 	return Promise.resolve(symbols);
	// }
	// getFoldingRanges(uri: string, context?: { rangeLimit?: number; }): Thenable<rcasmService.FoldingRange[]> {
	// 	let document = this._getTextDocument(uri);
	// 	let ranges = this._languageService.getFoldingRanges(document, context);
	// 	return Promise.resolve(ranges);
	// }
	// getSelectionRanges(uri: string, positions: rcasmService.Position[]): Thenable<rcasmService.SelectionRange[]> {
	// 	let document = this._getTextDocument(uri);
	// 	let ranges = this._languageService.getSelectionRanges(document, positions);
	// 	return Promise.resolve(ranges);
	// }
	// doRename(uri: string, position: rcasmService.Position, newName: string): Thenable<rcasmService.WorkspaceEdit> {
	// 	let document = this._getTextDocument(uri);
	// 	let htmlDocument = this._languageService.parseHTMLDocument(document);
	// 	let renames = this._languageService.doRename(document, position, newName, htmlDocument);
	// 	return Promise.resolve(renames);
	// }
	private _getTextDocument(uri: string): rcasmService.TextDocument {
		let models = this._ctx.getMirrorModels();
		for (let model of models) {
			if (model.uri.toString() === uri) {
				return rcasmService.TextDocument.create(uri, this._languageId, model.version, model.getValue());
			}
		}
		return null;
	}
}

export interface ICreateData {
	languageId: string;
	languageSettings: monaco.languages.rcasm.Options;
}

export function create(ctx: IWorkerContext, createData: ICreateData): RCASMWorker {
	return new RCASMWorker(ctx, createData);
}
