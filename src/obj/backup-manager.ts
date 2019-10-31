import {AppSettings} from '../AppSettings';
import {FTPQueue} from './FTPQueue';
import {FTPManager} from './FTPManager';
import * as path from 'path';
import * as fs from 'fs';
import * as osLocale from 'os-locale';
import moment = require('moment');

export class BackupManager {

    private queue: FTPQueue = new FTPQueue();
    private ftpManager: FTPManager;

    constructor() {
        osLocale().then((locale) => {
            console.log(`locale is ${locale}`);
            moment.locale(locale);
        }).catch((error) => {
            console.error(error);
        });

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
            console.log(error);
        });
    }

    public test() {
        let errors = '';
        let stats = '';
        if (fs.existsSync(path.join(AppSettings.appPath, 'errors.log'))) {
            fs.unlinkSync(path.join(AppSettings.appPath, 'errors.log'));
        }
        if (fs.existsSync(path.join(AppSettings.appPath, 'statistics.txt'))) {
            fs.unlinkSync(path.join(AppSettings.appPath, 'statistics.txt'));
        }
        const subscr = this.ftpManager.error.subscribe((message: string) => {
                const line = `${moment().format('l LTS')}:\t${message}\n`;
                errors += line;
                fs.appendFile(path.join(AppSettings.appPath, 'errors.log'), line, {
                    encoding: 'Utf8'
                }, () => {
                });
            },
            (error) => {
            },
            () => {
            });
        this.ftpManager.statistics.started = Date.now();
        this.ftpManager.downloadFolder(AppSettings.settings.backup.root, path.join(AppSettings.appPath, 'nwc')).then(() => {
            this.ftpManager.statistics.ended = Date.now();
            this.ftpManager.statistics.duration = (this.ftpManager.statistics.ended - this.ftpManager.statistics.started) / 1000 / 60;

            const statistics = `Started: ${moment(this.ftpManager.statistics.started).format('l LTS')}
Ended: ${moment(this.ftpManager.statistics.ended).format('l LTS')}
Duration: ${this.ftpManager.statistics.duration} Minutes

Folders: ${this.ftpManager.statistics.folders}
Files: ${this.ftpManager.statistics.files}`;

            console.log('\n' + statistics);
            fs.writeFileSync(path.join(AppSettings.appPath, 'statistics.txt'), statistics, {
                encoding: 'utf-8'
            });

            console.log(`download ok to ${AppSettings.appPath}`);
            if (errors !== '') {
                console.log(`There are errors. Please read the errors.log file for further information.`);
            }
            subscr.unsubscribe();
            this.ftpManager.close();
        }).catch((error) => {
            console.log(error);
            console.log(`!END!`);
            this.ftpManager.close();
        });
    }
}
