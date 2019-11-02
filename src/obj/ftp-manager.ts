import * as ftp from 'basic-ftp';
import {FileInfo} from 'basic-ftp';
import * as Path from 'path';
import * as fs from 'fs';
import {Subject} from 'rxjs';
import {FtpEntry, FTPFolder} from './ftp-entry';
import moment = require('moment');

export class FtpManager {
    private isReady = false;
    private _client: ftp.Client;
    private currentDirectory = '';

    public readyChange: Subject<boolean>;
    public error: Subject<string>;
    private connectionOptions: FTPConnectionOptions;

    public statistics = {
        folders: 0,
        files: 0,
        started: 0,
        ended: 0,
        duration: 0
    };

    private recursives = 0;

    constructor(path: string, options: FTPConnectionOptions) {
        this._client = new ftp.Client();
        this._client.ftp.verbose = false;
        this.readyChange = new Subject<boolean>();
        this.error = new Subject<string>();
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

    public async gotTo(path: string) {
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

    public async listEntries(path: string): Promise<FileInfo[]> {
        if (this.isReady) {
            return this._client.list(path);
        } else {
            throw new Error('FtpManager is not ready. list entries');
        }
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
                        result.addEntry(new FtpEntry(path + entry.name, entry));
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
                        resolve(result);
                    }).catch(() => {
                        reject(result);
                    });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }

    public async downloadFolder(remotePath: string, downloadPath: string) {
        this.recursives++;
        if ((this.recursives % 10) === 9) {
            console.log(`% wait 2 seconds...%`);
            await this.wait(2000);
        }


        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath);
        }

        try {
            const list = await this.listEntries(remotePath);
            for (const fileInfo of list) {
                if (fileInfo.isDirectory) {
                    const folderPath = remotePath + fileInfo.name + '/';
                    try {
                        await this.downloadFolder(folderPath, Path.join(downloadPath, fileInfo.name));
                        this.statistics.folders++;
                        console.log(`${this.getCurrentTimeString()}===> Directory downloaded: ${remotePath}\n`);
                    } catch (e) {
                        this.error.next(e);
                    }
                } else if (fileInfo.isFile) {
                    try {
                        const filePath = remotePath + fileInfo.name;
                        await this.downloadFile(filePath, downloadPath, fileInfo);
                    } catch (e) {
                        this.error.next(e);
                    }
                }
            }
            console.log(`return!`);
            return;
        } catch (e) {
            this.error.next(e);
        }
    }

    public async downloadFile(path: string, downloadPath: string, fileInfo: FileInfo) {
        if (fs.existsSync(downloadPath)) {
            const handler = (info) => {
                let procent = Math.round((info.bytes / fileInfo.size) * 10000) / 100;
                if (isNaN(procent)) {
                    procent = 0;
                }
                let procentStr = '';
                if (procent < 10) {
                    procentStr = '__';
                } else if (procent < 100) {
                    procentStr = '_';
                }
                procentStr += procent.toFixed(2);

                console.log(`${this.getCurrentTimeString()}---> ${info.type} (${procentStr}%): ${info.name}`);
            };

            if (this._client.closed) {
                try {
                    await this.connect();
                } catch (e) {
                    throw new Error(e);
                }
            }
            this._client.trackProgress(handler);
            try {
                await this._client.downloadTo(Path.join(downloadPath, fileInfo.name), path);
                this._client.trackProgress(undefined);
                this.statistics.files++;
            } catch (e) {
                throw new Error(e);
            }
        } else {
            throw new Error('downloadPath does not exist');
        }
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


    public getCurrentTimeString(): string {
        const duration = Date.now() - this.statistics.started;
        return moment().format('L LTS') + ' | Duration: ' + this.getTimeString(duration) + ' ';
    }

    public getTimeString(timespan: number) {
        if (timespan < 0) {
            timespan = 0;
        }

        let result = '';
        const minutes: string = this.formatNumber(this.getMinutes(timespan), 2);
        const seconds: string = this.formatNumber(this.getSeconds(timespan), 2);
        const hours: string = this.formatNumber(this.getHours(timespan), 2);

        result += hours + ':' + minutes + ':' + seconds;

        return result;
    }

    private formatNumber = (num, length): string => {
        let result = '' + num.toFixed(0);
        while (result.length < length) {
            result = '0' + result;
        }
        return result;
    };

    private getSeconds(timespan: number): number {
        return Math.floor(timespan / 1000) % 60;
    }

    private getMinutes(timespan: number): number {
        return Math.floor(timespan / 1000 / 60);
    }

    private getHours(timespan: number): number {
        return Math.floor(timespan / 1000 / 60 / 60);
    }

    public async wait(time: number): Promise<void>{
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, time);
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
