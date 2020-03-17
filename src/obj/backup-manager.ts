import * as path from 'path';
import * as Path from 'path';
import * as fs from 'fs';
import * as osLocale from 'os-locale';
import {FtpManager} from './managers/ftp-manager';
import {AppSettings} from '../app-settings';
import * as archiver from 'archiver';
import * as zipext from 'archiver-zip-encryptable';
import * as rimraf from 'rimraf';
import {ConsoleOutput} from './console-output';
import moment = require('moment');

export class BackupManager {

    private ftpManager: FtpManager;

    constructor() {
        console.log(`register zipext...`);
        archiver.registerFormat('zip-encryptable', zipext);

        osLocale().then((locale) => {
            ConsoleOutput.info(`locale is ${locale}`);
            moment.locale(locale);

            AppSettings.checkUserSettings().then(() => {
                this.ftpManager = new FtpManager(AppSettings.settings.backup.root, AppSettings.settings);
                this.ftpManager.start().then(() => {
                    this.start();
                }).catch(() => {
                    this.ftpManager.close();
                });
            }).catch((error) => {
                ConsoleOutput.error(error);
            });
        }).catch((error) => {
            ConsoleOutput.error(error);
        });
    }

    public start() {
        this.ftpManager.afterManagerIsReady().then(() => {
            this.doBackup()
        }).catch((error) => {
            ConsoleOutput.error(error);
        });
    }

    /**
     * starts the backup procedure
     */
    public doBackup() {
        let name = AppSettings.settings.backup.root.substring(0, AppSettings.settings.backup.root.lastIndexOf('/'));
        name = name.substring(name.lastIndexOf('/') + 1);
        const downloadPath = (AppSettings.settings.backup.downloadPath === '') ? AppSettings.appPath : AppSettings.settings.backup.downloadPath;
        const timeString = moment().format('YYYY-MM-DD_H-mm') + '_';
        const targetPath = path.join(downloadPath, timeString + name);
        const statisticsFile = `${timeString}${name}_statistics.txt`;
        const logsFile = `${timeString}${name}.log`;
        const errorFile = `${timeString}${name}_errors.log`;
        if (fs.existsSync(path.join(downloadPath, errorFile))) {
            fs.unlinkSync(path.join(downloadPath, errorFile));
        }

        if (fs.existsSync(path.join(downloadPath, statisticsFile))) {
            fs.unlinkSync(path.join(downloadPath, statisticsFile));
        }
        if (fs.existsSync(path.join(downloadPath, logsFile))) {
            fs.unlinkSync(path.join(downloadPath, logsFile));
        }

        ConsoleOutput.info(`Remote path: ${AppSettings.settings.backup.root}\nDownload path: ${downloadPath}\n`);

        this.ftpManager.statistics.started = Date.now();
        this.ftpManager.downloadFolder(AppSettings.settings.backup.root, targetPath).then(() => {
            this.ftpManager.statistics.ended = Date.now();
            this.ftpManager.statistics.duration = (this.ftpManager.statistics.ended - this.ftpManager.statistics.started) / 1000 / 60;

            this.ftpManager.logger.log('Backup finsihed', 'success');
            const statistics = `\n-- Statistics: --
Started: ${moment(this.ftpManager.statistics.started).format('L LTS')}
Ended: ${moment(this.ftpManager.statistics.ended).format('L LTS')}
Duration: ${ConsoleOutput.getTimeString(this.ftpManager.statistics.duration * 60 * 1000)} (H:m:s)

Folders: ${this.ftpManager.statistics.folders}
Files: ${this.ftpManager.statistics.files}
Errors: ${this.ftpManager.logger.errorLogs.length}`;

            ConsoleOutput.log('\n' + statistics);
            fs.writeFileSync(path.join(downloadPath, `${timeString}${name}_statistics.txt`), statistics, {
                encoding: 'utf-8'
            });

            if (this.ftpManager.logger.errorLogs.length > 0) {
                const warning = `There are errors. Please read the errors.log file for further information.`;
                ConsoleOutput.error(warning);
                this.ftpManager.logger.add(warning, 'warning');
            }
            this.ftpManager.close();

            // check zipping
            if (AppSettings.settings.backup.zip.enabled) {
                this.ftpManager.logger.log('\nZip folder...', 'info');
                this.createZipFile(downloadPath, timeString + name, this.ftpManager.statistics.files,
                    AppSettings.settings.backup.zip.password).then(() => {
                    this.ftpManager.logger.log('Zip file created!', 'success');
                    this.writeErrorLogs(downloadPath, name, timeString);
                    this.writeLogs(downloadPath, name, timeString);
                    rimraf(targetPath, () => {
                    });
                }).catch((error) => {
                    ConsoleOutput.error(error);
                    this.ftpManager.logger.add('Zipping failed!', 'error');
                    this.writeErrorLogs(downloadPath, name, timeString);
                    this.writeLogs(downloadPath, name, timeString);
                });
            } else {
                this.writeErrorLogs(downloadPath, name, timeString);
                this.writeLogs(downloadPath, name, timeString);
            }
        }).catch((error) => {
            ConsoleOutput.error(error);
            this.ftpManager.close();
        });
    }

    private writeErrorLogs(downloadPath: string, name: string, timeString: string) {
        const errorFile = `${timeString}${name}_errors.log`;
        const errors = this.ftpManager.logger.errorLogs;

        let fileContent = '';
        for (const loggerEntry of errors) {
            fileContent += `${loggerEntry.toString()}\n`;
        }
        fs.writeFileSync(path.join(downloadPath, errorFile), fileContent, {
            encoding: 'utf8'
        });
    }

    private writeLogs(downloadPath: string, name: string, timeString: string) {
        const logFile = `${timeString}${name}.log`;

        let fileContent = '';
        for (const loggerEntry of this.ftpManager.logger.queue) {
            fileContent += `${loggerEntry.toString()}\n`;
        }
        fs.writeFileSync(path.join(downloadPath, logFile), fileContent, {
            encoding: 'utf8'
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
            const localPath = Path.join(path, name);
            let numOfZipped = 0;
            let lastFile = '';

            const output = fs.createWriteStream(localPath + ".zip");
            const archive = archiver('zip-encryptable', {
                zlib: {level: 9}, // Sets the compression level.
                forceLocalTime: true,
                password
            });

            output.on('finish', function () {
                resolve(true);
            });

            // good practice to catch warnings (ie stat failures and other non-blocking errors)
            archive.on('warning', function (err) {
                if (err.code === 'ENOENT') {
                    // log warning
                    console.log(err);
                } else {
                    // throw error
                    reject(err);
                }
            });

            console.log(`set pw ${password}`);
            // good practice to catch this error explicitly
            archive.on('error', function (err) {
                reject(err);
            });

            // pipe archive data to the file
            archive.pipe(output);

            console.log(`zip folder ${localPath}`);
            archive.directory(localPath, '');
            archive.finalize();
        });
    }
}
