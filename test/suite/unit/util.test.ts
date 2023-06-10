import * as assert from 'assert';
import { EOL } from 'os';
import { getEolSetting } from '../../../src/util';

suite('Util', () => {
    test('getEolSetting when eol is default system', () => {
        const eol = getEolSetting(EOL);
        assert.strictEqual(eol, EOL);
    });

    test('getEolSetting when eol is arbitrary value', () => {
        const eol = getEolSetting('eol');
        assert.strictEqual(eol, EOL);
    });

    test('getEolSetting when eol is \\r\\n', () => {
        const eol = getEolSetting('\r\n');
        assert.strictEqual(eol, '\r\n');
    });

    test('getEolSetting when eol is \\n', () => {
        const eol = getEolSetting('\n');
        assert.strictEqual(eol, '\n');
    });
});
