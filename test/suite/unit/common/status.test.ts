import * as assert from 'assert';

import Status from '../../../../src/common/status';

suite('Status', () => {
    test('Ctor invalid', () => {
        assert.throws(() => new Status(false, 'success'));
        assert.throws(() => new Status(true, 'error'));
    });

    test('Success', () => {
        const status = Status.success();

        assert.strictEqual(status.isSuccessful(), true);
        assert.strictEqual(status.innerStatus(), 'success');
    });

    test('Error', () => {
        const status = Status.error('errorTestStatus');

        assert.strictEqual(status.isSuccessful(), false);
        assert.strictEqual(status.innerStatus(), 'errorTestStatus');
    });
});
