import * as assert from 'assert';

import TemplateConfiguration from '../../../../src/template/templateConfiguration';
import { TemplateType } from '../../../../src/template/templateType';
import { EOL } from 'os';

suite('TemplateConfiguration', () => {
    const allTypes: Array<TemplateType> = [
        TemplateType.Class,
        TemplateType.Inteface,
        TemplateType.Enum,
        TemplateType.Struct,
        TemplateType.Controller,
        TemplateType.ApiController,
        TemplateType.MsTest,
        TemplateType.NUnit,
        TemplateType.XUnit,
        TemplateType.RazorPageClass,
        TemplateType.RazorPageTemplate,
        TemplateType.UWPPageClass,
        TemplateType.UWPPageXml,
        TemplateType.UWPResource,
        TemplateType.UWPUserControllClass,
        TemplateType.UWPUserControllXml,
        TemplateType.UWPWindowClass,
        TemplateType.UWPWindowXml,
    ];
    allTypes.forEach((type) => {
        test(`create for type ${TemplateType[type]} with include namaspaces true and default eol`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, true);

            assert.strictEqual(configuration.getIncludeNamespaces(), true);
            assert.strictEqual(configuration.getEolSettings(), EOL);
            assert.deepStrictEqual(configuration.getRequiredUsings(), getRequiredImports(type));
            assert.deepStrictEqual(configuration.getOptionalUsings(), getOptionalImports(type));
        });
    });
    allTypes.forEach((type) => {
        test(`create for type ${TemplateType[type]} with include namaspaces false and default eol`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, false);

            assert.strictEqual(configuration.getIncludeNamespaces(), false);
            assert.strictEqual(configuration.getEolSettings(), EOL);
            assert.deepStrictEqual(configuration.getRequiredUsings(), getRequiredImports(type));
            assert.deepStrictEqual(configuration.getOptionalUsings(), getOptionalImports(type));
        });
    });
    ['\n', '\r\n', 'someString'].forEach((eolSetting) => {
        test(`create  with eol ${eolSetting}`, async () => {
            const configuration = TemplateConfiguration.create(TemplateType.Class, eolSetting, true);

            assert.strictEqual(configuration.getEolSettings(), eolSetting === 'someString' ? EOL : eolSetting);
            assert.strictEqual(configuration.getIncludeNamespaces(), true);
            assert.deepStrictEqual(configuration.getRequiredUsings(), getRequiredImports(TemplateType.Class));
            assert.deepStrictEqual(configuration.getOptionalUsings(), getOptionalImports(TemplateType.Class));

        });

    });
});

function getRequiredImports(type: TemplateType): Array<string> {
    let expectedRequired: Array<string>;
    switch (type) {
        case TemplateType.Class:
        case TemplateType.Inteface:
        case TemplateType.Enum:
        case TemplateType.Struct:
        case TemplateType.UWPPageClass:
        case TemplateType.UWPUserControllClass:
        case TemplateType.UWPWindowClass:
            expectedRequired = [];
            break;
        case TemplateType.Controller:
            expectedRequired = [
                'System.Diagnostics',
                'Microsoft.AspNetCore.Mvc',
                'Microsoft.Extensions.Logging',
            ];
            break;
        case TemplateType.ApiController:
            expectedRequired = ['Microsoft.AspNetCore.Mvc'];
            break;
        case TemplateType.MsTest:
            expectedRequired = ['Microsoft.VisualStudio.TestTools.UnitTesting'];
            break;
        case TemplateType.NUnit:
            expectedRequired = ['NUnit.Framework'];
            break;
        case TemplateType.XUnit:
            expectedRequired = ['Xunit'];
            break;
        case TemplateType.RazorPageClass:
            expectedRequired = [
                'Microsoft.AspNetCore.Mvc',
                'Microsoft.AspNetCore.Mvc.RazorPages',
                'Microsoft.Extensions.Logging',
            ];
            break;
        case TemplateType.UWPUserControllXml:
        case TemplateType.UWPWindowXml:
        case TemplateType.UWPPageXml:
        case TemplateType.RazorPageTemplate:
        case TemplateType.UWPResource:
            expectedRequired = [];
            break;
        default:
            throw new Error(`Not expected type: ${TemplateType[type]}`);
    }

    return expectedRequired;
}

function getOptionalImports(type: TemplateType): Array<string> {
    let optionalImports: Array<string>;
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
            optionalImports = [
                'System',
                'System.Collections.Generic',
                'System.Linq',
                'System.Threading.Tasks',
            ];
            break;
        case TemplateType.UWPPageClass:
        case TemplateType.UWPUserControllClass:
        case TemplateType.UWPWindowClass:
            optionalImports = [
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
            break;
        case TemplateType.UWPUserControllXml:
        case TemplateType.UWPWindowXml:
        case TemplateType.UWPPageXml:
        case TemplateType.RazorPageTemplate:
        case TemplateType.UWPResource:
            optionalImports = [];
            break;
        default:
            throw new Error(`Not expected type: ${TemplateType[type]}`);
    }

    return optionalImports;
}
