import * as vscode from 'vscode';

import * as path from 'path';
import { EOL } from 'os';

import CodeActionProvider from './codeActionProvider';
import { log } from './util';
import CSharpFileCreator from './creator/cShaprFileCreator';
import Maybe from './common/maybe';
import { CommandMapping, createExtensionMappings } from './commandMapping';
import TemplateConfiguration from './template/templateConfiguration';

const EXTENSION_NAME = 'csharpextensions';

export function activate(context: vscode.ExtensionContext): void {
    const extension = Extension.GetInstance();

    Extension.GetKnonwCommands().forEach((mapping, key) => {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                `${EXTENSION_NAME}.${mapping.command}`,
                async (options: RegisterCommandCallbackArgument) => await extension.startExecutor(options, key, mapping)
            )
        );
    });

    const documentSelector: vscode.DocumentSelector = {
        language: 'csharp',
        scheme: 'file'
    };
    const codeActionProvider = new CodeActionProvider();
    const disposable = vscode.languages.registerCodeActionsProvider(documentSelector, codeActionProvider);

    context.subscriptions.push(disposable);
}

export function deactivate(): void { /* Nothing to do here */ }

export class Extension {
    private constructor() { /**/ }

    private _getIncomingPath(options: RegisterCommandCallbackArgument): Maybe<string> {
        if (options) {
            return Maybe.some<string>(options._fsPath || options.fsPath || options.path);
        }

        if (vscode.window.activeTextEditor && !vscode.window.activeTextEditor?.document.isUntitled) {
            return Maybe.some<string>(path.dirname(vscode.window.activeTextEditor?.document.fileName));
        }

        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
            return Maybe.some<string>(vscode.workspace.workspaceFolders[0].uri.fsPath);
        }

        return Maybe.none<string>();
    }

    public async startExecutor(options: RegisterCommandCallbackArgument, hintName: string, mapping: CommandMapping): Promise<void> {
        const maybeIncomingPath = this._getIncomingPath(options);

        if (maybeIncomingPath.isNone()) {
            vscode.window.showErrorMessage(`Could not find the path for this action.${EOL}If this problem persists, please create an issue in the github repository.`);

            return;
        }

        const extension = Extension.GetCurrentVscodeExtension();

        if (!extension) {
            vscode.window.showErrorMessage('Weird, but the extension you are currently using could not be found');

            return;
        }

        // the output will be always of type string
        let newFilename = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Please enter a name for the new file(s)',
            value: `New${hintName}`,
            validateInput(inputValue: string): string | undefined {
                if (typeof inputValue === 'undefined' || inputValue.trim() === '') {
                    return 'Filename request: User did not provide any input';
                }
            },
        }) as string;

        if (newFilename.endsWith('.cs')) newFilename = newFilename.substring(0, newFilename.length - 3);

        const incomingPath = maybeIncomingPath.value();
        const templatesPath = path.join(extension.extensionPath, Extension.TemplatesPath);
        const pathWithoutExtension = `${incomingPath}${path.sep}${newFilename}`;

        const { templates } = mapping;
        const configuration = vscode.workspace.getConfiguration();
        const eol = configuration.get('file.eol', EOL);
        const includeNamespaces = configuration.get(`${EXTENSION_NAME}.includeNamespaces`, true);

        const createdFilesResult = await Promise.all(templates.map(async template => {
            return CSharpFileCreator.create(TemplateConfiguration.create(template, eol, includeNamespaces))
                .AndThen(async creator => await creator.create(templatesPath, pathWithoutExtension, newFilename));
        }));

        if (createdFilesResult.some(result => result.isErr())) {
            const error = createdFilesResult.filter(result => result.isErr())
                .map(result => result.info()).filter(info => !!info)
                .join(EOL);

            log(error);
            vscode.window.showErrorMessage(error);

            return;
        }

        const files = createdFilesResult.map(result => result.value()).sort((cf1, cf2) => {
            const weight1 = cf1.filePath.endsWith('.cs') ? 0 : 1;
            const weight2 = cf2.filePath.endsWith('.cs') ? 0 : 1;

            return weight2 - weight1;
        });
        await Promise.all(files.map(async createdFile => {
            let cursorPosition = undefined;
            if (createdFile.cursorPositionArray) {
                cursorPosition = new vscode.Position(createdFile.cursorPositionArray[0], createdFile.cursorPositionArray[1]);
            }

            await this._openFile(createdFile.filePath, cursorPosition);
        }));
    }

    private async _openFile(filePath: string, cursorPosition: vscode.Position | undefined): Promise<void> {
        try {
            const openedDoc = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(openedDoc, { preview: false });

            if (cursorPosition) {
                const newSelection = new vscode.Selection(cursorPosition, cursorPosition);

                editor.selection = newSelection;
            }
        } catch (errOpeningFile) {
            log(`Error trying to open '${filePath}'`, errOpeningFile);
        }
    }

    private static TemplatesPath = 'templates';
    private static KnownCommands: Map<string, CommandMapping>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static CurrentVscodeExtension: vscode.Extension<any> | undefined = undefined;
    private static Instance: Extension;
    private static KnownExtensionNames = [
        'kreativ-software.csharpextensions',
        'jsw.csharpextensions'
    ];

    public static GetInstance(): Extension {
        if (!this.Instance) {
            this.Instance = new Extension();
        }

        return this.Instance;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static GetCurrentVscodeExtension(): vscode.Extension<any> | undefined {
        if (!this.CurrentVscodeExtension) {
            for (let i = 0; i < this.KnownExtensionNames.length; i++) {
                const extension = vscode.extensions.getExtension(this.KnownExtensionNames[i]);

                if (extension) {
                    this.CurrentVscodeExtension = extension;

                    break;
                }
            }
        }

        return this.CurrentVscodeExtension;
    }

    static GetKnonwCommands(): Map<string, CommandMapping> {
        if (this.KnownCommands) {
            return this.KnownCommands;
        }

        this.KnownCommands = createExtensionMappings();

        return this.KnownCommands;
    }
}

interface RegisterCommandCallbackArgument {
    _fsPath: string,
    fsPath: string,
    path: string,
}
