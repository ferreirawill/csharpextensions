import { sortBy, uniq } from 'lodash';
import { EOL } from 'os';
import * as path from 'path';

import { TemplateType } from './templateType';
import { FileScopedNamespaceConverter } from '../fileScopedNamespaceConverter';

export default class Template {
    private static readonly ClassnameRegex = new RegExp(/\${classname}/, 'g');
    private static readonly NamespaceRegex = new RegExp(/\${namespace}/, 'g');
    private static readonly EolRegex = new RegExp(/\r?\n/g);

    private _name: string;
    private _type: TemplateType;
    private _content: string;
    private _fileScopeConverter: FileScopedNamespaceConverter;

    constructor(type: TemplateType, content: string, fileScopeConverter: FileScopedNamespaceConverter) {
        this._name = Template.RetriveName(type);
        this._type = type;
        this._content = content;
        this._fileScopeConverter = fileScopeConverter;
    }

    public getName(): string { return this._name; }
    public getType(): TemplateType { return this._type; }
    public getContent(): string { return this._content; }

    public findCursorInTemplate(filename: string, namespace: string, includeNamespaces: boolean, useFileScopedNamespace: boolean): number[] | null {
        const content = this._partialBuild(filename, namespace, includeNamespaces, useFileScopedNamespace);
        const cursorPos = content.indexOf('${cursor}');
        const preCursor = content.substring(0, cursorPos);
        const matchesForPreCursor = preCursor.match(/\n/gi);

        if (matchesForPreCursor === null) return null;

        const lineNum = matchesForPreCursor.length;
        const charNum = preCursor.substring(preCursor.lastIndexOf('\n')).length;

        return [lineNum, charNum];
    }

    public build(filename: string, namespace: string, includeNamespaces: boolean, useFileScopedNamespace: boolean, eol: string = EOL): string {
        return this._partialBuild(filename, namespace, includeNamespaces, useFileScopedNamespace, eol)
            .replace('${cursor}', '')
            .replace(Template.EolRegex, eol);
    }

    private _partialBuild(filename: string, namespace: string, includeNamespaces: boolean, useFileScopedNamespace: boolean, eol: string = EOL) {
        let content = this._content;
        if (useFileScopedNamespace) {
            content = this._fileScopeConverter.getFileScopedNamespaceFormOfTemplate(this._content);
        }

        content = content
            .replace(Template.NamespaceRegex, namespace)
            .replace(Template.ClassnameRegex, filename)
            .replace('${namespaces}', this.HandleUsings(includeNamespaces, eol));

        return content;
    }

    private HandleUsings(includeNamespaces: boolean, eol: string = EOL): string {
        let usings = this.getRequiredUsings();
        if (includeNamespaces) usings = usings.concat(this.getOptionalUsings());

        if (!usings.length) return '';

        const uniqueUsings = uniq(usings);
        const sortedUsings = sortBy(uniqueUsings, [(using) => !using.startsWith('System'), (using) => using]);
        const joinedUsings = sortedUsings
            .map(using => `using ${using};`)
            .join(eol);

        return `${joinedUsings}${eol}${eol}`;
    }

    public getRequiredUsings(): string[] {
        switch (this._type) {
            case TemplateType.Class:
            case TemplateType.Inteface:
            case TemplateType.Enum:
            case TemplateType.Struct:
                return [];
            case TemplateType.Controller:
                return [
                    'System.Diagnostics',
                    'Microsoft.AspNetCore.Mvc',
                    'Microsoft.Extensions.Logging',
                ];
            case TemplateType.ApiController:
                return ['Microsoft.AspNetCore.Mvc'];
            case TemplateType.MsTest:
                return ['Microsoft.VisualStudio.TestTools.UnitTesting'];
            case TemplateType.NUnit:
                return ['NUnit.Framework'];
            case TemplateType.XUnit:
                return ['Xunit'];
            case TemplateType.RazorPageClass:
                return [
                    'Microsoft.AspNetCore.Mvc',
                    'Microsoft.AspNetCore.Mvc.RazorPages',
                    'Microsoft.Extensions.Logging',
                ];
            case TemplateType.UWPPageClass:
            case TemplateType.UWPUserControllClass:
            case TemplateType.UWPWindowClass:
            case TemplateType.UWPUserControllXml:
            case TemplateType.UWPWindowXml:
            case TemplateType.UWPPageXml:
            case TemplateType.RazorPageTemplate:
            case TemplateType.UWPResource:
            default:
                return [];
        }
    }

    public getOptionalUsings(): string[] {

        switch (this._type) {
            case TemplateType.Class:
            case TemplateType.Inteface:
            case TemplateType.Enum:
            case TemplateType.Struct:
            case TemplateType.Controller:
            case TemplateType.ApiController:
            case TemplateType.MsTest:
            case TemplateType.NUnit:
            case TemplateType.XUnit:
            case TemplateType.RazorPageClass:
                return [
                    'System',
                    'System.Collections.Generic',
                    'System.Linq',
                    'System.Threading.Tasks',
                ];
            case TemplateType.UWPPageClass:
            case TemplateType.UWPUserControllClass:
            case TemplateType.UWPWindowClass:
                return [
                    'System',
                    'System.Collections.Generic',
                    'System.Linq',
                    'System.Text',
                    'System.Threading.Tasks',
                    'System.Windows',
                    'System.Windows.Controls',
                    'System.Windows.Data',
                    'System.Windows.Documents',
                    'System.Windows.Input',
                    'System.Windows.Media',
                    'System.Windows.Media.Imaging',
                    'System.Windows.Navigation',
                    'System.Windows.Shapes',
                ];

            case TemplateType.UWPUserControllXml:
            case TemplateType.UWPWindowXml:
            case TemplateType.UWPPageXml:
            case TemplateType.RazorPageTemplate:
            case TemplateType.UWPResource:
            default:
                return [];
        }
    }

    public static getExtension(type: TemplateType ): string {
        switch (type) {
            case TemplateType.Class:
            case TemplateType.Inteface:
            case TemplateType.Enum:
            case TemplateType.Struct:
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
        let templateName = Template.RetriveName(type).toLowerCase();

        if (templateName.endsWith('.cs')) {
            return path.join(templatesPath, `${templateName}.tmpl`);
        }

        switch (type) {
            case TemplateType.UWPPageClass:
            case TemplateType.UWPUserControllClass:
            case TemplateType.UWPWindowClass:
            case TemplateType.RazorPageClass:
                templateName = `${templateName}.cs`;
                break;

            default:
                break;
        }

        return path.join(templatesPath, `${templateName}.tmpl`);
    }

}
