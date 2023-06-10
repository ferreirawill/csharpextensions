import {
    commands,
    window,
    workspace,
    CancellationToken,
    CodeAction,
    CodeActionContext,
    CodeActionKind,
    Position,
    Range,
    TextDocument,
    TextEdit,
    Uri,
    WorkspaceEdit,
    CodeActionProvider as VSCodeCodeActionProvider,
    TextEditor,
    CodeActionTriggerKind,
} from 'vscode';
import * as os from 'os';
import { log } from './util';
import { max, min } from 'lodash';
import Result from './common/result';


const EMPTY = '';
const SPACE = ' ';
export default class CodeActionProvider implements VSCodeCodeActionProvider {
    private _commandIds = {
        ctorFromProperties: 'csharpextensions.ctorFromProperties',
        initializeMemberFromCtor: 'csharpextensions.initializeMemberFromCtor',
    };

    private static readonly ReadonlyRegex = new RegExp(/(public|private|protected)\s(\w+)\s(\w+)\s?{\s?(get;)\s?(private\s)?(set;)?\s?}/g);
    private static readonly ClassRegex = new RegExp(/(private|internal|public|protected)\s?(static)?\sclass\s(\w*)/g);
    private static readonly GeneralRegex = new RegExp(/(public|private|protected)\s(.*?)\(([\s\S]*?)\)/gi);
    private static readonly BodyExpressionAssignmentRegex = new RegExp(/^(\(\s*(this\.)?(_)?([A-Za-z_]\w*)(,(\s*)?(this\.)?(_)?([A-Za-z_]\w*))*\s*\))(\s*=\s*)(\(\s*([A-Za-z_]\w*)(,(\s)?([A-Za-z_]\w*))\s*\));$/gi);
    private static readonly BodyExpressionSingleAssignmentRegex = new RegExp(/^(\(\s*)?(this\.)?(_)?([A-Za-z_]\w*)(\s*\))?(\s*=\s*)(\(\s*)?([A-Za-z_]\w*)(\s*\))?;$/gi);

    constructor() {
        commands.registerCommand(this._commandIds.initializeMemberFromCtor, this.initializeMemberFromCtor, this);
        commands.registerCommand(this._commandIds.ctorFromProperties, this.executeCtorFromProperties, this);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): CodeAction[] {//Command[] {
        if (context.triggerKind !== CodeActionTriggerKind.Invoke) {
            return new Array<CodeAction>();
        }

        const configuration = workspace.getConfiguration();
        const eol = configuration.get('file.eol', os.EOL);
        const tabSize = configuration.get('editor.tabSize', 4);
        const privateMemberPrefix = configuration.get('csharpextensions.privateMemberPrefix', EMPTY);
        const prefixWithThis = configuration.get('csharpextensions.useThisForCtorAssignments', true);
        const conf = { tabSize, privateMemberPrefix, prefixWithThis, eol };
        const generationTypes = [
            MemberGenerationType.PrivateField,
            MemberGenerationType.Property,
            MemberGenerationType.ReadonlyProperty,
        ];

        const codeActions = new Array<CodeAction>();
        const result = this._getActiveTextEditor()
            .AndThenSync((editor) => {
                const position = editor.selection.active;
                const ctorPActionResult = this._getCtorpAction(document, editor, position);
                if (ctorPActionResult.isOk()) {
                    codeActions.push(ctorPActionResult.value());
                } else {
                    console.error(ctorPActionResult.info());
                }

                return this._getWordRange(editor, position)
                    .AndThenSync((wordRange) => this._retrieveCtorParameters(document, position)
                        .AndThenSync((ctorParamStr) => {
                            const lineText = editor.document.getText(new Range(position.line, 0, position.line, wordRange.end.character));
                            const selectedName = lineText.substring(wordRange.start.character, wordRange.end.character);

                            return this._retrieveParmeterType(ctorParamStr, selectedName)
                                .AndThenSync((parameterType) => this._findConstructorBodyStart(document, position)
                                    .AndThenSync((constructorBodyStart) => {
                                        const codeActions = new Array<CodeAction>();
                                        generationTypes.forEach(memberGenerationType => {
                                            const codeActionResult = this._retrieveAssignement(document, selectedName, constructorBodyStart, conf, memberGenerationType)
                                                .AndThenSync((assignement) => this._getInitializeFromCtorAction(document, position, parameterType, selectedName, assignement, constructorBodyStart, memberGenerationType, conf));
                                            if (codeActionResult.isOk()) {
                                                codeActions.push(codeActionResult.value());
                                            } else {
                                                console.error(codeActionResult.info());
                                            }
                                        });

                                        return Result.ok<Array<CodeAction>>(codeActions);
                                    }));
                        }));
            });

        if (result.isOk()) {
            codeActions.push(...result.value());
        }

        return codeActions;
    }

