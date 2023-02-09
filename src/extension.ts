import * as vscode from 'vscode';

import * as path from 'path';
import { EOL } from 'os';

import CodeActionProvider from './codeActionProvider';
import { log } from './util';
import { TemplateType } from './template/templateType';
import CommandExecutor from './command/commandExecutor';

export function activate(context: vscode.ExtensionContext): void {
    const extension = Extension.GetInstance();

    // Extension.GetKnownTemplates().forEach(template => {
    //     context.subscriptions.push(
    //         vscode.commands.registerCommand(
    //             template.getCommand(),
    //             async (options: RegisterCommandCallbackArgument) => await extension.createFromTemplate(options, template)
    //         )
    //     );
    // });
    Extension.GetKnonwCommands().forEach((commandExecutor, key)=> {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                commandExecutor.getCommand(),
                async (options: RegisterCommandCallbackArgument) => await extension.startExecutor(options, key, commandExecutor)
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

    private _getIncomingPath(options: RegisterCommandCallbackArgument): string | undefined {
        if (options) {
            return options._fsPath || options.fsPath || options.path;
        }

        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length
            ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
    }

    public async startExecutor(options: RegisterCommandCallbackArgument, hintName: string, executor: CommandExecutor): Promise<void> {
        const incomingPath = this._getIncomingPath(options);

        if (!incomingPath) {
            vscode.window.showErrorMessage(`Could not find the path for this action.${EOL}If this problem persists, please create an issue in the github repository.`);

            return;
        }

        const extension = Extension.GetCurrentVscodeExtension();

        if (!extension) {
            vscode.window.showErrorMessage('Weird, but the extension you are currently using could not be found');

            return;
        }

        let newFilename = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Please enter a name for the new file(s)',
            value: `New${hintName}`
        });

        if (typeof newFilename === 'undefined' || newFilename.trim() === '') {
            log('Filename request: User did not provide any input');

            return;
        }

        if (newFilename.endsWith('.cs')) newFilename = newFilename.substring(0, newFilename.length - 3);

        const templatesPath = path.join(extension.extensionPath, Extension.TemplatesPath);
        const pathWithoutExtension = `${incomingPath}${path.sep}${newFilename}`;

        executor.execute(templatesPath, pathWithoutExtension, newFilename);
    }

    private static TemplatesPath = 'templates';
    private static KnownCommands: Map<string, CommandExecutor>;
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

    static GetKnonwCommands(): Map<string, CommandExecutor> {
        if (this.KnownCommands) {
            return this.KnownCommands;
        }

        this.KnownCommands = new Map();
        this.KnownCommands.set('Class', new CommandExecutor('createClass', [TemplateType.Class]));
        this.KnownCommands.set('Interface', new CommandExecutor('createInterface', [TemplateType.Inteface]));
        this.KnownCommands.set('Enum', new CommandExecutor('createEnum', [TemplateType.Enum]));
        this.KnownCommands.set('Struct', new CommandExecutor('createStruct', [TemplateType.Struct]));
        this.KnownCommands.set('Controller', new CommandExecutor('createController', [TemplateType.Controller]));
        this.KnownCommands.set('ApiController', new CommandExecutor('createApiController', [TemplateType.ApiController]));
        this.KnownCommands.set('Razor_Page', new CommandExecutor('createRazorPage', [ TemplateType.RazorPageClass, TemplateType.RazorPageTemplate]));
        this.KnownCommands.set('XUnit', new CommandExecutor('createXUnitTest', [TemplateType.XUnit]));
        this.KnownCommands.set('NUnit', new CommandExecutor('createNUnitTest', [TemplateType.NUnit]));
        this.KnownCommands.set('MSTest', new CommandExecutor('createMSTest', [TemplateType.MsTest]));
        this.KnownCommands.set('UWP_Page', new CommandExecutor('createUwpPage', [TemplateType.UWPPageClass, TemplateType.UWPPageXml]));
        this.KnownCommands.set('UWP_Window', new CommandExecutor('createUwpWindow', [TemplateType.UWPWindowClass, TemplateType.UWPWindowXml]));
        this.KnownCommands.set('UWP_Usercontrol', new CommandExecutor('createUwpUserControl', [TemplateType.UWPUserControllClass, TemplateType.UWPUserControllXml]));
        this.KnownCommands.set('UWP_Resource', new CommandExecutor('createUwpResourceFile', [TemplateType.UWPResource]));

        return this.KnownCommands;
    }
}

interface RegisterCommandCallbackArgument {
    _fsPath: string,
    fsPath: string,
    path: string,
}
