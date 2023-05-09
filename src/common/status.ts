export default class Status {
    private _isSuccessful: boolean;
    private _innerStatus: string;

    constructor(isSuccessful: boolean, innerStatus: string) {
        if (isSuccessful && !innerStatus.toLowerCase().includes('success')) {
            throw new Error('Successful status cannot have a successful inner status');
        }

        if (!isSuccessful && !innerStatus.toLowerCase().includes('error')) {
            throw new Error('Error status must have an error inner status');
        }

        this._isSuccessful = isSuccessful;
        this._innerStatus = innerStatus;
    }

    public isSuccessful(): boolean { return this._isSuccessful; }
    public innerStatus(): string { return this._innerStatus; }

    public static success(innerStatus = 'success'): Status {
        return new Status(true, innerStatus);
    }

    public static error(innerErrorStatus = 'error'): Status {
        return new Status(false, innerErrorStatus);
    }
}
