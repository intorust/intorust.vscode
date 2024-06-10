// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as chat from './chat';
import * as codelens from './codelens';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "intorust" is now active!');

	chat.activate(context);

	const codelensProvider = new codelens.CodelensProvider();

	vscode.languages.registerCodeLensProvider("*", codelensProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand("intorust.enableCodeLens", () => {
			vscode.workspace.getConfiguration("intorust").update("enableCodeLens", true, true);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("intorust.disableCodeLens", () => {
			vscode.workspace.getConfiguration("intorust").update("enableCodeLens", false, true);
		})
	);

	vscode.commands.registerCommand("intorust.explainErrors", (args: any) => {
		chat.explainErrorsCommand(context, args || []);
	});
}

// This method is called when your extension is deactivated
export function deactivate() { }

function explainError() {
	// The code you place here will be executed every time your command is executed
	// Display a message box to the user
	vscode.window.showInformationMessage('Hello World from IntoRust!');
}
