import {Configuration} from "../../app-settings";
import {Subject} from "rxjs";
import {Logger} from "../logger";
import {ConsoleOutput} from "../console-output";
import moment = require("moment");

export abstract class ConnectionManager {
    get logger(): Logger {
        return this._logger;
    }

    protected isReady = false;
    public readyChange: Subject<boolean>;
    protected connectionOptions: ConnectionOptions;
    protected readonly protocol: 'ftp' | 'ftps' | 'sftp' = 'ftps';
    protected currentDirectory = '';

    protected _logger: Logger = new Logger();

    protected folderQueue: {
        remotePath: string,
        downloadPath: string
    }[] = [];


    public statistics = {
        folders: 0,
        files: 0,
        started: 0,
        ended: 0,
        duration: 0
    };

    protected recursives = 0;

    protected constructor(path: string, configuration: Configuration) {
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
                this.isReady = false;
                this.readyChange.next(false);
                this.onConnectionFailed(e);
                reject(e);
            });
        });
    }

    /**
     * after the FTP manager was initialized
     */
    protected onReady = () => {
        this.isReady = true;
        this.readyChange.next(true);
    };

    /**
     * after the connection was failed
     *
     */
    protected abstract onConnectionFailed(error: { name: string, code: number });

    /**
     * connects via FTP or FTPS
     */
    protected async abstract connect();

    /**
     * closes the client
     */
    public abstract close();

    /**
     * promise that is executed after the ConnectionManager is ready
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
     * opens a remote directory and changes the current directory
     * @param path
     */
    public async abstract gotTo(path: string);

    /**
     * changes the current folder to the parent folder
     */
    public async abstract goUp();

    /**
     * lists entries
     * @param path
     */
    public async abstract listEntries(path: string): Promise<FileInfo[]>;

    /**
     * downloads a remote folder
     * @param remotePath
     * @param downloadPath
     */
    public async abstract downloadFolder(remotePath: string, downloadPath: string) ;

    /**
     * private download method to download a folder
     * @param remotePath
     * @param downloadPath
     * @private
     */
    protected async abstract _downloadFolder(remotePath: string, downloadPath: string);

    /**
     * checks if the local folder exists
     * @param path
     */
    protected async abstract existsFolder(path: string);

    /**
     * downloads a remote file
     * @param path
     * @param downloadPath
     * @param fileInfo
     */
    public async abstract downloadFile(path: string, downloadPath: string, fileInfo: FileInfo);

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


export interface ConnectionOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    privateKeyPath?: string;
}

export interface FileInfo {
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    size: number;
}
