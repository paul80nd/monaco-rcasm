/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { LanguageServiceDefaultsImpl } from './monaco.contribution';
import { RCASMWorker } from './rcasmWorker';

import IDisposable = monaco.IDisposable;
import Uri = monaco.Uri;

const STOP_WHEN_IDLE_FOR = 2 * 60 * 1000; // 2min

export class WorkerManager {

	private _defaults: LanguageServiceDefaultsImpl;
	private _idleCheckInterval: number;
	private _lastUsedTime: number;
	private _configChangeListener: IDisposable;

	private _worker: monaco.editor.MonacoWebWorker<RCASMWorker>;
	private _client: Promise<RCASMWorker>;

	constructor(defaults: LanguageServiceDefaultsImpl) {
		this._defaults = defaults;
		this._worker = null;
		this._idleCheckInterval = setInterval(() => this._checkIfIdle(), 30 * 1000);
		this._lastUsedTime = 0;
		this._configChangeListener = this._defaults.onDidChange(() => this._stopWorker());
	}

	private _stopWorker(): void {
		if (this._worker) {
			this._worker.dispose();
			this._worker = null;
		}
		this._client = null;
	}

	dispose(): void {
		clearInterval(this._idleCheckInterval);
		this._configChangeListener.dispose();
		this._stopWorker();
	}

	private _checkIfIdle(): void {
		if (!this._worker) {
			return;
		}
		let timePassedSinceLastUsed = Date.now() - this._lastUsedTime;
		if (timePassedSinceLastUsed > STOP_WHEN_IDLE_FOR) {
			this._stopWorker();
		}
	}

	private _getClient(): Promise<RCASMWorker> {
		this._lastUsedTime = Date.now();

		if (!this._client) {
			this._worker = monaco.editor.createWebWorker<RCASMWorker>({

				// module that exports the create() method and returns a `RCASMWorker` instance
				moduleId: 'vs/language/rcasm/rcasmWorker',

				// passed in to the create() method
				createData: {
					languageSettings: this._defaults.options,
					languageId: this._defaults.languageId
				},

				label: this._defaults.languageId
			});

			this._client = <Promise<RCASMWorker>>this._worker.getProxy();
		}

		return this._client;
	}

	getLanguageServiceWorker(...resources: Uri[]): Promise<RCASMWorker> {
		let _client: RCASMWorker;
		return this._getClient().then((client) => {
			_client = client
		}).then(_ => {
			return this._worker.withSyncedResources(resources)
		}).then(_ => _client);
	}
}
