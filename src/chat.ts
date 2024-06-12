import * as vscode from 'vscode';
import * as advisor from './advisor';
import * as analyzer from './analyzer';
import { Console } from 'console';
import MarkdownIt from 'markdown-it';

export function activate(context: vscode.ExtensionContext) {
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(ChatPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                console.log(`Got state: ${state}`);
                // Reset the webview options so we use latest uri for `localResourceRoots`.
                webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                ChatPanel.revive(webviewPanel, context.extensionUri);
            }
        });
    }
}

export async function explainErrorsCommand(context: vscode.ExtensionContext, diagnostics: vscode.Diagnostic[]) {
    console.log(`explainErrorsCommand: ${JSON.stringify(diagnostics)}`);
    let sourceFile = await analyzer.createSourceFile();
    if (sourceFile === undefined) {
        vscode.window.showErrorMessage('rust-analyzer is not installed');
        return;
    }

    ChatPanel.createOrShow(context.extensionUri).initialPrompt(sourceFile, diagnostics);
}

/**
 * Manages cat coding webview panels
 */
class ChatPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: ChatPanel | undefined;

    public static readonly viewType = 'catCoding';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _token: vscode.CancellationTokenSource;
    private _disposables: vscode.Disposable[] = [];

    private _context: advisor.AdvisorContext;

    public static createOrShow(extensionUri: vscode.Uri): ChatPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return ChatPanel.currentPanel;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            'Into Rust',
            column || vscode.ViewColumn.One,
            getWebviewOptions(extensionUri),
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
        return ChatPanel.currentPanel;
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._token = new vscode.CancellationTokenSource();
        this._disposables.push(this._token);

        // This probably should live somewhere else eventually
        this._context = new advisor.AdvisorContext();

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'userResponse':
                        return this.followUp(message.text);
                }
            },
            null,
            this._disposables
        );
    }

    public async initialPrompt(
        sourceFile: analyzer.SourceFile,
        diagnostics: vscode.Diagnostic[]
    ) {
        const response = await advisor.initialPrompt(sourceFile, diagnostics, this._token.token, this._context);
        this.postMarkdownResponse(response);
    }

    private async followUp(userMessage: string) {
        const response = await advisor.followUp(userMessage, this._token.token, this._context);
        this.postMarkdownResponse(response);
    }

    private postMarkdownResponse(text: string) {
        this._panel.webview.postMessage({ command: 'botResponse', text: convertMarkdownToHtml(text) });
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = await this._getHtmlForWebview(webview);
    }

    private async _getHtmlForWebview(webview: vscode.Webview) {
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'script.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        const stylePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css');
        const styleUri = webview.asWebviewUri(stylePathOnDisk);

        const imagePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'ferris.svg');
        const imageUri = webview.asWebviewUri(imagePathOnDisk);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        const BOT_IMG = imageUri.toString();
        const PERSON_IMG = imageUri.toString();
        const BOT_NAME = "Ferris";
        const PERSON_NAME = "User";

        // Local path to main script run in the webview
        const indexPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'index.html');
        const htmlContentUtf8 = await vscode.workspace.fs.readFile(indexPathOnDisk);
        const htmlContent = new TextDecoder().decode(htmlContentUtf8)
            .replace("_BOT_IMG_", BOT_IMG)
            .replace("_PERSON_IMG_", PERSON_IMG)
            .replace("_BOT_NAME_", BOT_NAME)
            .replace("_PERSON_NAME_", PERSON_NAME);

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only
                    * allow loading images from our extension directory,
                    * allow scripts that have a specific nonce
                    * and allow style from our directory or inline <-- should fix?
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    style-src ${webview.cspSource} 'unsafe-inline' ; 
                    img-src ${webview.cspSource} ;
                    script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleUri}" rel="stylesheet">

				<title>Into Rust</title>
			</head>
			<body>
                ${htmlContent}

                <!-- setup some variables for the .js file below -->
                <script nonce="${nonce}">
                    const BOT_IMG = "${BOT_IMG}";
                    const PERSON_IMG = "${PERSON_IMG}";
                    const BOT_NAME = "${BOT_NAME}";
                    const PERSON_NAME = "${PERSON_NAME}";
                  </script>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        // Enable javascript in the webview
        enableScripts: true,

        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };
}

export function convertMarkdownToHtml(text: string): string {
    const md = new MarkdownIt();
    return md.render(text);
}