    private _getWordRange(editor: TextEditor, position: Position): Result<Range> {
        const wordRange = editor.document.getWordRangeAtPosition(position);

        if (!wordRange) {
            return Result.error<Range>('NotFoundError', 'No word range found for the active position');
        }

        return Result.ok<Range>(wordRange);
    }

    private _getActiveTextEditor(): Result<TextEditor> {
        const editor = window.activeTextEditor;

        if (!editor) {
            return Result.error<TextEditor>('NotFoundError', 'There\'s no active editor');
        }

        return Result.ok<TextEditor>(editor);
    }

    private camelize(str: string) {
        return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
            if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces

            return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }

    private async executeCtorFromProperties(args: ConstructorFromPropertiesArgument) {
        const tabSize = workspace.getConfiguration().get('editor.tabSize', 4);
        const ctorParams = new Array<string>();

        if (!args.properties)
            return;

        args.properties.forEach((p) => {
            ctorParams.push(`${p.type} ${this.camelize(p.name)}`);
        });

        const assignments = args.properties
            .map(prop => `${Array(tabSize * 1).join(' ')} this.${prop.name} = ${this.camelize(prop.name)};${os.EOL}`);

        const firstPropertyLine = args.properties.sort((a, b) => a.lineNumber - b.lineNumber)[0].lineNumber;

        const ctorStatement = `${Array(tabSize * 2).join(' ')} ${args.classDefinition.modifier} ${args.classDefinition.className}(${ctorParams.join(', ')}) 
        {
        ${assignments.join('')}   
        }
        `;

        const edit = new WorkspaceEdit();
        const edits = new Array<TextEdit>();

        const pos = new Position(firstPropertyLine, 0);
        const range = new Range(pos, pos);
        const ctorEdit = new TextEdit(range, ctorStatement);

        edits.push(ctorEdit);

        await this.formatDocument(args.document.uri, edit, edits);
    }

    private async formatDocument(documentUri: Uri, edit: WorkspaceEdit, edits: Array<TextEdit>) {
        edit.set(documentUri, edits);

        const reFormatAfterChange = workspace.getConfiguration().get('csharpextensions.reFormatAfterChange', true);

        await workspace.applyEdit(edit);

        if (reFormatAfterChange) {
            try {
                const formattingEdits = await commands.executeCommand<TextEdit[]>('executeFormatDocumentProvider', documentUri);

                if (formattingEdits !== undefined) {
                    const formatEdit = new WorkspaceEdit();

                    formatEdit.set(documentUri, formattingEdits);

                    workspace.applyEdit(formatEdit);
                }
            } catch (err) {
                log('Error trying to format document - ', err);
            }
        }
    }

