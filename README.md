# intorust.vscode

This is a super duper experimental VSCode extension that aims to help folks learn Rust more easily.

## What it does

> **Help wanted.** Note that most of the functionality here is either broken or unimplemented. I've embedded links to issues through the README where you can help to fill that functionality in, if you so choose. =)

When you open a Rust project with compilation errors, you get a "Explain these errors" codelen hovering above each error ([FIXME#6](https://github.com/nikomatsakis/intorust.vscode/issues/6)):

XXX insert image

Clicking on that takes you to a chat window where [Ferris](https://rustacean.net/) themselves is there to help ([FIXME#11](https://github.com/nikomatsakis/intorust.vscode/issues/11)). Ferris examines the error message and relevant snippets from the surrounding code ([FIXME#7](https://github.com/nikomatsakis/intorust.vscode/issues/7)) to offer you a deatiled explanation of what is going on and, hopefully suggestions for how to fix it. You can ask follow-up questions ([FIXME#2](https://github.com/nikomatsakis/intorust.vscode/issues/2)) to dive deeper. If you like the fix Ferris is proposing, you can also ask them to apply it ([FIXME#8](https://github.com/nikomatsakis/intorust.vscode/issues/8)).

If you don't want to use the codelens, you can disable it and instead invoke the "IntoRust: Explain errors" command from the command palette as desired ([FIXME#5](https://github.com/nikomatsakis/intorust.vscode/issues/5)).

IntoRust can also tailor its responses to your knowledge level. For example, you can ask it to provide examples in terms of languages you already know, like Java or Python. Just ask it! It will remember. ([FIXME#14](https://github.com/nikomatsakis/intorust.vscode/issues/14))

## WARNING

IntoRust sends snippets and fragments of your code to external LLMs like Copilot to provide responses. These LLMs may retain data from these prompts for their own purposes. If you don't like this, either configure IntoRust to use an LLM you are comfortable with ([FIXME#10](https://github.com/nikomatsakis/intorust.vscode/issues/10)) or configure it to only be enabled on open source projects ([FIXME#13](https://github.com/nikomatsakis/intorust.vscode/issues/13)).