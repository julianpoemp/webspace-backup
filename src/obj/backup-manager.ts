import {AppSettings} from '../AppSettings';
import {FTPQueue} from './FTPQueue';
import {FTPManager} from './FTPManager';

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

                console.log(`download...`);
                this.ftpManager.downloadFolder(tree, AppSettings.appPath + '/').then(() => {
                    console.log(`download ok to ${AppSettings.appPath}`);
                    this.ftpManager.end();
                }).catch((error) => {
                    console.log(error);
                    this.ftpManager.end();
                });

            }).catch((error) => {
                console.error(error);
            });
        }).catch((error) => {
            console.log(`ERROR: ${error}`);
            this.ftpManager.end();
        });
    }
}