    private _getCtorpAction(document: TextDocument, editor: TextEditor, position: Position): Result<CodeAction> {
        const withinClass = this.findClassFromLine(document, position.line);

        if (!withinClass) {
            return Result.error('NotFoundError', `Not found withinClass from line ${position.line}`);
        }

        const properties = new Array<CSharpPropertyDefinition>();
        let lineNo = 0;

        while (lineNo < document.lineCount) {
            const textLine = document.lineAt(lineNo);
            const match = CodeActionProvider.ReadonlyRegex.exec(textLine.text);

            if (match) {
                const foundClass = this.findClassFromLine(document, lineNo);

                if (foundClass && foundClass.className === withinClass.className) {
                    const prop: CSharpPropertyDefinition = {
                        lineNumber: lineNo,
                        class: foundClass,
                        modifier: match[1],
                        type: match[2],
                        name: match[3],
                        statement: match[0]
                    };

                    properties.push(prop);
                }
            }

            lineNo++;
        }

        if (!properties.length) {
            return Result.error<CodeAction>('NotFoundError', 'Properties not found');
        }

        const classDefinition = this.findClassFromLine(document, position.line);

        if (!classDefinition) {
            return Result.error<CodeAction>('NotFoundError', 'Class definition not found');
        }

        const parameter: ConstructorFromPropertiesArgument = {
            properties: properties,
            classDefinition: classDefinition,
            document: document
        };

        const codeAction = new CodeAction('Initialize ctor from properties...', CodeActionKind.RefactorExtract);

        codeAction.command = {
            title: codeAction.title,
            command: this._commandIds.ctorFromProperties,
            arguments: [parameter]
        };

        return Result.ok<CodeAction>(codeAction);
    }

    private findClassFromLine(document: TextDocument, lineNo: number): CSharpClassDefinition | null {
        if (!lineNo) lineNo = document.lineCount - 1;
        if (lineNo >= document.lineCount) lineNo = document.lineCount - 1;

        while (lineNo >= 0) {
            const line = document.lineAt(lineNo);
            const match = CodeActionProvider.ClassRegex.exec(line.text);

            if (match) {
                return {
                    startLine: lineNo,
                    endLine: -1,
                    className: match[3],
                    modifier: match[1],
                    statement: match[0]
                };
            }

            lineNo--;
        }

        return null;
    }

    private async initializeMemberFromCtor(args: InitializeFieldFromConstructor) {
        const edit = new WorkspaceEdit();

        const { constructorPosition, isBodyExpression } = args.constructorBodyStart;
        const bodyStartRange = new Range(constructorPosition, constructorPosition);
        const declarationRange = new Range(args.constructorStart, args.constructorStart);

        const declarationEdit = new TextEdit(declarationRange, args.memberGeneration.declaration);
        const memberInitEdit = isBodyExpression
            ? TextEdit.replace(bodyStartRange, args.memberGeneration.assignment)
            : new TextEdit(bodyStartRange, args.memberGeneration.assignment);

        const edits = new Array<TextEdit>();

        if (args.document.getText().indexOf(args.memberGeneration.declaration.trim()) === -1)
            edits.push(declarationEdit);

        if (args.document.getText().indexOf(args.memberGeneration.assignment.trim()) === -1)
            edits.push(memberInitEdit);

        await this.formatDocument(args.document.uri, edit, edits);
    }

