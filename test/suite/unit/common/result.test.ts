import * as assert from 'assert';
import Result from '../../../../src/common/result';

suite('Result', () => {
    test('Invalid', () => {
        assert.throws(() => Result.error<string>('success', 'Info message'));
    });

    test('Result Ok', () => {
        const result = Result.ok<string>('testStringValue');

        assert.strictEqual(result.isOk(), true);
        assert.strictEqual(result.isErr(), false);
        assert.strictEqual(result.status(), 'success');
        assert.strictEqual(result.value(), 'testStringValue');
        assert.strictEqual(result.info(), undefined);
    });

    test('Result error', () => {
        const result = Result.error<string>('testErrorStatus', 'testerror');

        assert.strictEqual(result.isOk(), false);
        assert.strictEqual(result.isErr(), true);
        assert.strictEqual(result.status(), 'testErrorStatus');
        assert.throws(() => result.value());
        assert.strictEqual(result.info(), 'testerror');
    });
});
