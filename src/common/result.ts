import Status from './status';

export default class Result<T> {
    private _value: T | undefined;
    private _status: Status;
    private _info: string | undefined;

    private constructor(value: T | undefined, status: Status, info: string | undefined) {
        if (!status.isSuccessful() && (!!value)) {
            throw new Error('A non successful status cannot have a value');
        }

        if (status.isSuccessful() && (!!info)) {
            throw new Error('A successful status canno have an error info message');
        }

        this._status = status;
        this._value = value;
        this._info = info;
    }

    public value(): T {
        if (!this.isOk()) {
            throw new Error('Trying to access to a value of non Ok Result');
        }

        return this._value as T;
    }

    public isOk(): boolean { return this._status.isSuccessful(); }
    public isErr(): boolean { return !this._status.isSuccessful(); }
    public info(): string | undefined { return this._info; }
    public status(): string { return this._status.innerStatus(); }

    public static ok<T>(value: T): Result<T> { return new Result(value, Status.success(), undefined); }
    public static error<T>(innerStatus ='error', info: string | undefined): Result<T> { return new Result<T>(undefined, Status.error(innerStatus), info); }
}
