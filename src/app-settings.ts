import * as path from 'path';
import * as fs from 'fs';
import {ConsoleOutput} from './obj/console-output';

export class AppSettings {
    static get appPath(): string {
        return this._appPath;
    }

    public static get settings(): Configuration {
        return this._settings;
    }

    private static _settings: Configuration;
    private static _appPath: string;

    public static readonly version = '0.1.0';

    public static init(environment: 'development' | 'production') {
        if (environment === 'development') {
            this._appPath = path.join(process.cwd(), 'dist');
        } else {
            this._appPath = path.dirname(process.execPath);
        }

        let settings = fs.readFileSync(path.join(this._appPath, 'config.json'),
            {
                encoding: 'utf-8'
            }
        );

        this._settings = JSON.parse(settings) as Configuration;
        ConsoleOutput.showColors = this._settings.console.showColors;
    }
}

export interface Configuration {
    'version': string,
    'server': {
        'protocol': 'ftp' | 'ftps',
        'host': string,
        'port': number,
        'user': string,
        'password': string,
        'timeout': number,
        'verbose': boolean
    },
    'backup': {
        'root': string,
        'downloadPath': string,
        'zip': {
            'enabled': boolean,
            'password': string
        }
    },
    'console': {
        'tty': boolean,
        'showColors': boolean
    }
}
