import * as assert from 'assert';
import Maybe from '../../../../src/common/maybe';

suite('Maybe', () => {
    test('none', () => {
        const maybeString = Maybe.none<string>();
        assert.strictEqual(maybeString.isNone(), true);
        assert.strictEqual(maybeString.isSome(), false);
        assert.throws(() => maybeString.value());
    });

    test('some', () => {
        const maybeString = Maybe.some<string>('test');
        assert.strictEqual(maybeString.isNone(), false);
        assert.strictEqual(maybeString.isSome(), true);
        assert.strictEqual(maybeString.value(), 'test');
    });
});
