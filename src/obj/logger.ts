import moment = require('moment');
import {ConsoleOutput} from './console-output';

export class Logger {
    get queue(): LoggerEntry[] {
        return this._queue;
    }

    private _queue: LoggerEntry[] = [];

    constructor() {
    }

    public add(message: string, type: 'error' | 'success' | 'info' | 'warning', path: string = '') {
        this._queue.push(new LoggerEntry(message, type, path));
        this.sort();
    }

    public log(message: string, type: 'error' | 'success' | 'info' | 'warning', path: string = '') {
        this.add(message, type, path);

        switch (type) {
            case 'success':
                ConsoleOutput.success(message);
                break;
            case 'info':
                ConsoleOutput.info(message);
                break;
            case 'error':
                ConsoleOutput.error(message);
                break;
            case 'warning':
                ConsoleOutput.warning(message);
                break;
        }
    }

    public get errorLogs(): LoggerEntry[] {
        return this._queue.filter((a) => {
            return a.type === 'error';
        });
    }

    private sort() {
        this._queue = this._queue.sort((a, b) => {
            if (a.timestamp === b.timestamp) {
                return 0;
            }
            return (a.timestamp < b.timestamp) ? -1 : 1;
        });
    }
}

export class LoggerEntry {
    get path(): string {
        return this._path;
    }

    get message(): string {
        return this._message;
    }

    get type(): 'error' | 'success' | 'info' | 'warning' {
        return this._type;
    }

    get timestamp(): number {
        return this._timestamp;
    }

    private _timestamp: number;
    private _type: 'error' | 'success' | 'info' | 'warning';
    private _message: string;
    private _path: string = '';

    constructor(message: string, type: 'error' | 'success' | 'info' | 'warning', path: string = '') {
        this._type = type;
        this._message = message;
        this._path = path;
    }

    public toString() {
        const imploded = this._message.replace(/\n/g, ' | ');
        return `${moment(this._timestamp).format('L LTS')}\t${this._type.toUpperCase()}\t${this._path}\t${imploded}`;
    }
}
