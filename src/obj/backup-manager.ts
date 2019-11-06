import * as path from 'path';
import * as Path from 'path';
import * as fs from 'fs';
import * as osLocale from 'os-locale';
import {FtpManager} from './ftp-manager';
import {AppSettings} from '../app-settings';
import * as Zipper from 'node-7z'
import * as rimraf from 'rimraf';
import {ConsoleOutput} from './console-output';
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

    /**
     * starts the backup procedure
     */
    public async doBackup() {
        let errors = '';
        let name = AppSettings.settings.backup.root.substring(0, AppSettings.settings.backup.root.lastIndexOf('/'));
        name = name.substring(name.lastIndexOf('/') + 1);
        const downloadPath = (AppSettings.settings.backup.downloadPath === '') ? AppSettings.appPath : AppSettings.settings.backup.downloadPath;
        const timeString = moment().format('YYYY-MM-DD_H-mm') + '_';
        const targetPath = path.join(downloadPath, timeString + name);
        const errorFile = `${timeString}${name}_errors.log`;
        const statisticsFile = `${timeString}${name}_statistics.txt`;

        if (fs.existsSync(path.join(downloadPath, errorFile))) {
            fs.unlinkSync(path.join(downloadPath, errorFile));
        }
        if (fs.existsSync(path.join(downloadPath, statisticsFile))) {
            fs.unlinkSync(path.join(downloadPath, statisticsFile));
        }

        const subscr = this.ftpManager.error.subscribe((message: string) => {
            ConsoleOutput.error(`${moment().format('L LTS')}: ${message}`);
            const line = `${moment().format('L LTS')}:\t${message}\n`;
            errors += line;
            fs.appendFile(path.join(downloadPath, `${timeString}${name}_errors.log`), line, {
                encoding: 'utf8'
            }, () => {
            });
        });

        ConsoleOutput.info(`Remote path: ${AppSettings.settings.backup.root}\nDownload path: ${downloadPath}\n`);

        this.ftpManager.statistics.started = Date.now();
        this.ftpManager.downloadFolder(AppSettings.settings.backup.root, targetPath).then(() => {
            this.ftpManager.statistics.ended = Date.now();
            this.ftpManager.statistics.duration = (this.ftpManager.statistics.ended - this.ftpManager.statistics.started) / 1000 / 60;

            ConsoleOutput.success('Backup finished!');
            const statistics = `\n-- Statistics: --
Started: ${moment(this.ftpManager.statistics.started).format('L LTS')}
Ended: ${moment(this.ftpManager.statistics.ended).format('L LTS')}
Duration: ${ConsoleOutput.getTimeString(this.ftpManager.statistics.duration * 60 * 1000)} (H:m:s)

Folders: ${this.ftpManager.statistics.folders}
Files: ${this.ftpManager.statistics.files}
Errors: ${errors.split('\n').length - 1}`;

            ConsoleOutput.log('\n' + statistics);
            fs.writeFileSync(path.join(downloadPath, `${timeString}${name}_statistics.txt`), statistics, {
                encoding: 'utf-8'
            });

            if (errors !== '') {
                ConsoleOutput.error(`There are errors. Please read the errors.log file for further information.`);
            }
            subscr.unsubscribe();
            this.ftpManager.close();

            // check zipping
            if (AppSettings.settings.backup.zip.enabled) {
                console.log(`\nZip folder...`);
                this.createZipFile(downloadPath, timeString + name, this.ftpManager.statistics.files,
                    AppSettings.settings.backup.zip.password).then((result) => {
                    ConsoleOutput.success('Zip file created!');
                    rimraf(targetPath, () => {
                        console.log('done');
                    });
                }).catch((error) => {
                    ConsoleOutput.error(error);
                });
            }
        }).catch((error) => {
            ConsoleOutput.error(error);
            this.ftpManager.close();
        });
    }

    /**
     * creates a zip archive
     * @param path
     * @param name
     * @param numOfFiles
     * @param password
     */
    async createZipFile(path: string, name: string, numOfFiles: number, password: string) {
        return new Promise<boolean>((resolve, reject) => {
            const localPath = Path.join(path, name, '*');
            let numOfZipped = 0;
            let lastFile = '';
            Zipper.add(Path.join(path, name) + `.zip`, localPath, {
                recursive: true,
                password
            }).on('end', () => {
                resolve(true);
            }).on('error', (e) => {
                reject(e);
            }).on('data', (data) => {
                if (lastFile !== data.file) {
                    numOfZipped++;
                }
                lastFile = data.file;
                const percent = Math.min(100, ((numOfZipped / numOfFiles) * 100)).toFixed(2);
                if (AppSettings.settings.console.tty) {
                    ConsoleOutput.logLive(`Zipping...${percent}%`)
                } else {
                    ConsoleOutput.log(`Zipping...${percent}%`);
                }
            });
        });
    }
}
