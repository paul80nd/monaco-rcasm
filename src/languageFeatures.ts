/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { LanguageServiceDefaultsImpl } from './monaco.contribution';
import { RCASMWorker as RCASMWorker } from './rcasmWorker';

import * as rcasmService from '@paul80nd/vscode-rcasm-languageservice';

import Uri = monaco.Uri;
import Position = monaco.Position;
import Range = monaco.Range;
import Thenable = monaco.Thenable;
import CancellationToken = monaco.CancellationToken;
import IDisposable = monaco.IDisposable;


export interface WorkerAccessor {
	(...more: Uri[]): Thenable<RCASMWorker>
}

// --- diagnostics --- ---

export class DiagnosticsAdapter {

	private _disposables: IDisposable[] = [];
	private _listener: { [uri: string]: IDisposable } = Object.create(null);

	constructor(private _languageId: string, private _worker: WorkerAccessor, defaults: LanguageServiceDefaultsImpl) {
		const onModelAdd = (model: monaco.editor.IModel): void => {
			const modeId = model.getModeId();
			if (modeId !== this._languageId) {
				return;
			}

			let handle: number;
			this._listener[model.uri.toString()] = model.onDidChangeContent(() => {
				clearTimeout(handle);
				handle = setTimeout(() => this._doValidate(model.uri, modeId), 500);
			});

			this._doValidate(model.uri, modeId);
		};

		const onModelRemoved = (model: monaco.editor.IModel): void => {
			monaco.editor.setModelMarkers(model, this._languageId, []);
			const uriStr = model.uri.toString();
			const listener = this._listener[uriStr];
			if (listener) {
				listener.dispose();
				delete this._listener[uriStr];
			}
		};

		this._disposables.push(monaco.editor.onDidCreateModel(onModelAdd));
		this._disposables.push(monaco.editor.onWillDisposeModel(model => {
			onModelRemoved(model);
		}));
		this._disposables.push(monaco.editor.onDidChangeModelLanguage(event => {
			onModelRemoved(event.model);
			onModelAdd(event.model);
		}));

		this._disposables.push(defaults.onDidChange(_ => {
			monaco.editor.getModels().forEach(model => {
				if (model.getModeId() === this._languageId) {
					onModelRemoved(model);
					onModelAdd(model);
				}
			});
		}));

		this._disposables.push({
			dispose: () => {
				for (const key in this._listener) {
					this._listener[key].dispose();
				}
			}
		});

		monaco.editor.getModels().forEach(onModelAdd);
	}

	public dispose(): void {
		this._disposables.forEach(d => d && d.dispose());
		this._disposables = [];
	}

	private _doValidate(resource: Uri, languageId: string): void {
		this._worker(resource).then(worker => {
			return worker.doValidation(resource.toString()).then(diagnostics => {
				const markers = diagnostics.map(d => toDiagnostics(resource, d));
				monaco.editor.setModelMarkers(monaco.editor.getModel(resource), languageId, markers);
			});
		}).then(undefined, err => {
			console.error(err);
		});
	}
}


function toSeverity(lsSeverity: number): monaco.MarkerSeverity {
	switch (lsSeverity) {
		case rcasmService.DiagnosticSeverity.Error: return monaco.MarkerSeverity.Error;
		case rcasmService.DiagnosticSeverity.Warning: return monaco.MarkerSeverity.Warning;
		case rcasmService.DiagnosticSeverity.Information: return monaco.MarkerSeverity.Info;
		case rcasmService.DiagnosticSeverity.Hint: return monaco.MarkerSeverity.Hint;
		default:
			return monaco.MarkerSeverity.Info;
	}
}

function toDiagnostics(resource: Uri, diag: rcasmService.Diagnostic): monaco.editor.IMarkerData {
	const code = typeof diag.code === 'number' ? String(diag.code) : <string>diag.code;

	return {
		severity: toSeverity(diag.severity),
		startLineNumber: diag.range.start.line + 1,
		startColumn: diag.range.start.character + 1,
		endLineNumber: diag.range.end.line + 1,
		endColumn: diag.range.end.character + 1,
		message: diag.message,
		code: code,
		source: diag.source
	};
}

// --- completion ------

function fromPosition(position: Position): rcasmService.Position {
	if (!position) {
		return void 0;
	}
	return { character: position.column - 1, line: position.lineNumber - 1 };
}

