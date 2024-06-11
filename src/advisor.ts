import * as vscode from 'vscode';
import * as analyzer from './analyzer';

export class AdvisorContext {
    public messages: vscode.LanguageModelChatMessage[];

    public constructor() {
        this.messages = [];
    }
}

export async function initialPrompt(
    sourceFile: analyzer.SourceFile,
    diagnostics: vscode.Diagnostic[],
    token: vscode.CancellationToken,
    context: AdvisorContext
): Promise<string> {
    const errorMessage = diagnostics.map(diagnostic => diagnostic.message).join('\n');

    context.messages.push(
        vscode.LanguageModelChatMessage.Assistant(`
            You are Ferris, a friendly code helper who is an expert in Rust programming.
            You can assist in Rust-related questions, provide documenatation, and give troubleshooting advice.
            You are here to help explain the error message provided that the user doesn't understand.
            You are here to explain cause of the error better and how to fix it.
        `),
    );

    let currentFunction = await sourceFile.getCurrentFunction();
    if (currentFunction !== undefined) {
        context.messages.push(
            vscode.LanguageModelChatMessage.User(`
                The source of the current function is
                
                ${'```'}
                ${currentFunction.sourceText}
                ${'```'}
            `)
        );
    }

    context.messages.push(
        vscode.LanguageModelChatMessage.User(`
            The error message is contained in this markdown fragment:
            ${'```'}
            ${errorMessage}
            ${'```'}
        `)
    );

    return await sendRequest(context, token);
}

export async function followUp(
    userMessage: string,
    token: vscode.CancellationToken,
    context: AdvisorContext
): Promise<string> {
    context.messages.push(
        vscode.LanguageModelChatMessage.User(`
            Please use Rust for any code-related quesitons and responses.
            ${userMessage}
        `)
    );

    return await sendRequest(context, token);
}

async function sendRequest(context: AdvisorContext,
    token: vscode.CancellationToken,
): Promise<string> {
    const availableModels = await vscode.lm.selectChatModels();
    if (availableModels.length > 0) {
        const model = availableModels[0];
        const chatResponse = await model.sendRequest(context.messages, {}, token);
        let fullResponse = '';
        for await (const fragment of chatResponse.text) {
            fullResponse += fragment;
        }
        context.messages.push(vscode.LanguageModelChatMessage.Assistant(fullResponse));
        return fullResponse;
    } else {
        return "Sorry, I could not find an available language model.";
    }
}
