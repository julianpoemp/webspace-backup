import * as path from 'path';
import * as fs from 'fs';
import * as osLocale from 'os-locale';
import {FtpManager} from './ftp-manager';
import {AppSettings} from '../app-settings';
import {ConsoleOutput} from './ConsoleOutput';
import moment = require('moment');

export class BackupManager {

    private ftpManager: FtpManager;

    constructor() {
        osLocale().then((locale) => {
            ConsoleOutput.info(`locale is ${locale}`);
            moment.locale(locale);
        }).catch((error) => {
            ConsoleOutput.error(error);
        });

        this.ftpManager = new FtpManager(AppSettings.settings.backup.root, AppSettings.settings);

        this.ftpManager.afterManagerIsReady().then(() => {
            this.doBackup();
        }).catch((error) => {
            ConsoleOutput.error(error);
        });
    }

    public doBackup() {
        let errors = '';
        if (fs.existsSync(path.join(AppSettings.appPath, 'errors.log'))) {
            fs.unlinkSync(path.join(AppSettings.appPath, 'errors.log'));
        }
        if (fs.existsSync(path.join(AppSettings.appPath, 'statistics.txt'))) {
            fs.unlinkSync(path.join(AppSettings.appPath, 'statistics.txt'));
        }
        const subscr = this.ftpManager.error.subscribe((message: string) => {
            ConsoleOutput.error(`${moment().format('L LTS')}: ${message}`);
            const line = `${moment().format('L LTS')}:\t${message}\n`;
            errors += line;
            fs.appendFile(path.join(AppSettings.appPath, 'errors.log'), line, {
                encoding: 'utf8'
            }, () => {
            });
        });

        let name = AppSettings.settings.backup.root.substring(0, AppSettings.settings.backup.root.lastIndexOf('/'));
        name = name.substring(name.lastIndexOf('/') + 1);
        const downloadPath = (AppSettings.settings.backup.downloadPath === '') ? AppSettings.appPath : AppSettings.settings.backup.downloadPath;

        ConsoleOutput.info(`Remote path: ${AppSettings.settings.backup.root}\nDownload path: ${downloadPath}\n`);

        this.ftpManager.statistics.started = Date.now();
        this.ftpManager.downloadFolder(AppSettings.settings.backup.root, downloadPath).then(() => {
            this.ftpManager.statistics.ended = Date.now();
            this.ftpManager.statistics.duration = (this.ftpManager.statistics.ended - this.ftpManager.statistics.started) / 1000 / 60;

            ConsoleOutput.success('Backup finished!');
            const statistics = `\n-- Statistics: --
Started: ${moment(this.ftpManager.statistics.started).format('L LTS')}
Ended: ${moment(this.ftpManager.statistics.ended).format('L LTS')}
Duration: ${this.ftpManager.getTimeString(this.ftpManager.statistics.duration * 60 * 1000)} (H:m:s)

Folders: ${this.ftpManager.statistics.folders}
Files: ${this.ftpManager.statistics.files}
Errors: ${errors.split('\n').length - 1}`;

            ConsoleOutput.log('\n' + statistics);
            fs.writeFileSync(path.join(AppSettings.appPath, 'statistics.txt'), statistics, {
                encoding: 'utf-8'
            });
            if (errors !== '') {
                ConsoleOutput.error(`There are errors. Please read the errors.log file for further information.`);
            }
            subscr.unsubscribe();
            this.ftpManager.close();
        }).catch((error) => {
            ConsoleOutput.error(error);
            this.ftpManager.close();
        });
    }
}
