import * as path from 'path';
import * as fs from 'fs';

export class AppSettings {
    static get appPath(): string {
        return this._appPath;
    }

    public static get settings(): Configuration {
        return this._settings;
    }

    private static _settings: Configuration;
    private static _appPath: string;

    public static readonly version = '0.0.2';

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
        'downloadPath': string
    }
}
