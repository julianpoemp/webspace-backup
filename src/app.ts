import {AppSettings} from './AppSettings';
import {BackupManager} from './obj/backup-manager';

console.log('Easy backup v1.0.0 started');
console.log('Check configuration...');

AppSettings.init('development');

console.log('Details:');
console.log(JSON.stringify(AppSettings.settings.server));
console.log(`Test...`);

const backupManager = new BackupManager();
