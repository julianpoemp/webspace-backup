import * as Client from 'ftp';
import * as fs from 'fs';
import {FTPEntry, FTPFolder, IFTPEntry} from './FTPEntry';
import {Subject} from 'rxjs';

export class FTPManager {
    private isReady = false;
    private _client: Client;
    private currentDirectory = '';

    public readyChange: Subject<boolean>;

    constructor(path: string, options: FTPConnectionOptions) {
        this._client = new Client();
        this.readyChange = new Subject<boolean>();
        this.currentDirectory = path;

        this.connect(options).then(() => {
            this.isReady = true;
            this.gotTo(path).then(() => {
                this.onReady();
            }).catch((error) => {
                console.log('ERROR: ' + error);
                this.onConnectionFailed();
            });
        });
    }

    private connect(options: FTPConnectionOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._client.on('ready', () => {
                resolve();
            });
            this._client.connect(options);
        });
    }

    private onReady = () => {
        this.isReady = true;
        this.readyChange.next(true);
    };

    private onConnectionFailed() {
        this.isReady = false;
        this.readyChange.next(false);
    }

    public end() {
        this._client.end();
    }

    public gotTo(path: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isReady) {
                console.log(`open ${path}`);
                this._client.cwd(path, (err, currentDir) => {
                        if (err) {
                            reject(`ERROR: Could not go to path ${path}, FTP Error ` + err.code);
                        } else {
                            this._client.pwd((err, dir) => {
                                this.currentDirectory = dir;
                                resolve();
                            });
                        }
                    }
                );
            } else {
                throw new Error(`FTPManager is not ready. gotTo ${path}`);
            }
        });
    }

    public listEntries(): Promise<IFTPEntry[]> {
        return new Promise<IFTPEntry[]>((resolve, reject) => {
            if (this.isReady) {
                this._client.list((err, list: IFTPEntry[]) => {
                    if (err) {
                        reject(`ERROR: Could not list entries of path ${this.currentDirectory}, FTP Error ` + err.code);
                    } else {
                        resolve(list);
                    }
                });
            } else {
                throw new Error('FTPManager is not ready. list entries');
            }
        });
    }

    public afterManagerIsReady(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isReady) {
                resolve();
            } else {
                this.readyChange.subscribe(() => {
                        resolve();
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                    });
            }
        });
    }

    public getFolder(path: string): Promise<FTPFolder> {
        return new Promise<FTPFolder>((resolve, reject) => {
            this.gotTo(path).then(() => {
                this.listEntries().then((list) => {
                    let result: FTPFolder = null;
                    const folders: FTPFolder[] = [];
                    for (const entry of list) {
                        if (entry.name !== '.' && entry.name !== '..') {
                            if (entry.type === '-') {
                                result.addEntry(new FTPEntry(path + entry.name, entry));
                            } else if (entry.type === 'd') {
                                folders.push(new FTPFolder(path + entry.name + '/', entry));
                            }
                        } else if (entry.name === '.') {
                            // parent dir
                            entry.name = path.substring(0, path.lastIndexOf('/'));
                            entry.name = entry.name.substring(entry.name.lastIndexOf('/') + 1);
                            result = new FTPFolder(path, entry);
                        }
                    }

                    if (folders.length === 0) {
                        resolve(result);
                    } else {
                        let p = Promise.resolve(); // Q() in q

                        let counter = 0;
                        for (const folder of folders) {
                            p = p.then(() => {
                                return this.getFolder(folder.path).then((newFolder) => {
                                    newFolder.sortEntries();
                                    result.addEntry(newFolder);
                                    counter++;
                                }).catch((error) => {
                                    folder.readable = false;
                                    result.addEntry(folder);
                                    console.log(error);
                                    resolve(result);
                                });
                            });
                        }
                        p.then(() => {
                            result.sortEntries();
                            resolve(result);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }

    public downloadFolder(folder: FTPFolder, downloadPath: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            console.log(`download to ${downloadPath}`);
            if (!fs.existsSync(downloadPath + folder.name)) {
                fs.mkdirSync(downloadPath + folder.name);
            }
            downloadPath = downloadPath + folder.name + '/';

            const folders: FTPFolder[] = [];
            const files: FTPEntry[] = [];
            for (const entry of folder.entries) {
                if (entry instanceof FTPFolder) {
                    folders.push(entry);
                } else {
                    files.push(entry);
                }
            }

            new Promise<void>((resolve2) => {
                if (files.length > 0) {
                    let k = Promise.resolve();

                    for (const file of files) {
                        k = k.then(() => {
                           return this.downloadFile(file.path, downloadPath, file.name).catch((error) => {
                                console.log(error);
                            });
                        });
                    }

                    k.then(() => {
                        resolve2();
                    }).catch((error) => {
                        console.error(error);
                    });
                } else {
                    resolve2();
                }

            }).then(() => {
                console.log(`DOWNLOAD FOLDERS`);
                if (folders.length > 0) {
                    let p = Promise.resolve();
                    for (const folder1 of folders) {
                        p = p.then(() => {
                            this.downloadFolder(folder1, downloadPath).catch((error) => {
                                console.log(error);
                            });
                        });
                    }

                    p.then(() => {
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    });
                } else {
                    resolve();
                }
            }).catch((error) => {
                console.error(error);
            });
        });
    }

    public downloadFile(path: string, downloadPath: string, fileName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (fs.existsSync(downloadPath)) {
                console.log(`download file ${downloadPath}${fileName}`);
                this._client.get(path, (err, stream) => {
                    if (err) reject(err);

                    const writeStream = fs.createWriteStream(downloadPath + fileName);

                    stream.on('data',(chunk) => {
                        writeStream.write(chunk);
                    });
                    stream.on('end', () => {
                        writeStream.close();
                        console.log(`file ${downloadPath}${fileName} downloaded!`);
                        resolve();
                    });
                });
            } else {
                reject('downloadPath does not exist');
            }
        });
    }
}

export interface FTPConnectionOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    pasvTimeout: number;
}
