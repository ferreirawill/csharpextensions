import { sortBy, uniq } from 'lodash';
import * as path from 'path';

import { TemplateType } from './templateType';
import TemplateConfiguration from './templateConfiguration';

export default class Template {
    private static readonly ClassnameRegex = new RegExp(/\${classname}/, 'g');
    private static readonly NamespaceRegex = new RegExp(/\${namespace}/, 'g');
    private static readonly EolRegex = new RegExp(/\r?\n/g);
    private static readonly NamespaceRegexForScoped = new RegExp(/(?<=\${namespace})/);
    private static readonly NamespaceBracesRegex = new RegExp(/(?<=^)({|}| {4})/, 'gm');

    private _name: string;
    private _type: TemplateType;
    private _content: string;
    private _configuration: TemplateConfiguration;

    constructor(type: TemplateType, content: string, configuration: TemplateConfiguration) {
        this._name = Template.RetriveName(type);
        this._type = type;
        this._content = content;
        this._configuration = configuration;
    }

    public getName(): string { return this._name; }
    public getType(): TemplateType { return this._type; }
    public getContent(): string { return this._content; }
    public getConfiguration(): TemplateConfiguration { return this._configuration; }

    public findCursorInTemplate(filename: string, namespace: string): number[] | null {
        const content = this._partialBuild(filename, namespace);
        const cursorPos = content.indexOf('${cursor}');
        const preCursor = content.substring(0, cursorPos);
        const matchesForPreCursor = preCursor.match(/\n/gi);

        if (matchesForPreCursor === null) return null;

        const lineNum = matchesForPreCursor.length;
        const charNum = preCursor.substring(preCursor.lastIndexOf('\n')).length;

        return [lineNum, charNum];
    }

    public build(filename: string, namespace: string): string {
        return this._partialBuild(filename, namespace)
            .replace('${cursor}', '')
            .replace(Template.EolRegex, this._configuration.getEolSettings());
    }

    private _partialBuild(filename: string, namespace: string) {
        let content = this._content;
        if (this._configuration.getUseFileScopedNamespace()) {
            content = this._getFileScopedNamespaceFormOfTemplate(this._content);
        }

        content = content
            .replace(Template.NamespaceRegex, namespace)
            .replace(Template.ClassnameRegex, filename)
            .replace('${namespaces}', this._handleUsings());

        return content;
    }

    /**
     * Get the file-scoped namespace form of the template.
     * 
     * From:
     * ```csharp
     * namespace ${namespace}
     * {
     *    // Template content
     *    // Template content
     * }
     * ```
     * 
     * To:
     * ```csharp
     * namespace ${namespace};
     * 
     * // Template content
     * // Template content
     * ```
     * 
     * @param template The content of the C# template file.
     */
    private _getFileScopedNamespaceFormOfTemplate(template: string): string {
        const result = template
            .replace(Template.NamespaceBracesRegex, '')
            .replace(Template.NamespaceRegexForScoped, ';');

        return result;
    }

    private _removeImplicitUsings(usings: string[], implicitUsings: Array<string>): string[] {
        return usings.filter(using => ! implicitUsings.includes(using));
    }

    private _handleUsings(): string {
        const includeNamespaces = this._configuration.getIncludeNamespaces();
        const skipImplicit = this._configuration.getUseImplicitUsings();
        const eol = this._configuration.getEolSettings();
        let usings = this._configuration.getRequiredUsings();
        if (includeNamespaces) usings = usings.concat(this._configuration.getOptionalUsings());
        if (skipImplicit) usings = this._removeImplicitUsings(usings, this._configuration.getImplicitUsings());

        if (!usings.length) return '';

        usings = uniq(usings);
        usings = sortBy(usings, [(using) => !using.startsWith('System'), (using) => using]);

        const joinedUsings = usings
            .map(using => `using ${using};`)
            .join(eol);

        return `${joinedUsings}${eol}${eol}`;
    }

    public static getExtension(type: TemplateType ): string {
        switch (type) {
            case TemplateType.Class:
            case TemplateType.Inteface:
            case TemplateType.Enum:
            case TemplateType.Struct:
            case TemplateType.Record:
            case TemplateType.Controller:
            case TemplateType.ApiController:
            case TemplateType.MsTest:
            case TemplateType.NUnit:
            case TemplateType.XUnit:
            case TemplateType.RazorPageClass:
                return '.cs';
            case TemplateType.UWPPageClass:
            case TemplateType.UWPUserControllClass:
            case TemplateType.UWPWindowClass:
                return '.xaml.cs';

            case TemplateType.UWPResource:
                return '.resw';
            case TemplateType.RazorPageTemplate:
                return '.cshtml';

            case TemplateType.UWPPageXml:
            case TemplateType.UWPUserControllXml:
            case TemplateType.UWPWindowXml:
                return '.xaml';
        }
    }

    public static RetriveName(type: TemplateType): string {
        switch (type) {
            case TemplateType.Class:
                return 'class';
            case TemplateType.Inteface:
                return 'interface';
            case TemplateType.Enum:
                return 'enum';
            case TemplateType.Struct:
                return 'struct';
            case TemplateType.Record:
                return 'record';
            case TemplateType.Controller:
                return 'controller';
            case TemplateType.ApiController:
                return 'apicontroller';
            case TemplateType.MsTest:
                return 'mstest';
            case TemplateType.NUnit:
                return 'nunit';
            case TemplateType.XUnit:
                return 'xunit';
            case TemplateType.RazorPageClass:
                return 'razor_page.cs';
            case TemplateType.UWPPageClass:
                return 'uwp_page.cs';
            case TemplateType.UWPUserControllClass:
                return 'uwp_usercontrol.cs';
            case TemplateType.UWPWindowClass:
                return 'uwp_window.cs';
            case TemplateType.UWPResource:
                return 'uwp_resource';
            case TemplateType.RazorPageTemplate:
                return 'razor_page';
            case TemplateType.UWPPageXml:
                return 'uwp_page';
            case TemplateType.UWPUserControllXml:
                return 'uwp_usercontrol';
            case TemplateType.UWPWindowXml:
                return 'uwp_window';
        }
    }

    public static getTemplatePath(templatesPath: string, type: TemplateType): string {
        const templateName = Template.RetriveName(type).toLowerCase();

        return path.join(templatesPath, `${templateName}.tmpl`);
    }
}