    private _getInitializeFromCtorAction(
        document: TextDocument,
        position: Position,
        parameterType: string,
        selectedName: string,
        assignment: string,
        constructorBodyStart: ConstructorType,
        memberGenerationType: MemberGenerationType,
        configuration: CodeActionConfiguration,
    ): Result<CodeAction> {
        const { tabSize, privateMemberPrefix, eol } = configuration;

        let title: string;
        let name: string;
        let declaration: string;

        switch (memberGenerationType) {
            case MemberGenerationType.PrivateField:
                title = 'Initialize field from parameter...';

                declaration = `${EMPTY.padEnd(tabSize * 2, SPACE)}private readonly ${parameterType} ${privateMemberPrefix}${selectedName};${eol}`;
                break;
            case MemberGenerationType.ReadonlyProperty:
                title = 'Initialize readonly property from parameter...';

                name = selectedName[0].toUpperCase() + selectedName.substring(1);

                declaration = `${EMPTY.padEnd(tabSize * 2, SPACE)}public ${parameterType} ${name} { get; }${eol}`;
                break;
            case MemberGenerationType.Property:
                title = 'Initialize property from parameter...';

                name = selectedName[0].toUpperCase() + selectedName.substring(1);

                declaration = `${EMPTY.padEnd(tabSize * 2, SPACE)}public ${parameterType} ${name} { get; set; }${eol}`;
                break;
            default:
                //TODO: Show error?
                return Result.error<CodeAction>('NotSupportedTypeError', `${MemberGenerationType[memberGenerationType]} not supported`);
        }


        const memberGeneration: MemberGenerationProperties = {
            type: memberGenerationType,
            declaration,
            assignment,
        };

        const parameter: InitializeFieldFromConstructor = {
            document: document,
            type: parameterType,
            name: selectedName,
            memberGeneration: memberGeneration,
            constructorBodyStart: constructorBodyStart,
            constructorStart: this.findConstructorStart(document, position)
        };

        const codeAction = new CodeAction(title, CodeActionKind.RefactorExtract);

        codeAction.command = {
            title: title,
            command: this._commandIds.initializeMemberFromCtor,
            arguments: [parameter]
        };

        return Result.ok<CodeAction>(codeAction);
    }

    private _retrieveParmeterType(ctorParamStr: string, selectedName: string): Result<string> {
        let parameterType: string | null = null;

        ctorParamStr.split(',').forEach(strPart => {
            const separated = strPart?.trim().split(' ');

            if (separated?.length > 1 && separated[1].trim() === selectedName)
                parameterType = separated[0].trim();
        });

        if (!parameterType) {
            return Result.error<string>('NotFoundError', `Type for ${selectedName} hasn't been found`);
        }

        return Result.ok<string>(parameterType as string);
    }

    private _retrieveCtorParameters(document: TextDocument, position: Position): Result<string> {
        const positionStart = new Position(position.line < 2 ? 0 : position.line - 2, 0); // Limit line to start of file
        const positionEnd = new Position(document.lineCount - position.line < 2 ? 0 : position.line + 2, 0); // Limit line to end of file
        const surrounding = document.getText(new Range(positionStart, positionEnd));
        const matches = CodeActionProvider.GeneralRegex.exec(surrounding);

        if (!matches) {
            return Result.error<string>('NotMatchedError', `Parameters not found in ${surrounding}`);
        }

        return Result.ok<string>(matches[3]);

    }

    private _retrieveAssignement(
        document: TextDocument,
        selectedName: string,
        constructorBodyStart: ConstructorType,
        configuration: CodeActionConfiguration,
        memberGeneration: MemberGenerationType,
    ): Result<string> {

        const { tabSize, privateMemberPrefix, prefixWithThis, eol } = configuration;
        let name = selectedName[0].toUpperCase() + selectedName.substring(1);
        if (memberGeneration === MemberGenerationType.PrivateField) {
            name = `${privateMemberPrefix}${selectedName}`;
        }

        if (!constructorBodyStart.isBodyExpression) {

            return Result.ok<string>(`${EMPTY.padEnd(tabSize * 3, SPACE)} ${(prefixWithThis ? 'this.' : EMPTY)}${name} = ${selectedName};${eol}`);
        }

        const limit = min([(constructorBodyStart.constructorPosition.line + (document.lineCount / 2)), document.lineCount]) as number;

        let currentPosition = constructorBodyStart.constructorPosition.line;
        let currentAssignements: string | null;
        currentAssignements = null;
        const bodyExpressionRegExpressions = [
            CodeActionProvider.BodyExpressionAssignmentRegex,
            CodeActionProvider.BodyExpressionSingleAssignmentRegex
        ];

        while (currentPosition < limit) {
            const text = document.lineAt(currentPosition).text;

            const line = text
                .replace('=>', EMPTY)
                .trim();

            let match;

            for (let index = 0; index < bodyExpressionRegExpressions.length; index++) {
                const regExpr = bodyExpressionRegExpressions[index];
                match = regExpr.exec(line);
                if (match) {
                    break;
                }
            }

            if (match) {
                currentAssignements = match[0];

                break;
            }

            currentPosition = currentPosition + 1;
        }

        if (!currentAssignements) {
            return Result.error<string>('NotFoundError', `Impossible to find the body expression constructor's assignements from line: ${constructorBodyStart.constructorPosition.line}`);
        }

        const [leftAssignments, rightAssignemnts] = currentAssignements.split('=');
        const newLeftAssignments = leftAssignments.replace('(', EMPTY).replace(')', EMPTY).split(',');
        const newName = `${(prefixWithThis ? 'this.' : EMPTY)}${name}`;
        newLeftAssignments.push(newName);
        const newRightAssignments = rightAssignemnts
            .replace(/\s/, EMPTY)
            .replace(';', EMPTY)
            .replace('(', EMPTY)
            .replace(')', EMPTY)
            .split(',');
        if (newRightAssignments.includes(selectedName.trim())) {
            return Result.error<string>('AlreadyAssignedError', `${selectedName} has been alread assigned`);
        }

        newRightAssignments.push(selectedName);

        return Result.ok<string>(`${EMPTY.padEnd(tabSize * 3, SPACE)}=> (${newLeftAssignments.join(', ')}) = (${newRightAssignments.join(', ')});${eol}`);
    }

