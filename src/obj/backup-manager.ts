import {AppSettings} from '../AppSettings';
import {FTPQueue} from './FTPQueue';
import {FTPManager} from './FTPManager';
import * as path from 'path';

export class BackupManager {

    private queue: FTPQueue = new FTPQueue();
    private ftpManager: FTPManager;

    constructor() {
        this.ftpManager = new FTPManager('/nwc/', {
            host: AppSettings.settings.server.host,
            port: AppSettings.settings.server.port,
            user: AppSettings.settings.server.user,
            password: AppSettings.settings.server.password,
            pasvTimeout: AppSettings.settings.server.pasvTimeout
        });

        this.ftpManager.afterManagerIsReady().then(() => {
            console.log(`TEST!`);
            this.test();
        }).catch((error) => {
            console.error(error);
        });
    }

    public test() {
        this.ftpManager.gotTo(AppSettings.settings.backup.root).then(() => {
            this.ftpManager.getFolder(AppSettings.settings.backup.root).then((tree) => {
                console.log(tree.toString());

                this.ftpManager.downloadFolder(tree, path.join(AppSettings.appPath, '')).then(() => {
                    console.log(`download ok to ${AppSettings.appPath}`);
                    console.log(`!END!`);
                    this.ftpManager.close();
                }).catch((error) => {
                    console.log(error);
                    console.log(`!END!`);
                    this.ftpManager.close();
                });

            }).catch((error) => {
                console.error(error);
            });
        }).catch((error) => {
            console.log(`ERROR: ${error}`);
            this.ftpManager.close();
        });
    }
}
