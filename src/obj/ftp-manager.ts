import * as ftp from 'basic-ftp';
import {FileInfo} from 'basic-ftp';
import * as Path from 'path';
import * as fs from 'fs-extra';
import {Subject} from 'rxjs';
import {AppSettings, Configuration} from '../app-settings';
import {ConsoleOutput} from './console-output';
import {Logger} from './logger';
import moment = require('moment');

export class FtpManager {
    get logger(): Logger {
        return this._logger;
    }

    private isReady = false;
    private _client: ftp.Client;
    private currentDirectory = '';

    public readyChange: Subject<boolean>;
    private connectionOptions: FTPConnectionOptions;

    private folderQueue: {
        remotePath: string,
        downloadPath: string
    }[] = [];

    private _logger: Logger = new Logger();

    private readonly protocol: 'ftp' | 'ftps' = 'ftps';

    public statistics = {
        folders: 0,
        files: 0,
        started: 0,
        ended: 0,
        duration: 0
    };

    private recursives = 0;

    constructor(path: string, configuration: Configuration) {
        this._client = new ftp.Client(configuration.server.timeout * 1000);
        this._client.ftp.verbose = configuration.server.verbose;
        this.readyChange = new Subject<boolean>();
        this.connectionOptions = {
            host: configuration.server.host,
            port: configuration.server.port,
            user: configuration.server.user,
            password: configuration.server.password
        };
        this.protocol = configuration.server.protocol;
    }