    private _findConstructorBodyStart(document: TextDocument, position: Position): Result<ConstructorType> {
        const limit = min([(position.line + (document.lineCount / 2)), document.lineCount]) as number;
        for (let lineNo = position.line; lineNo < limit; lineNo++) {
            const line = document.lineAt(lineNo);

            if (line.text.indexOf('=>') !== -1) {

                return Result.error<ConstructorType>('NotSupportedError', 'Body expression constructor not supported');
            }

            if (line.text.indexOf('{') !== -1)
                return Result.ok<ConstructorType>({ isBodyExpression: false, constructorPosition: new Position(lineNo + 1, 0) });
        }

        return Result.error<ConstructorType>('NotFoundError', `Impossible to find the constructor begin at position ${position}`);
    }

    private findConstructorStart(document: TextDocument, position: Position): Position {
        const foundClass = this.findClassFromLine(document, position.line);

        if (foundClass) {
            const limit = max([(position.line - (document.lineCount / 2)), 0]) as number;
            for (let lineNo = position.line; lineNo > limit; lineNo--) {
                const line = document.lineAt(lineNo);

                if (line.isEmptyOrWhitespace && !(line.lineNumber < foundClass.startLine))
                    return new Position(lineNo, 0);
            }
        }

        return new Position(position.line, 0);
    }
}

enum MemberGenerationType {
    Property,
    ReadonlyProperty,
    PrivateField
}

interface CodeActionConfiguration {
    tabSize: number,
    privateMemberPrefix: string,
    prefixWithThis: boolean,
    eol: string,
}

type ConstructorType = {
    isBodyExpression: boolean,
    constructorPosition: Position,
}

interface MemberGenerationProperties {
    type: MemberGenerationType,
    assignment: string,
    declaration: string
}

interface CSharpClassDefinition {
    startLine: number,
    endLine: number,
    className: string,
    modifier: string,
    statement: string
}

interface CSharpPropertyDefinition {
    class: CSharpClassDefinition,
    modifier: string,
    type: string,
    name: string,
    statement: string,
    lineNumber: number
}

interface ConstructorFromPropertiesArgument {
    document: TextDocument,
    classDefinition: CSharpClassDefinition,
    properties: CSharpPropertyDefinition[]
}

interface InitializeFieldFromConstructor {
    document: TextDocument,
    type: string,
    name: string,
    memberGeneration: MemberGenerationProperties,
    constructorBodyStart: ConstructorType,
    constructorStart: Position,
}
