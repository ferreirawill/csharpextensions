import * as vscode from 'vscode';
import { EOL } from 'os';

import { TemplateType } from '../template/templateType';
import { ExtensionError } from '../util';
import Template from '../template/template';
import FileHandler from '../io/fileHandler';
import NamespaceDetector from '../namespaceDetector';
import fileScopedNamespaceConverter from '../fileScopedNamespaceConverter';

export default class CommandExecutor {
    private _command: string;
    private _templates: TemplateType[];

    constructor(command: string, templateTypes: TemplateType[]) {
        this._command = command;
        this._templates = templateTypes;
    }

    public getCommand(): string {
        return `csharpextensions.${this._command}`;
    }

    public async execute(templatesPath: string, pathWithoutExtension: string, newFilename: string): Promise<void> {
        if (!this._templates || this._templates.length === 0) {
            throw new ExtensionError('Something went wrong during instantiation no templates provided');
        }

        const findExistingFiles = await Promise.all(this._templates.map(async t => {
            const destinationFilePath = `${pathWithoutExtension}${Template.getExtension(t)}`;
            const fileExists = await FileHandler.fileExists(destinationFilePath);

            return { path: destinationFilePath, exists: fileExists };
        }));

        const existingFiles = findExistingFiles
            .filter((current: { path: string, exists: boolean }) => current.exists)
            .map(v => v.path);

        if (existingFiles.length) {
            vscode.window.showErrorMessage(`File(s) already exists: ${EOL}${existingFiles.join(EOL)}`);

            return;
        }

        const includeNamespaces = vscode.workspace.getConfiguration().get('csharpextensions.includeNamespaces', true);
        const eolSettings = this._getEolSetting();
        this._templates.forEach(async templateType => {
            const templatePath = Template.getTemplatePath(templatesPath, templateType);
            const templateContent = await FileHandler.read(templatePath);
            const template = new Template(templateType, templateContent, fileScopedNamespaceConverter);
            const namespaceDetector = new NamespaceDetector(pathWithoutExtension);
            const namespace = await namespaceDetector.getNamespace();
            const destinationFilePath = `${pathWithoutExtension}${Template.getExtension(template.getType())}`;

            let useFileScopedNamespace = false;
            if (Template.getExtension(template.getType()).endsWith('.cs')) {
                useFileScopedNamespace = await fileScopedNamespaceConverter.shouldUseFileScopedNamespace(destinationFilePath);
            }

            const fileContent = template.build(newFilename, namespace, includeNamespaces, useFileScopedNamespace, eolSettings);

            await FileHandler.write(destinationFilePath, fileContent);

            const cursorPositionArray = template.findCursorInTemplate(newFilename, namespace, includeNamespaces, useFileScopedNamespace);

            let cursorPosition = undefined;
            if (cursorPositionArray) {
                cursorPosition = new vscode.Position(cursorPositionArray[0], cursorPositionArray[1]);
            }

            this._openFile(destinationFilePath, cursorPosition);
        });
    }

    private _getEolSetting(): string {
        const eolSetting = vscode.workspace.getConfiguration().get('files.eol', EOL);

        switch (eolSetting) {
            case '\n':
            case '\r\n':
                return eolSetting;
            case 'auto':
            default:
                return EOL;
        }
    }

    private async _openFile(filePath: string, cursorPosition: vscode.Position | undefined): Promise<void> {
        try {
            const openedDoc = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(openedDoc);

            if (cursorPosition) {
                const newSelection = new vscode.Selection(cursorPosition, cursorPosition);

                editor.selection = newSelection;
            }
        } catch (errOpeningFile) {
            throw new ExtensionError(`Error trying to open from '${filePath}'`, errOpeningFile);
        }
    }
}
