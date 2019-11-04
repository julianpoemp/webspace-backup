import {AppSettings} from '../app-settings';
import {BackupManager} from '../obj/backup-manager';
import {ConsoleOutput} from '../obj/ConsoleOutput';

AppSettings.init('production');
console.log(`webspace-backup v${AppSettings.version} started!`);

try {
    new BackupManager();
} catch (e) {
    ConsoleOutput.error(e);
}
