import * as vscode from 'vscode';
import * as analyzer from './analyzer';

export class AdvisorContext {
    private model?: vscode.LanguageModelChat;
    public messages: ChatMessage[];

    public constructor() {
        this.messages = [];

    }

    async addMessage(message: vscode.LanguageModelChatMessage) {
        let model = await this.getModel();
        let tokenCount = await model.countTokens(message);
        this.messages.push(new ChatMessage(message, tokenCount));
    }

    async getModel(): Promise<vscode.LanguageModelChat> {
        if (this.model === undefined) {
            const availableModels = await vscode.lm.selectChatModels();
            if (availableModels.length > 0) {
                this.model = availableModels[0];
            } else {
                throw new Error("Sorry, I could not find an available language model.");
            }
        }
        return this.model;
    }

    async getMessages(): Promise<vscode.LanguageModelChatMessage[]> {
        // Return the messages and calculate the token count to determine the cost of the message
        let totalTokenCount = this.messages.reduce((total, chatMessage) => total + chatMessage.tokenCount, 0);
        console.log("Total token count: " + totalTokenCount + " tokens");

        // Check if the total token count exceeds the maximum input tokens allowed by the model
        let model = await this.getModel();
        if (totalTokenCount > model.maxInputTokens) {
            // TODO: prune the context instead of bailing
            throw new Error("Sorry, I can't process more than " + model.maxInputTokens + " tokens at a time.");
        }
        return this.messages.map(chatMessage => chatMessage.message);
    }
}

class ChatMessage {
    public message: vscode.LanguageModelChatMessage;
    public tokenCount: number;

    public constructor(message: vscode.LanguageModelChatMessage, tokenCount: number) {
        this.message = message;
        this.tokenCount = tokenCount;
    }
}

export async function initialPrompt(
    sourceFile: analyzer.SourceFile,
    diagnostics: vscode.Diagnostic[],
    token: vscode.CancellationToken,
    context: AdvisorContext
): Promise<string> {
    const errorMessage = diagnostics.map(diagnostic => diagnostic.message).join('\n');

    await context.addMessage(
        vscode.LanguageModelChatMessage.Assistant(`
            You are Ferris, a friendly code helper who is an expert in Rust programming.
            You can assist in Rust-related questions, provide documenatation, and give troubleshooting advice.
            You are here to help explain the error message provided that the user doesn't understand.
            You are here to explain cause of the error better and how to fix it.
        `),
    );

    let currentFunction = await sourceFile.getCurrentFunction();
    if (currentFunction !== undefined) {
        await context.addMessage(
            vscode.LanguageModelChatMessage.User(`
                The source of the current function is
                
                ${'```'}
                ${currentFunction.sourceText}
                ${'```'}
            `)
        );
    }

    await context.addMessage(
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
    await context.addMessage(
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
    let model = await context.getModel();
    let messages = await context.getMessages();
    const chatResponse = await model.sendRequest(messages, {}, token);
    let fullResponse = '';
    for await (const fragment of chatResponse.text) {
        fullResponse += fragment;
    }
    context.addMessage(vscode.LanguageModelChatMessage.Assistant(fullResponse));
    return fullResponse;
}
