import {AppSettings} from '../AppSettings';
import * as Client from 'ftp';
import {FTPFolder, IFTPEntry} from './FTPEntry';
import {FTPQueue} from './FTPQueue';

export class BackupManager {
    private _client: Client;
    private isReady = false;

    private queue: FTPQueue = new FTPQueue();

    constructor() {
        this._client = new Client();
        this._client.on('ready', this.onReady);
        this.connect();
    }

    private connect() {
        // connect to localhost:21 as anonymous
        this._client.connect({
            host: AppSettings.settings.server.host,
            port: AppSettings.settings.server.port,
            user: AppSettings.settings.server.user,
            password: AppSettings.settings.server.password
        });
    }

    private onReady = () => {
        this.isReady = true;
    };

    public test() {
        this._client.cwd(AppSettings.settings.backup.root, (err, currentDir) => {
            if (err) {
                console.log(`ERROR ${err.code}`);
            } else {
                const folder = new FTPFolder('/nwc/', {
                    type: 'd',
                    name: 'nwc',
                    target: null,
                    sticky: false,
                    rights: {
                        user: '',
                        group: '',
                        other: '',
                    },
                    acl: false,
                    owner: '',
                    group: '',
                    size: 0,
                    date: '',
                });

                this.getObjectTree('/nwc/').then((result: FTPFolder) => {
                    console.log(`GOT TREE:`);
                    console.log(result.toString());
                    console.log(`${folder.length} files added`);
                    this._client.end();
                }).catch((error) => {
                    console.log(`err`);
                    console.log(error);
                });
            }
        });
    }

    public end() {
        this._client.end();
    }

    public getObjectTree(path: string): Promise<FTPFolder> {
        return new Promise<FTPFolder>((resolve, reject) => {
            this.openDir(path).then(() => {
                this.listEntries().then((list) => {
                    const paths: string[] = [];
                    let entryObject: FTPFolder;
                    for (const entry of list) {
                        if (entry.name !== '.' && entry.name !== '..') {
                            if (entry.type === 'd') {
                                entryObject.addEntry(entry);
                                paths.push(path + entry.name + '/');
                            } else if (entry.type === '-') {
                                console.log(`add file ${path + entry.name}`);
                                entryObject.addEntry(entry);
                            }
                        } else if (entry.name === '.') {
                            entry.name = path.substring(0, path.length - 1);
                            entry.name = entry.name.substring(entry.name.lastIndexOf('/') + 1);
                            entryObject = new FTPFolder(path, entry);
                        }
                    }

                    if (paths.length === 0) {
                        resolve(entryObject);
                    } else {
                        this.getTreeSquencial(paths, []).then((folders) => {
                            console.log(`GOT sequential ${folders.length}`);
                            for (const entry of folders) {
                                entryObject.addEntry(entry);
                            }
                            resolve(entryObject);
                        }).catch((error) => {
                            console.error(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                resolve(null);
            });
        });
    }

    private openDir(path: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.log(`open ${path}`);
            this._client.cwd(path, (err, currentDir) => {
                    if (err) {
                        reject(err);
                    } else {
                        this._client.pwd((err, dir) => {
                            console.log(`current dir: ${dir}`);
                            resolve();
                        });
                    }
                }
            )
        });
    }

    private listEntries(): Promise<IFTPEntry[]> {
        return new Promise<IFTPEntry[]>((resolve, reject) => {
            this._client.list((err, list: IFTPEntry[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(list);
                }
            });
        });
    }

    private getTreeSquencial(paths: string[], results: FTPFolder[]): Promise<FTPFolder[]> {
        console.log(`treSequCalls`);
        if (paths.length > 0) {
            console.log(`GTTT ${paths[0]}`);
            this.getObjectTree(paths[0]).then((result) => {
                results.push(result);
                paths.splice(0, 1);
                return this.getTreeSquencial(paths, results);
            }).catch((error) => {
                return new Promise<FTPFolder>((resolve, reject) => {
                    console.log(error);
                });
            });
        }
        return new Promise<FTPFolder[]>((resolve, reject) => {
            resolve(results);
        });
    }
}
