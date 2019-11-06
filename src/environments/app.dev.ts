import {AppSettings} from '../app-settings';
import {BackupManager} from '../obj/backup-manager';
import {ConsoleOutput} from '../obj/console-output';

AppSettings.init('development');
console.log(`webspace-backup v${AppSettings.version} started!`);

console.log(`\x1b[33m
-----------------------
! Development Build ! |
-----------------------
\x1b[0m`);

try {
    new BackupManager();
} catch (e) {
    ConsoleOutput.error(e);
}
