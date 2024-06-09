import * as vscode from 'vscode';

/**
 * CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {

    private codeLenses: vscode.CodeLens[] = [];
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        if (!vscode.workspace.getConfiguration("intorust").get("enableCodeLens", true)) {
            return [];
        }

        this.codeLenses = [];

        const groupedDiagnostic = groupDiagnosticsByLine(vscode.languages.getDiagnostics(document.uri));

        for (const lineNumber in groupedDiagnostic) {
            const diagnosticsAtLine = groupedDiagnostic[lineNumber];

            this.codeLenses.push(new vscode.CodeLens(
                new vscode.Range(Number(lineNumber), 0, Number(lineNumber), 0),
                {
                    title: "Explain errors on this line",
                    command: "intorust.explainErrors",
                    tooltip: "Explain errors on this line",
                    arguments: [
                        diagnosticsAtLine,
                    ],
                },
            ));
        }

        return this.codeLenses;
    }

    // public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
    // 	if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
    // 		codeLens.command = {
    // 			title: "Codelens provided by sample extension",
    // 			tooltip: "Tooltip provided by sample extension",
    // 			command: "codelens-sample.codelensAction",
    // 			arguments: ["Argument 1", false]
    // 		};
    // 		return codeLens;
    // 	}
    // 	return null;
    // }
}

type GroupedByLineDiagnostics = Record<string, vscode.Diagnostic[]>;


/**
 * Return diagnostics grouped by line: `Record<string, Diagnostic[]>`
 *
 * Also, excludes diagnostics according to `errorLens.excludeSources` & `errorLens.exclude` settings.
 */
function groupDiagnosticsByLine(diagnostics: vscode.Diagnostic[]): GroupedByLineDiagnostics {
    const groupedDiagnostics: GroupedByLineDiagnostics = {};
    for (const diagnostic of diagnostics) {
        const key = diagnostic.range.start.line;

        if (groupedDiagnostics[key]) {
            groupedDiagnostics[key].push(diagnostic);
        } else {
            groupedDiagnostics[key] = [diagnostic];
        }
    }
    return groupedDiagnostics;
}