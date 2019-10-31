export interface IFTPEntry {
    type: 'd' | '-' | 'l',
    name: string,
    target: any,
    sticky: boolean,
    rights: {
        user: string,
        group: string,
        other: string
    },
    acl: boolean,
    owner: string,
    group: string,
    size: number,
    date: string
}

export class FTPEntry implements IFTPEntry {
    get path(): string {
        return this._path;
    }

    type: 'd' | '-' | 'l';
    name: string;
    target: any;
    sticky: boolean;
    rights: {
        user: string;
        group: string;
        other: string;
    };
    acl: boolean;
    owner: string;
    group: string;
    size: number;
    date: string;

    protected _path: string;

    constructor(path: string, entry: IFTPEntry) {
        for (let attr in entry) {
            if (entry.hasOwnProperty(attr)) {
                this['' + attr] = entry['' + attr];
            }
        }
        this._path = path;
    }

    public toString(level: number = 0) {
        let result = '|';
        for (let i = 0; i < level; i++) {
            result += '-';
        }

        result += `📄 ${this.name} (${this.size})`;

        return result;
    }
}

export class FTPFolder extends FTPEntry {
    get readable(): boolean {
        return this._readable;
    }

    set readable(value: boolean) {
        this._readable = value;
    }

    get length(): number {
        return this._length;
    }

    get entries(): FTPEntry[] {
        return this._entries;
    }

    private _entries: FTPEntry[] = [];
    private parent: FTPFolder;
    private _length = 0;

    private _readable = true;

    constructor(path: string, entry: IFTPEntry, parent: FTPFolder = null) {
        super(path, entry);
        this.size = 0;
        this.parent = parent;
    }

    public addEntry(entry: FTPEntry) {
        this._entries.push(entry);
        this._length++;
        this.size += entry.size;
    }

    public toString(level: number = 0) {
        let result = '|';

        for (let i = 0; i < level; i++) {
            result += '-';
        }

        const icon = (this.readable) ? '📁 ' : '❌  ';
        const size = getFileSize(this.size);
        result += `${icon}${this.name}/ (entries: ${this.length}, size: ${size.size} ${size.label})`;

        for (let entry of this._entries) {
            result += `\n${entry.toString(level + 1)}`;
        }

        return result;
    }

    public sortEntries() {
        this._entries.sort((a, b) => {
            if (a.name <= b.name) {
                return -1;
            }
            return (a.name === b.name) ? 0 : 1;
        });
    }
}

export interface FileSize {
    size: number;
    label: string;
}

export function getFileSize(bytes: number): FileSize {
    const result: FileSize = {
        size: 0,
        label: ''
    };

    if ((bytes / 1000) < 1) {
        // take bytes
        result.size = bytes;
        result.label = 'B';
    } else if (bytes / (1000 * 1000) < 1) {
        // take kilobytes
        result.size = bytes / 1000;
        result.label = 'KB';
    } else if (bytes / (1000 * 1000 * 1000) < 1) {
        // take megabyte
        result.size = bytes / 1000 / 1000;
        result.label = 'MB';
    } else if (bytes / (1000 * 1000 * 1000 * 1000) < 1) {
        // take gigabytes

        result.size = bytes / 1000 / 1000 / 1000;
        result.label = 'GB';
    }

    result.size = Math.round(result.size * 1000) / 1000;

    return result;
}
