import {AppSettings} from '../app-settings';
import {BackupManager} from '../obj/backup-manager';

AppSettings.init('production');
console.log(`webspace-backup v${AppSettings.version} started!`);

new BackupManager();