// function fromRange(range: Range): rcasmService.Range {
// 	if (!range) {
// 		return void 0;
// 	}
// 	return { start: fromPosition(range.getStartPosition()), end: fromPosition(range.getEndPosition()) };
// }

function toRange(range: rcasmService.Range): Range {
	if (!range) {
		return void 0;
	}
	return new Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
}

function toCompletionItemKind(kind: number): monaco.languages.CompletionItemKind {
	const mItemKind = monaco.languages.CompletionItemKind;

	switch (kind) {
		case rcasmService.CompletionItemKind.Text: return mItemKind.Text;
		case rcasmService.CompletionItemKind.Method: return mItemKind.Method;
		case rcasmService.CompletionItemKind.Function: return mItemKind.Function;
		case rcasmService.CompletionItemKind.Constructor: return mItemKind.Constructor;
		case rcasmService.CompletionItemKind.Field: return mItemKind.Field;
		case rcasmService.CompletionItemKind.Variable: return mItemKind.Variable;
		case rcasmService.CompletionItemKind.Class: return mItemKind.Class;
		case rcasmService.CompletionItemKind.Interface: return mItemKind.Interface;
		case rcasmService.CompletionItemKind.Module: return mItemKind.Module;
		case rcasmService.CompletionItemKind.Property: return mItemKind.Property;
		case rcasmService.CompletionItemKind.Unit: return mItemKind.Unit;
		case rcasmService.CompletionItemKind.Value: return mItemKind.Value;
		case rcasmService.CompletionItemKind.Enum: return mItemKind.Enum;
		case rcasmService.CompletionItemKind.Keyword: return mItemKind.Keyword;
		case rcasmService.CompletionItemKind.Snippet: return mItemKind.Snippet;
		case rcasmService.CompletionItemKind.Color: return mItemKind.Color;
		case rcasmService.CompletionItemKind.File: return mItemKind.File;
		case rcasmService.CompletionItemKind.Reference: return mItemKind.Reference;
	}
	return mItemKind.Property;
}

// function fromCompletionItemKind(kind: monaco.languages.CompletionItemKind): rcasmService.CompletionItemKind {
// 	const mItemKind = monaco.languages.CompletionItemKind;

// 	switch (kind) {
// 		case mItemKind.Text: return rcasmService.CompletionItemKind.Text;
// 		case mItemKind.Method: return rcasmService.CompletionItemKind.Method;
// 		case mItemKind.Function: return rcasmService.CompletionItemKind.Function;
// 		case mItemKind.Constructor: return rcasmService.CompletionItemKind.Constructor;
// 		case mItemKind.Field: return rcasmService.CompletionItemKind.Field;
// 		case mItemKind.Variable: return rcasmService.CompletionItemKind.Variable;
// 		case mItemKind.Class: return rcasmService.CompletionItemKind.Class;
// 		case mItemKind.Interface: return rcasmService.CompletionItemKind.Interface;
// 		case mItemKind.Module: return rcasmService.CompletionItemKind.Module;
// 		case mItemKind.Property: return rcasmService.CompletionItemKind.Property;
// 		case mItemKind.Unit: return rcasmService.CompletionItemKind.Unit;
// 		case mItemKind.Value: return rcasmService.CompletionItemKind.Value;
// 		case mItemKind.Enum: return rcasmService.CompletionItemKind.Enum;
// 		case mItemKind.Keyword: return rcasmService.CompletionItemKind.Keyword;
// 		case mItemKind.Snippet: return rcasmService.CompletionItemKind.Snippet;
// 		case mItemKind.Color: return rcasmService.CompletionItemKind.Color;
// 		case mItemKind.File: return rcasmService.CompletionItemKind.File;
// 		case mItemKind.Reference: return rcasmService.CompletionItemKind.Reference;
// 	}
// 	return rcasmService.CompletionItemKind.Property;
// }

function toTextEdit(textEdit: rcasmService.TextEdit): monaco.editor.ISingleEditOperation {
	if (!textEdit) {
		return void 0;
	}
	return {
		range: toRange(textEdit.range),
		text: textEdit.newText
	}
}

export class CompletionAdapter implements monaco.languages.CompletionItemProvider {

	constructor(private _worker: WorkerAccessor) {
	}

	// 	public get triggerCharacters(): string[] {
	// 		return ['.', ':', '<', '"', '=', '/'];
	// 	}

