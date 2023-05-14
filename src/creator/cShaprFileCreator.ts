import { TemplateType } from '../template/templateType';
import { ExtensionError } from '../util';
import Template from '../template/template';
import FileHandler from '../io/fileHandler';
import NamespaceDetector from '../namespaceDetector';
import fileScopedNamespaceConverter from '../fileScopedNamespaceConverter';
import TemplateConfiguration from '../template/templateConfiguration';
import Result from '../common/result';
import statuses from './fileCreatorStatus';

export type CreatedFile = {
    filePath: string,
    cursorPositionArray: number[] | null,
}

export default class CSharpFileCreator {
    private _template: TemplateType;
    private _templateConfiguration: TemplateConfiguration;

    private constructor(templateConfiguration: TemplateConfiguration) {
        this._template = templateConfiguration.getTemplateType();
        this._templateConfiguration = templateConfiguration;
    }

    public async create(templatesPath: string, pathWithoutExtension: string, newFilename: string): Promise<Result<CreatedFile>> {
        const destinationFilePath = `${pathWithoutExtension}${Template.getExtension(this._template)}`;
        const exists = await FileHandler.fileExists(destinationFilePath);

        if (exists) {
            return Result.error<CreatedFile>(statuses.fileExistingError, `File already exists: ${destinationFilePath}`);
        }

        const templatePath = Template.getTemplatePath(templatesPath, this._template);
        let templateContent: string;
        try {
            templateContent = await FileHandler.read(templatePath);
        } catch (e) {
            const error = e as ExtensionError;

            return Result.error<CreatedFile>(statuses.readingTemplateError, error.toString());
        }

        const template = new Template(this._template, templateContent, fileScopedNamespaceConverter, this._templateConfiguration);
        const namespaceDetector = new NamespaceDetector(pathWithoutExtension);
        const namespace = await namespaceDetector.getNamespace();

        let useFileScopedNamespace = false;
        if (Template.getExtension(template.getType()).endsWith('.cs')) {
            useFileScopedNamespace = await fileScopedNamespaceConverter.shouldUseFileScopedNamespace(destinationFilePath);
        }

        const fileContent = template.build(newFilename, namespace, useFileScopedNamespace);
        try {
            await FileHandler.write(destinationFilePath, fileContent);
        } catch (e) {
            const error = e as ExtensionError;

            return Result.error<CreatedFile>(statuses.writingFileError, error.toString());
        }

        const cursorPositionArray = template.findCursorInTemplate(newFilename, namespace, useFileScopedNamespace);

        return Result.ok<CreatedFile>({ filePath: destinationFilePath, cursorPositionArray: cursorPositionArray });
    }

    public static create(templateConfiguration: TemplateConfiguration): Result<CSharpFileCreator> {
        return Result.ok<CSharpFileCreator>(new CSharpFileCreator(templateConfiguration));
    }
}
