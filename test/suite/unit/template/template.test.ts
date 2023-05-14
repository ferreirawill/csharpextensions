import * as assert from 'assert';
import { EOL } from 'os';
import { sortBy, uniq } from 'lodash';
import { sep } from 'path';

import { FileScopedNamespaceConverter } from '../../../../src/fileScopedNamespaceConverter';
import Template from '../../../../src/template/template';
import { TemplateType } from '../../../../src/template/templateType';
import TemplateConfiguration from '../../../../src/template/templateConfiguration';


suite('Template', () => {
    const globalNameSpace = 'Test.NameSpace';
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
    const fileScopedNamespaceConverter = new FileScopedNamespaceConverter();

    allTypes.forEach((type) => {

        test(`GetExtension works for type ${TemplateType[type]}`, () => {
            const name = Template.getExtension(type);
            let expectedExtension;
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
                    expectedExtension = '.cs';
                    break;
                case TemplateType.UWPPageClass:
                case TemplateType.UWPUserControllClass:
                case TemplateType.UWPWindowClass:
                    expectedExtension = '.xaml.cs';
                    break;
                case TemplateType.UWPResource:
                    expectedExtension = '.resw';
                    break;
                case TemplateType.RazorPageTemplate:
                    expectedExtension = '.cshtml';
                    break;
                case TemplateType.UWPPageXml:
                case TemplateType.UWPUserControllXml:
                case TemplateType.UWPWindowXml:
                    expectedExtension = '.xaml';
                    break;
                default:
                    throw new Error(`Unexpected type: ${TemplateType[type]}`);
            }

            assert.strictEqual(name, expectedExtension);
        });
        test(`Retrieve Name works for type ${TemplateType[type]}`, () => {
            const name = Template.RetriveName(type);
            let expectedName;
            switch (type) {
                case TemplateType.Class:
                    expectedName = 'class';
                    break;
                case TemplateType.Inteface:
                    expectedName = 'interface';
                    break;
                case TemplateType.Enum:
                    expectedName = 'enum';
                    break;
                case TemplateType.Struct:
                    expectedName = 'struct';
                    break;
                case TemplateType.Controller:
                    expectedName = 'controller';
                    break;
                case TemplateType.ApiController:
                    expectedName = 'apicontroller';
                    break;
                case TemplateType.MsTest:
                    expectedName = 'mstest';
                    break;
                case TemplateType.NUnit:
                    expectedName = 'nunit';
                    break;
                case TemplateType.XUnit:
                    expectedName = 'xunit';
                    break;
                case TemplateType.RazorPageClass:
                    expectedName = 'razor_page.cs';
                    break;
                case TemplateType.UWPPageClass:
                    expectedName = 'uwp_page.cs';
                    break;
                case TemplateType.UWPUserControllClass:
                    expectedName = 'uwp_usercontrol.cs';
                    break;
                case TemplateType.UWPWindowClass:
                    expectedName = 'uwp_window.cs';
                    break;
                case TemplateType.UWPResource:
                    expectedName = 'uwp_resource';
                    break;
                case TemplateType.RazorPageTemplate:
                    expectedName = 'razor_page';
                    break;
                case TemplateType.UWPPageXml:
                    expectedName = 'uwp_page';
                    break;
                case TemplateType.UWPUserControllXml:
                    expectedName = 'uwp_usercontrol';
                    break;
                case TemplateType.UWPWindowXml:
                    expectedName = 'uwp_window';
                    break;
                default:
                    throw new Error(`Unexpected type: ${TemplateType[type]}`);
            }

            assert.strictEqual(name, expectedName);
        });
        test(`getTemplatePath for type ${TemplateType[type]}`, () => {
            const testPath = 'testPath';
            const path = Template.getTemplatePath(testPath, type);
            const templateName = Template.RetriveName(type).toLowerCase();
            const expectedTemplateFileName = `${templateName}.tmpl`;

            assert.strictEqual(path, `${testPath}${sep}${expectedTemplateFileName}`);
        });
        test(`Ctor works for type ${TemplateType[type]}`, () => {
            const templateConfiguration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, '', fileScopedNamespaceConverter, templateConfiguration);
            assert.strictEqual(template.getName(), Template.RetriveName(type));
            assert.strictEqual(template.getContent(), '');
            assert.strictEqual(template.getType(), type);
        });
    });

    const csharpTypes: Array<TemplateType> = [
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
        TemplateType.UWPPageClass,
        TemplateType.UWPUserControllClass,
        TemplateType.UWPWindowClass,
    ];
    csharpTypes.forEach((type) => {
        test(`${TemplateType[type]} build when no content and using namespace false and file scoped namespace false`, () => {
            const configuration = TemplateConfiguration.create(type, EOL,false);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, false);
            assert.strictEqual(result, '');
        });
        test(`${TemplateType[type]} build when no content and using namespace true and file scoped namespace false`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, false);
            assert.strictEqual(result, '');
        });
        test(`${TemplateType[type]} build when no content and using namespace false and file scoped namespace true`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, true);
            assert.strictEqual(result, '');
        });
        test(`${TemplateType[type]} build when namespace gets replaced in non file scope mode`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const content = `${EOL}\${namespace}${EOL}{${EOL}}${EOL}`;
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, false);
            const expectedResult = `${EOL}${globalNameSpace}${EOL}{${EOL}}${EOL}`;

            assert.strictEqual(result, expectedResult);
        });
        test(`${TemplateType[type]} build when namespace gets replaced in non file scope mode but no curly braces`, () => {
            const content = `${EOL}\${namespace}${EOL}`;
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, false);
            const expectedResult = `${EOL}${globalNameSpace}${EOL}`;

            assert.strictEqual(result, expectedResult);
        });
        test(`${TemplateType[type]} build when namespace gets replaced in file scope mode`, () => {
            const content = `\${namespace}${EOL}{${EOL}}${EOL}`;
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, true);
            assert.strictEqual(result, `${globalNameSpace};${EOL}${EOL}${EOL}`);
        });
        test(`${TemplateType[type]} build when EOL gets replaced with \\r\\n`, () => {
            const content = `${EOL}${EOL}${EOL}`;
            const configuration = TemplateConfiguration.create(type, '\r\n', false);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, true, );
            assert.strictEqual(result, '\r\n\r\n\r\n');
        });
        test(`${TemplateType[type]} build when EOL gets replaced with \\n`, () => {
            const content = `${EOL}${EOL}${EOL}`;
            const configuration = TemplateConfiguration.create(type,'\n', false);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, true);
            assert.strictEqual(result, '\n\n\n');
        });
        test(`${TemplateType[type]} build when class name gets replaced`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, '${classname}', fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, true);
            assert.strictEqual(result, 'test');
        });
        test(`${TemplateType[type]} build when no content and using namespace true and file scoped namespace true`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, true);
            assert.strictEqual(result, '');
        });
        test(`${TemplateType[type]} build when namespaces get replaced by required imports`, () => {
            const content = '${namespaces}';
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, false);
            const expectedResult = configuration.getRequiredUsings();

            assert.strictEqual(result, mergeImports(expectedResult));
        });
        test(`${TemplateType[type]} build when namespaces get replaced by required and optional imports`, () => {
            const content = '${namespaces}';
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.build('test', globalNameSpace, false);
            const expectedRequired = configuration.getRequiredUsings();
            const expectedOptional = configuration.getOptionalUsings();

            assert.strictEqual(result, mergeImports(expectedOptional, expectedRequired));
        });
        test(`${TemplateType[type]} FindCursorInTemplate when no content and using namespace false and file scoped namespace false`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.findCursorInTemplate('test', globalNameSpace, false);

            assert.strictEqual(result, null);
        });
        test(`${TemplateType[type]} FindCursorInTemplate when no content and using namespace true and file scoped namespace false`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.findCursorInTemplate('test', globalNameSpace, false);

            assert.strictEqual(result, null);
        });
        test(`${TemplateType[type]} FindCursorInTemplate when no content and using namespace false and file scoped namespace true`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, false);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.findCursorInTemplate('test', globalNameSpace, true);

            assert.strictEqual(result, null);
        });
        test(`${TemplateType[type]} FindCursorInTemplate when no content and using namespace true and file scoped namespace true`, () => {
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, '', fileScopedNamespaceConverter, configuration);
            const result = template.findCursorInTemplate('test', globalNameSpace, true);

            assert.strictEqual(result, null);
        });
        test(`${TemplateType[type]} FindCursorInTemplate when cursor defined by one line`, () => {
            const content = '${cursor}';
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.findCursorInTemplate('test', globalNameSpace, false);

            assert.strictEqual(result, null);
        });
        test(`${TemplateType[type]} FindCursorInTemplate when cursor on second line`, () => {
            const content = `
\${cursor}`;
            const configuration = TemplateConfiguration.create(type, EOL, true);
            const template = new Template(type, content, fileScopedNamespaceConverter, configuration);
            const result = template.findCursorInTemplate('test', globalNameSpace, false);

            assert.deepStrictEqual(result, [1, 1]);
        });
    });
});

function mergeImports(arg1: Array<string>, arg2 = new Array<string>()): string {
    let usings = arg1;
    usings = usings.concat(arg2);

    if (!usings.length) return '';

    const uniqueUsings = uniq(usings);
    const sortedUsings = sortBy(uniqueUsings, [(using) => !using.startsWith('System'), (using) => using]);
    const joinedUsings = sortedUsings
        .map(using => `using ${using};`)
        .join(EOL);

    return `${joinedUsings}${EOL}${EOL}`;
}