	provideCompletionItems(model: monaco.editor.IReadOnlyModel, position: Position, context: monaco.languages.CompletionContext, token: CancellationToken): Thenable<monaco.languages.CompletionList> {
		const resource = model.uri;

		return this._worker(resource).then(worker => {
			return worker.doComplete(resource.toString(), fromPosition(position));
		}).then(info => {
			if (!info) {
				return;
			}
			const wordInfo = model.getWordUntilPosition(position);
			const wordRange = new Range(position.lineNumber, wordInfo.startColumn, position.lineNumber, wordInfo.endColumn);

			const items: monaco.languages.CompletionItem[] = info.items.map(entry => {
				const item: monaco.languages.CompletionItem = {
					label: entry.label,
					insertText: entry.insertText || entry.label,
					sortText: entry.sortText,
					filterText: entry.filterText,
					documentation: entry.documentation,
					detail: entry.detail,
					range: wordRange,
					kind: toCompletionItemKind(entry.kind),
				};
				if (entry.textEdit) {
					item.range = toRange(entry.textEdit.range);
					item.insertText = entry.textEdit.newText;
				}
				if (entry.additionalTextEdits) {
					item.additionalTextEdits = entry.additionalTextEdits.map(toTextEdit)
				}
				if (entry.insertTextFormat === rcasmService.InsertTextFormat.Snippet) {
					item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
				}
				return item;
			});

			return {
				isIncomplete: info.isIncomplete,
				suggestions: items
			};
		});
	}
}

// --- hover ------

function isMarkupContent(thing: any): thing is rcasmService.MarkupContent {
	return thing && typeof thing === 'object' && typeof (<rcasmService.MarkupContent>thing).kind === 'string';
}

function toMarkdownString(entry: rcasmService.MarkupContent | rcasmService.MarkedString): monaco.IMarkdownString {
	if (typeof entry === 'string') {
		return {
			value: entry
		};
	}
	if (isMarkupContent(entry)) {
		if (entry.kind === 'plaintext') {
			return {
				value: entry.value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
			};
		}
		return {
			value: entry.value
		};
	}

	return { value: '```' + entry.language + '\n' + entry.value + '\n```\n' };
}

function toMarkedStringArray(contents: rcasmService.MarkupContent | rcasmService.MarkedString | rcasmService.MarkedString[]): monaco.IMarkdownString[] {
	if (!contents) {
		return void 0;
	}
	if (Array.isArray(contents)) {
		return contents.map(toMarkdownString);
	}
	return [toMarkdownString(contents)];
}

export class HoverAdapter implements monaco.languages.HoverProvider {

	constructor(private _worker: WorkerAccessor) {
	}

	provideHover(model: monaco.editor.IReadOnlyModel, position: Position, token: CancellationToken): Thenable<monaco.languages.Hover> {
		let resource = model.uri;

		return this._worker(resource).then(worker => {
			return worker.doHover(resource.toString(), fromPosition(position));
		}).then(info => {
			if (!info) {
				return;
			}
			return <monaco.languages.Hover>{
				range: toRange(info.range),
				contents: toMarkedStringArray(info.contents)
			};
		});
	}
}

// --- document highlights ------

function toDocumentHighlightKind(kind: number): monaco.languages.DocumentHighlightKind {
	switch (kind) {
		case rcasmService.DocumentHighlightKind.Read: return monaco.languages.DocumentHighlightKind.Read;
		case rcasmService.DocumentHighlightKind.Write: return monaco.languages.DocumentHighlightKind.Write;
		case rcasmService.DocumentHighlightKind.Text: return monaco.languages.DocumentHighlightKind.Text;
	}
	return monaco.languages.DocumentHighlightKind.Text;
}


export class DocumentHighlightAdapter implements monaco.languages.DocumentHighlightProvider {

	constructor(private _worker: WorkerAccessor) {
	}

	public provideDocumentHighlights(model: monaco.editor.IReadOnlyModel, position: Position, token: CancellationToken): Thenable<monaco.languages.DocumentHighlight[]> {
		const resource = model.uri;

		return this._worker(resource).then(worker => {
			return worker.findDocumentHighlights(resource.toString(), fromPosition(position))
		}).then(entries => {
			if (!entries) {
				return;
			}
			return entries.map(entry => {
				return <monaco.languages.DocumentHighlight>{
					range: toRange(entry.range),
					kind: toDocumentHighlightKind(entry.kind)
				};
			});
		});
	}
}

