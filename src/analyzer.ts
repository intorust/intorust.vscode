import * as vscode from 'vscode';
import * as client from 'vscode-languageclient';
import { BaseLanguageClient as LanguageClient } from 'vscode-languageclient';

export async function createSourceFile(): Promise<SourceFile | undefined> {
    let rustAnalyzer = vscode.extensions.getExtension('rust-lang.rust-analyzer');
    if (!rustAnalyzer) {
        return undefined;
    }
    if (!rustAnalyzer.isActive) {
        await rustAnalyzer.activate();
    }

    let api: LanguageClient = rustAnalyzer.exports.client;
    return new SourceFile(api);
}

/// This is what I observe in response to the query below.
/// Oddly it is not quite the same as the SymbolInformation found in
/// vscode-languageclient.
interface SymbolInformation {
    name: string;
    kind: client.SymbolKind;
    range: SymbolRange;
    detail: string;
}

interface SymbolRange {
    start: SymbolPosition,
    end: SymbolPosition,
}

interface SymbolPosition {
    line: number,
    character: number,
}

export class SourceFile {
    private client: LanguageClient;

    constructor(api: LanguageClient) {
        this.client = api;
    }

    async getCurrentFunction(): Promise<SourceFunction | undefined> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;

        const textDocumentIdentifier: client.TextDocumentIdentifier = { uri: document.uri.toString() };
        const params: client.DocumentSymbolParams = { textDocument: textDocumentIdentifier };

        let symbols: SymbolInformation[] = await this.client.sendRequest('textDocument/documentSymbol', params);
        const functionSymbols = symbols.filter(symbol => symbol.kind === client.SymbolKind.Function);

        for (const symbol of functionSymbols) {
            if (contains(symbol.range, position)) {
                return new SourceFunction(this, document, symbol);
            }
        }

        return undefined;
    }
}

export class SourceFunction {
    private file: SourceFile;
    private document: vscode.TextDocument;
    private symbol: SymbolInformation;

    constructor(file: SourceFile, document: vscode.TextDocument, symbol: SymbolInformation) {
        this.file = file;
        this.document = document;
        this.symbol = symbol;
    }

    get name() {
        return this.symbol.name;
    }

    get sourceText(): string {
        return this.document.getText(vscodeRange(this.symbol.range));
    }
}

function vscodeRange(range: SymbolRange): vscode.Range {
    let start = new vscode.Position(range.start.line, range.start.character);
    let end = new vscode.Position(range.end.line, range.end.character);
    return new vscode.Range(start, end);
}

function contains(symbolRange: SymbolRange, position: vscode.Position): boolean {
    let range = vscodeRange(symbolRange);
    return range.start.isBefore(position) && range.end.isAfter(position);
}