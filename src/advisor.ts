import * as vscode from 'vscode';

export async function initialPrompt(
    diagnostics: vscode.Diagnostic[],
    token: vscode.CancellationToken,
): Promise<string> {
    const errorMessage = diagnostics.map(diagnostic => diagnostic.message).join('\n');

    const messages = [
        vscode.LanguageModelChatMessage.User(`
            I are a novice Rust user looking to learn more about Rust.
            Please respond in a friendly tone with details.
            I have just gotten an error message that you don't understand.
            I would like to understand the cause of the error better and how to fix it.
            The error message is contained in this markdown fragment:
            ${'```'}
            ${errorMessage}
            ${'```'}
        `),
    ];

    return await sendRequest(messages, token);
}

export async function followUp(
    userMessage: string,
    token: vscode.CancellationToken,
): Promise<string> {
    const messages = [
        vscode.LanguageModelChatMessage.User(`
            ${userMessage}
        `),
    ];

    return await sendRequest(messages, token);
}

async function sendRequest(messages: vscode.LanguageModelChatMessage[], token: vscode.CancellationToken): Promise<string> {
    const availableModels = await vscode.lm.selectChatModels();
    if (availableModels.length > 0) {
        const model = availableModels[0];
        const chatResponse = await model.sendRequest(messages, {}, token);
        let fullResponse = '';
        for await (const fragment of chatResponse.text) {
            fullResponse += fragment;
        }
        return fullResponse;
    } else {
        return "Sorry, I could not find an available language model.";
    }
}