    public start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.connect().then(() => {
                this.isReady = true;
                this.onReady();
                resolve();
            }).catch((e) => {
                this.onConnectionFailed(e);
                reject(e);
            });
        });
    }

    /**
     * connects via FTP or FTPS
     */
    private async connect() {
        try {
            this.logger.log(`connect via ${this.protocol}...`, 'info');
            await this._client.access({
                host: this.connectionOptions.host,
                user: this.connectionOptions.user,
                password: this.connectionOptions.password,
                secure: (this.protocol === 'ftps')
            });
            return true;
        } catch (e) {
            throw e;
        }
    }

    /**
     * after the FTP manager was initialized
     */
    private onReady = () => {
        this.isReady = true;
        this.readyChange.next(true);
    };

    /** after the connection was failed
     *
     */
    private onConnectionFailed(error: { name: string, code: number }) {
        this.isReady = false;
        this.readyChange.next(false);

        if (error.name === "FTPError") {
            switch (error.code) {
                case(530):
                    ConsoleOutput.error("Invalid username or password");
                    break;
            }
        }
    }

    /**
     * closes the client
     */
    public close() {
        this._client.close();
    }

    /**
     * opens a remote directory and changes the current directory
     * @param path
     */
    public async gotTo(path: string) {
        return new Promise<void>((resolve, reject) => {
            if (this.isReady) {
                this.logger.log(`open ${path}`, 'info');
                this._client.cd(path).then(() => {
                    this._client.pwd().then((dir) => {
                        if (dir === this.currentDirectory) {
                            reject(new Error('currentDirectory not changed!'));
                        } else {
                            this.currentDirectory = dir;
                            resolve();
                        }
                    }).catch((error) => {
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject(new Error(`FTPManager is not ready. gotTo ${path}`));
            }
        });
    }

    /**
     * changes the current folder to the parent folder
     */
    public async goUp() {
        return new Promise<void>((resolve, reject) => {
            if (this.isReady) {
                this._client.cdup().then(() => {
                    this._client.pwd().then((dir) => {
                        if (dir === this.currentDirectory) {
                            reject(new Error('currentDirectory not changed!'));
                        } else {
                            this.currentDirectory = dir;
                            resolve();
                        }
                    }).catch((error) => {
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject(new Error(`FTPManager is not ready.`));
            }
        });
    }

    /**
     * lists entries
     * @param path
     */
    public async listEntries(path: string): Promise<FileInfo[]> {
        if (this.isReady) {
            try {
                await this.gotTo(path);
                return await this._client.list();
            } catch (e) {
                throw e;
            }
        } else {
            throw new Error('FtpManager is not ready. list entries');
        }
    }

    /**
     * promise that is executed after the FTPManager is ready
     */
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

    /**
     * returns the folder
     * @deprecated
     * @param path

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
                                ConsoleOutput.log(`${folder.path} added, ${counter}/${folders.length}`);
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
     */

    /**
     * downloads a remote folder
     * @param remotePath
     * @param downloadPath
     */
    public async downloadFolder(remotePath: string, downloadPath: string) {
        this.folderQueue.push({remotePath, downloadPath});

        while (this.folderQueue.length > 0) {
            const {remotePath, downloadPath} = this.folderQueue.shift();
            try {
                await this._downloadFolder(remotePath, downloadPath);
                this.statistics.folders++;
                this.logger.log(`directory downloaded: ${remotePath}\n`, 'success', remotePath);
            } catch (e) {
                this._logger.add(e.message, 'error', remotePath);
                this.logger.log(e.toString(), 'error', remotePath);
            }
        }
    }

    /**
     * private download method to download a folder
     * @param remotePath
     * @param downloadPath
     * @private
     */
    private async _downloadFolder(remotePath: string, downloadPath: string) {
        this.recursives++;

        if (this.recursives % 100 === 99) {
            this.logger.log('wait...', 'info');
            await this.wait(0);
        }

        try {
            if (!await this.existsFolder(downloadPath)) {
                await fs.mkdir(downloadPath, {recursive: true});
            }
        } catch (e) {
            this._logger.add(e.message, 'error', remotePath);
            return true;
        }

        let list: FileInfo[] = [];
        if (this._client.closed) {
            try {
                this.logger.log('RECONNECT...', 'warning');
                await this.connect();
            } catch (e) {
                throw new Error(e);
            }
        }
        try {
            this.logger.log(`download folder ${remotePath} ...`, 'info');
            list = await this.listEntries(remotePath);
        } catch (e) {
            this._logger.add(e.message, 'error', remotePath);
            return true;
        }

        for (const fileInfo of list) {
            if (fileInfo.isDirectory) {
                const folderPath = remotePath + fileInfo.name + '/';
                const targetPath = Path.join(downloadPath, fileInfo.name);
                this.folderQueue.push({remotePath: folderPath, downloadPath: targetPath});
            } else if (fileInfo.isFile) {
                const filePath = remotePath + fileInfo.name;
                try {
                    await this.downloadFile(filePath, downloadPath, fileInfo);
                } catch (e) {
                    this._logger.add(e.message, 'error', filePath);
                }
            }
        }
        try {
            await this.goUp();
            return true;
        } catch (e) {
            this._logger.add(e.message, 'error', remotePath);
            throw e;
        }
    }

    /**
     * checks if the local folder exists
     * @param path
     */
    private async existsFolder(path: string) {
        return new Promise<boolean>((resolve) => {
            fs.stat(path, (err) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * downloads a remote file
     * @param path
     * @param downloadPath
     * @param fileInfo
     */
    public async downloadFile(path: string, downloadPath: string, fileInfo: FileInfo) {
        this.recursives++;

        if (this.recursives % 100 === 99) {
            this.logger.log('wait..', 'info');
            await this.wait(0);
        }

        let existsFolder = false;
        try {
            existsFolder = await this.existsFolder(downloadPath)
        } catch (e) {
            throw e;
        }

        if (existsFolder) {
            const handler = (info) => {
                let percent = Math.round((info.bytes / fileInfo.size) * 10000) / 100;
                if (isNaN(percent)) {
                    percent = 0;
                }
                let percentStr = '';
                if (percent < 10) {
                    percentStr = '__';
                } else if (percent < 100) {
                    percentStr = '_';
                }
                percentStr += percent.toFixed(2);

                if (AppSettings.settings.console.tty) {
                    ConsoleOutput.logLive(`${this.getCurrentTimeString()} ---> ${info.type} (${percentStr}%): ${info.name}`);
                } else {
                    ConsoleOutput.log(`${this.getCurrentTimeString()} ---> ${info.type} (${percentStr}%): ${info.name}`);
                }
            };

            if (this._client.closed) {
                try {
                    this.logger.log('RECONNECT...', 'warning');
                    await this.connect();
                } catch (e) {
                    throw new Error(e);
                }
            }
            this._client.trackProgress(handler);
            try {
                await this._client.downloadTo(Path.join(downloadPath, fileInfo.name), fileInfo.name);
                this.logger.add(`downloaded file`, 'success', downloadPath);
                this._client.trackProgress(undefined);
                this.statistics.files++;
                return true;
            } catch (e) {
                this._client.trackProgress(undefined);
                throw new Error(e);
            }
        } else {
            throw new Error('downloadPath does not exist');
        }
    }

    /**
     * returns a current time string for logging.
     */
    public getCurrentTimeString(): string {
        const duration = Date.now() - this.statistics.started;
        return moment().format('L LTS') + ' | Duration: ' + ConsoleOutput.getTimeString(duration) + ' ';
    }

    /**
     * waits a specific time before the next method is called asynchronously
     */
    public async wait(time: number): Promise<void> {
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
}
