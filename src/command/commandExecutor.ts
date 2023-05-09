import * as vscode from 'vscode';
import { EOL } from 'os';

import { TemplateType } from '../template/templateType';
import { ExtensionError } from '../util';
import Template from '../template/template';
import FileHandler from '../io/fileHandler';
import NamespaceDetector from '../namespaceDetector';
import fileScopedNamespaceConverter from '../fileScopedNamespaceConverter';
import TemplateConfiguration from '../template/templateConfiguration';
import Result from '../common/result';
import statuses from './commandExecutorStatus';

export type CreatedFile = {
    filePath: string,
    cursorPositionArray: number [] | null,
}

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

    public async execute(templatesPath: string, pathWithoutExtension: string, newFilename: string): Promise<Result<Array<CreatedFile>>> {
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
            return Result.error<Array<CreatedFile>>(statuses.fileExistingError, `File(s) already exists: ${EOL}${existingFiles.join(EOL)}`);
        }

        let result = undefined;
        const createdFiles = new Array<CreatedFile>();

        await Promise.all(this._templates.map(async  templateType => {
            const templatePath = Template.getTemplatePath(templatesPath, templateType);
            let templateContent: string;
            try {
                templateContent = await FileHandler.read(templatePath);
            } catch (e) {
                const error = e as ExtensionError;
                result = Result.error<void>(statuses.readingTemplateError, error.toString());

                return false;
            }

            const templateConf = TemplateConfiguration.create(templateType, vscode.workspace.getConfiguration());
            const template = new Template(templateType, templateContent, fileScopedNamespaceConverter, templateConf);
            const namespaceDetector = new NamespaceDetector(pathWithoutExtension);
            const namespace = await namespaceDetector.getNamespace();
            const destinationFilePath = `${pathWithoutExtension}${Template.getExtension(template.getType())}`;

            let useFileScopedNamespace = false;
            if (Template.getExtension(template.getType()).endsWith('.cs')) {
                useFileScopedNamespace = await fileScopedNamespaceConverter.shouldUseFileScopedNamespace(destinationFilePath);
            }

            const fileContent = template.build(newFilename, namespace, useFileScopedNamespace);
            try {
                await FileHandler.write(destinationFilePath, fileContent);
            } catch (e) {
                const error = e as ExtensionError;
                result = Result.error<void>(statuses.writingFileError, error.toString());

                return false;
            }

            const cursorPositionArray = template.findCursorInTemplate(newFilename, namespace, useFileScopedNamespace);
            createdFiles.push({filePath: destinationFilePath, cursorPositionArray: cursorPositionArray });
        }));

        if (result) {
            return result;
        }

        return Result.ok<Array<CreatedFile>>(createdFiles);
    }
}
