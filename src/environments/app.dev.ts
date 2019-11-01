import {AppSettings} from '../app-settings';
import {BackupManager} from '../obj/backup-manager';

AppSettings.init('development');
console.log(`webspace-backup v${AppSettings.version} started!`);

console.log(`\x1b[33m
-----------------------
! Development Build ! |
-----------------------
\x1b[0m`);

new BackupManager();