// --- document symbols ------

// function toSymbolKind(kind: rcasmService.SymbolKind): monaco.languages.SymbolKind {
// 	let mKind = monaco.languages.SymbolKind;

// 	switch (kind) {
// 		case rcasmService.SymbolKind.File: return mKind.Array;
// 		case rcasmService.SymbolKind.Module: return mKind.Module;
// 		case rcasmService.SymbolKind.Namespace: return mKind.Namespace;
// 		case rcasmService.SymbolKind.Package: return mKind.Package;
// 		case rcasmService.SymbolKind.Class: return mKind.Class;
// 		case rcasmService.SymbolKind.Method: return mKind.Method;
// 		case rcasmService.SymbolKind.Property: return mKind.Property;
// 		case rcasmService.SymbolKind.Field: return mKind.Field;
// 		case rcasmService.SymbolKind.Constructor: return mKind.Constructor;
// 		case rcasmService.SymbolKind.Enum: return mKind.Enum;
// 		case rcasmService.SymbolKind.Interface: return mKind.Interface;
// 		case rcasmService.SymbolKind.Function: return mKind.Function;
// 		case rcasmService.SymbolKind.Variable: return mKind.Variable;
// 		case rcasmService.SymbolKind.Constant: return mKind.Constant;
// 		case rcasmService.SymbolKind.String: return mKind.String;
// 		case rcasmService.SymbolKind.Number: return mKind.Number;
// 		case rcasmService.SymbolKind.Boolean: return mKind.Boolean;
// 		case rcasmService.SymbolKind.Array: return mKind.Array;
// 	}
// 	return mKind.Function;
// }

// export class DocumentSymbolAdapter implements monaco.languages.DocumentSymbolProvider {

// 	constructor(private _worker: WorkerAccessor) {
// 	}

// 	public provideDocumentSymbols(model: monaco.editor.IReadOnlyModel, token: CancellationToken): Thenable<monaco.languages.DocumentSymbol[]> {
// 		const resource = model.uri;

// 		return this._worker(resource).then(worker => worker.findDocumentSymbols(resource.toString())).then(items => {
// 			if (!items) {
// 				return;
// 			}
// 			return items.map(item => ({
// 				name: item.name,
// 				detail: '',
// 				containerName: item.containerName,
// 				kind: toSymbolKind(item.kind),
// 				tags: [],
// 				range: toRange(item.location.range),
// 				selectionRange: toRange(item.location.range)
// 			}));
// 		});
// 	}
// }

// function fromFormattingOptions(options: monaco.languages.FormattingOptions): rcasmService.FormattingOptions {
// 	return {
// 		tabSize: options.tabSize,
// 		insertSpaces: options.insertSpaces
// 	};
// }

// export class DocumentFormattingEditProvider implements monaco.languages.DocumentFormattingEditProvider {

// 	constructor(private _worker: WorkerAccessor) {
// 	}

// 	public provideDocumentFormattingEdits(model: monaco.editor.IReadOnlyModel, options: monaco.languages.FormattingOptions, token: CancellationToken): Thenable<monaco.editor.ISingleEditOperation[]> {
// 		const resource = model.uri;

// 		return this._worker(resource).then(worker => {
// 			return worker.format(resource.toString(), null, fromFormattingOptions(options)).then(edits => {
// 				if (!edits || edits.length === 0) {
// 					return;
// 				}
// 				return edits.map(toTextEdit);
// 			});
// 		});
// 	}
// }

// export class DocumentRangeFormattingEditProvider implements monaco.languages.DocumentRangeFormattingEditProvider {

// 	constructor(private _worker: WorkerAccessor) {
// 	}

// 	public provideDocumentRangeFormattingEdits(model: monaco.editor.IReadOnlyModel, range: Range, options: monaco.languages.FormattingOptions, token: CancellationToken): Thenable<monaco.editor.ISingleEditOperation[]> {
// 		const resource = model.uri;

// 		return this._worker(resource).then(worker => {
// 			return worker.format(resource.toString(), fromRange(range), fromFormattingOptions(options)).then(edits => {
// 				if (!edits || edits.length === 0) {
// 					return;
// 				}
// 				return edits.map(toTextEdit);
// 			});
// 		});
// 	}
// }

// --- definition ------

function toLocation(location: rcasmService.Location): monaco.languages.Location {
	return {
		uri: Uri.parse(location.uri),
		range: toRange(location.range)
	};
}

