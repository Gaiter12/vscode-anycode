/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, DefinitionParams, Location } from 'vscode-languageserver';
import { asCodeRange, nodeAtPosition } from '../common';
import { DocumentStore } from '../documentStore';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';

export class DefinitionProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: Connection) {
		connection.onDefinition(this.provideDefinitions.bind(this));
	}

	async provideDefinitions(params: DefinitionParams): Promise<Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri)!;
		const tree = await this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}
		const node = nodeAtPosition(tree.rootNode, params.position);
		if (!node) {
			return [];
		}

		const text = node.text;
		await this._symbols.update();

		const result: Location[] = [];
		const all = this._symbols.symbols.get(text);
		if (!all) {
			return [];
		}
		const promises: Promise<any>[] = [];
		for (const symbol of all) {
			result.push(symbol.location);
		}
		await Promise.all(promises);
		return result;
	}
}
