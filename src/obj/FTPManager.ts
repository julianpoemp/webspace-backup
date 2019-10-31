import * as ftp from 'basic-ftp';
import {FileInfo} from 'basic-ftp';
import * as Path from 'path';
import * as fs from 'fs';
import {FTPEntry, FTPFolder} from './FTPEntry';
import {Subject} from 'rxjs';

export class FTPManager {
    private isReady = false;
    private _client: ftp.Client;
    private currentDirectory = '';

    public readyChange: Subject<boolean>;
    private connectionOptions: FTPConnectionOptions;

    constructor(path: string, options: FTPConnectionOptions) {
        this._client = new ftp.Client();
        this._client.ftp.verbose = false;
        this.readyChange = new Subject<boolean>();
        this.currentDirectory = path;
        this.connectionOptions = options;

        this.connect().then(() => {
            this.isReady = true;
            this.gotTo(path).then(() => {
                this.onReady();
            }).catch((error) => {
                console.log('ERROR: ' + error);
                this.onConnectionFailed();
            });
        });
    }

    private connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._client.access({
                host: this.connectionOptions.host,
                user: this.connectionOptions.user,
                password: this.connectionOptions.password,
                secure: true
            }).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
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

    public close() {
        this._client.close();
    }

    public gotTo(path: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isReady) {
                console.log(`open ${path}`);
                this._client.cd(path).then(() => {
                    this._client.pwd().then((dir) => {
                        this.currentDirectory = dir;
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject(`FTPManager is not ready. gotTo ${path}`);
            }
        });
    }

    public listEntries(path: string): Promise<FileInfo[]> {
        return new Promise<FileInfo[]>((resolve, reject) => {
            if (this.isReady) {
                this._client.list(path).then((list) => {
                    resolve(list);
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject('FTPManager is not ready. list entries');
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
            this.listEntries(path).then((list) => {
                let name = path.substring(0, path.lastIndexOf('/'));
                name = name.substring(name.lastIndexOf('/') + 1);

                let result: FTPFolder = new FTPFolder(path, new FileInfo(name));
                const folders: FTPFolder[] = [];

                for (const entry of list) {
                    if (entry.isFile) {
                        result.addEntry(new FTPEntry(path + entry.name, entry));
                    } else if (entry.isDirectory) {
                        folders.push(new FTPFolder(path + entry.name + '/', entry));
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
                                console.log(`${folder.path} added, ${counter}/${folders.length}`);
                            }).catch((error) => {
                                folder.readable = false;
                                result.addEntry(folder);
                            });
                        });
                    }
                    p.then(() => {
                        result.sortEntries();
                        console.log(`FINISHED ${path}`);
                        resolve(result);
                    });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }

    public downloadFolder2(path: string, downloadPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._client.trackProgress(this.trackingHandler);
            this._client.downloadToDir(downloadPath, path).then((result) => {
                this._client.trackProgress(undefined);
                resolve();
            }).catch((error) => {
                this._client.trackProgress(undefined);
                console.error(error);
            });
        });
    }

    private trackingHandler = (info) => {
        console.log('File: ' + info.name +  ", " + 'Transferred Overall: ' + info.bytesOverall);
    };

    public downloadFolder(folder: FTPFolder, downloadPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.log(`download to ${downloadPath}`);
            if (!fs.existsSync(Path.join(downloadPath, folder.name))) {
                fs.mkdirSync(Path.join(downloadPath, folder.name));
            }
            downloadPath = Path.join(downloadPath, folder.name);

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
                        resolve2();
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
                            return this.downloadFolder(folder1, downloadPath).catch((error) => {
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

                new Promise<void>((resolve2, reject2) => {
                    if (this._client.closed) {
                        this.connect().then((result) => {
                            resolve2();
                        }).catch((error) => {
                            reject2(error);
                        });
                    } else {
                        resolve2();
                    }
                }).then(() => {
                    this._client.downloadTo(Path.join(downloadPath, fileName), path).then(() => {
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject('downloadPath does not exist');
            }
        });
    }

    public chmod(path: string, permission: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._client.send(`SITE CHMOD ${permission} ${path}`).then(() => {
                console.log(`changed chmod of ${path} to ${permission}`);
                resolve();
            }).catch((error) => {
                reject(error);
            });
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