export class DefinitionAdapter {

	constructor(private _worker: WorkerAccessor) {
	}

	public provideDefinition(model: monaco.editor.IReadOnlyModel, position: Position, token: CancellationToken): Thenable<monaco.languages.Definition> {
		const resource = model.uri;

		return this._worker(resource).then(worker => {
			return worker.findDefinition(resource.toString(), fromPosition(position));
		}).then(definition => {
			if (!definition) {
				return;
			}
			return [toLocation(definition)];
		});
	}
}

// --- references ------

export class ReferenceAdapter implements monaco.languages.ReferenceProvider {

	constructor(private _worker: WorkerAccessor) {
	}

	provideReferences(model: monaco.editor.IReadOnlyModel, position: Position, context: monaco.languages.ReferenceContext, token: CancellationToken): Thenable<monaco.languages.Location[]> {
		const resource = model.uri;

		return this._worker(resource).then(worker => {
			return worker.findReferences(resource.toString(), fromPosition(position));
		}).then(entries => {
			if (!entries) {
				return;
			}
			return entries.map(toLocation);
		});
	}
}

function toWorkspaceEdit(edit: htmlService.WorkspaceEdit): monaco.languages.WorkspaceEdit {
	if (!edit || !edit.changes) {
		return void 0;
	}
	let resourceEdits: monaco.languages.WorkspaceTextEdit[] = [];
	for (let uri in edit.changes) {
		const _uri = Uri.parse(uri);
		for (let e of edit.changes[uri]) {
			resourceEdits.push({
				resource: _uri,
				edit: {
					range: toRange(e.range),
					text: e.newText
				}
			});
		}
	}
	return {
		edits: resourceEdits
	}
}

export class FoldingRangeAdapter implements monaco.languages.FoldingRangeProvider {

	constructor(private _worker: WorkerAccessor) {
	}

	public provideFoldingRanges(model: monaco.editor.IReadOnlyModel, context: monaco.languages.FoldingContext, token: CancellationToken): Thenable<monaco.languages.FoldingRange[]> {
		const resource = model.uri;

// --- document symbols ------

function toSymbolKind(kind: rcasmService.SymbolKind): monaco.languages.SymbolKind {
	let mKind = monaco.languages.SymbolKind;

	switch (kind) {
		case rcasmService.SymbolKind.File: return mKind.Array;
		case rcasmService.SymbolKind.Module: return mKind.Module;
		case rcasmService.SymbolKind.Namespace: return mKind.Namespace;
		case rcasmService.SymbolKind.Package: return mKind.Package;
		case rcasmService.SymbolKind.Class: return mKind.Class;
		case rcasmService.SymbolKind.Method: return mKind.Method;
		case rcasmService.SymbolKind.Property: return mKind.Property;
		case rcasmService.SymbolKind.Field: return mKind.Field;
		case rcasmService.SymbolKind.Constructor: return mKind.Constructor;
		case rcasmService.SymbolKind.Enum: return mKind.Enum;
		case rcasmService.SymbolKind.Interface: return mKind.Interface;
		case rcasmService.SymbolKind.Function: return mKind.Function;
		case rcasmService.SymbolKind.Variable: return mKind.Variable;
		case rcasmService.SymbolKind.Constant: return mKind.Constant;
		case rcasmService.SymbolKind.String: return mKind.String;
		case rcasmService.SymbolKind.Number: return mKind.Number;
		case rcasmService.SymbolKind.Boolean: return mKind.Boolean;
		case rcasmService.SymbolKind.Array: return mKind.Array;
	}
	return mKind.Function;
}

export class DocumentSymbolAdapter implements monaco.languages.DocumentSymbolProvider {

	constructor(private _worker: WorkerAccessor) {
	}

	public provideDocumentSymbols(model: monaco.editor.IReadOnlyModel, token: CancellationToken): Thenable<monaco.languages.DocumentSymbol[]> {
		const resource = model.uri;

		return this._worker(resource).then(worker => worker.findDocumentSymbols(resource.toString())).then(items => {
			if (!items) {
				return;
			}
			return items.map(item => ({
				name: item.name,
				detail: '',
				containerName: item.containerName,
				kind: toSymbolKind(item.kind),
				tags: [],
				range: toRange(item.location.range),
				selectionRange: toRange(item.location.range)
			}));
		});
	}
}

}
