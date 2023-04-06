import { EOL } from 'os';
import { WorkspaceConfiguration } from 'vscode';

import { ExtensionError } from '../util';
import { TemplateType } from './templateType';

export default class TemplateConfiguration {
    private _includeNamespaces: boolean;
    private _eolSettings: string;
    private _requiredUsings: Array<string>;
    private _optionalUsings: Array<string>;

    constructor(includeNamespaces: boolean, eolSettings: string, requiredUsings: Array<string>, optionalUsings: Array<string>) {
        this._includeNamespaces = includeNamespaces;
        this._eolSettings = eolSettings;
        this._requiredUsings = requiredUsings;
        this._optionalUsings = optionalUsings;
    }

    public getIncludeNamespaces(): boolean { return this._includeNamespaces; }
    public getEolSettings(): string { return this._eolSettings; }
    public getRequiredUsings(): Array<string> { return this._requiredUsings; }
    public getOptionalUsings(): Array<string> { return this._optionalUsings; }

    public static create(type: TemplateType, workspaceConfiguration: WorkspaceConfiguration): TemplateConfiguration {
        const eolSettings = TemplateConfiguration.getEolSetting(workspaceConfiguration);
        const includeNamespaces = workspaceConfiguration.get('csharpextensions.includeNamespaces', true);

        const requiredUsings = TemplateConfiguration.retrieveRequiredUsings(type);
        const optionalUsings = TemplateConfiguration.retrieveOptionalUsings(type);

        return new TemplateConfiguration(includeNamespaces, eolSettings, requiredUsings, optionalUsings);
    }

    private static getEolSetting(workspaceConfiguration: WorkspaceConfiguration): string {
        const eolSetting = workspaceConfiguration.get('files.eol', EOL);

        switch (eolSetting) {
            case '\n':
            case '\r\n':
                return eolSetting;
            case 'auto':
            default:
                return EOL;
        }
    }

    public static retrieveRequiredUsings(type: TemplateType): Array<string> {
        switch (type) {
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
                return [];
            default:
                throw new ExtensionError(`TemplateType ${TemplateType[type]} not supported for retrieving required usings`);
        }
    }

    public static retrieveOptionalUsings(type: TemplateType): Array<string> {
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
                return [];
            default:
                throw new ExtensionError(`TemplateType ${TemplateType[type]} not supported for retrieving optional usings`);
        }
    }
}
