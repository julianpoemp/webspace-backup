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
    get entries(): FTPEntry[] {
        return this._entries;
    }

    private _entries: FTPEntry[] = [];

    constructor(path: string, entry: IFTPEntry) {
        super(path, entry);
    }

    public addEntry(entry: IFTPEntry) {
        let path = (entry.type === 'd') ? this._path + entry.name + '/' : this._path + entry.name;
        if (entry.type === 'd') {
            this._entries.push(new FTPFolder(path, entry));
        } else if (entry.type === '-') {
            this._entries.push(new FTPEntry(path, entry));
        }
    }

    public toString(level: number = 0) {
        let result = '|';

        for (let i = 0; i < level; i++) {
            result += '-';
        }

        result += `📁 ${this.name}/`;

        for (let entry of this._entries) {
            result += `\n${entry.toString(level + 1)}`;
        }

        return result;
    }

    public get length(): number {
        let result = 0;

        for (let entry of this._entries) {
            if (entry.type === 'd') {
                // @ts-ignore
                result += entry.length;
            } else {
                result += 1;
            }
        }

        return result;
    }
}
