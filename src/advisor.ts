import * as vscode from 'vscode';

export async function getResponse(
    errorMessage: string,
    token: vscode.CancellationToken,
): Promise<string> {
    const availableModels = await vscode.lm.selectChatModels();
    if (availableModels.length > 0) {
        const model = availableModels[0];
        const messages = [
            vscode.LanguageModelChatMessage.User(`
                You are a novice Rust user looking to learn more about Rust.
                You have just gotten an error message that you don't understand.
                You would like to understand the cause of the error better and how to fix it.
                The error message is contained in this markdown fragment:
                ${'```'}
                ${errorMessage}
                ${'```'}
            `),
        ];

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
