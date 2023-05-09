export default class Maybe<T> {
    private _inner: T | undefined;

    private constructor(inner: T | undefined) {
        this._inner = inner;
    }

    public isNone(): boolean {
        return this._inner === undefined;
    }

    public isSome(): boolean {
        return this._inner !== undefined;
    }

    public value(): T {
        if (this.isNone()) {
            throw new Error('Tried to get a value from a None-is Maybe');
        }

        return this._inner as T;
    }

    public static some<T>(value: T): Maybe<T> {
        return new Maybe<T>(value);
    }

    public static none<T>(): Maybe<T> {
        return new Maybe<T>(undefined);
    }
}
