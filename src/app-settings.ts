import * as path from 'path';
import * as fs from 'fs';
import * as prompt from 'prompt';
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

    public static checkUserSettings(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const properties = [
                {
                    name: 'username'
                },
                {
                    name: 'password',
                    hidden: true
                }
            ];

            if (this._settings.server.user !== "" && this._settings.server.password !== "") {
                resolve();
            } else {
                prompt.start();

                prompt.get(properties, (err, result) => {
                    if (err) {
                        reject(err);
                        return 1;
                    }

                    this._settings.server.user = result.username;
                    this._settings.server.password = result.password;
                    resolve();
                });
            }
        });
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
        'verbose': boolean,
        'privateKey': string
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
