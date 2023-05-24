import Status from './status';

type Func<T, T2> = (value: T) => Result<T2>;
type FuncAsync<T, T2> = (value: T) => Promise<Result<T2>>;

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

    public AndThenSync<T2>(fun: Func<T, T2>): Result<T2> {

        if (this.isOk()) {
            return fun(this.value());
        }

        return Result.error<T2>(this.status(), this.info());
    }

    public AndThen<T2>(fun: FuncAsync<T, T2>): Promise<Result<T2>> {
        if (this.isOk()) {
            return fun(this.value());
        }

        return Promise.resolve(Result.error<T2>(this.status(), this.info()));
    }

    public static ok<T>(value: T): Result<T> { return new Result(value, Status.success(), undefined); }
    public static error<T>(innerStatus: string, info: string | undefined): Result<T> { return new Result<T>(undefined, Status.error(innerStatus), info); }
}
