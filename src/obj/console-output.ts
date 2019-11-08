import * as readline from 'readline';
import * as process from 'process';

export class ConsoleOutput {
    private static lastWasLive = false;
    public static showColors = true;

    public static log(message: string) {
        if (this.lastWasLive) {
            console.log('');
            this.lastWasLive = false;
        }
        console.log(`${message}`);
    }

    public static error(message: string) {
        if (this.lastWasLive) {
            console.log('');
            this.lastWasLive = false;
        }
        const formattedStr = (ConsoleOutput.showColors) ? ConsoleOutput.format(message, 'error') : message;
        console.error(formattedStr);
    }

    public static info(message: string) {
        if (this.lastWasLive) {
            console.log('');
            this.lastWasLive = false;
        }

        const formattedStr = (ConsoleOutput.showColors) ? ConsoleOutput.format(message, 'info') : message;
        console.error(formattedStr);
    }

    public static success(message: string) {
        if (this.lastWasLive) {
            console.log('');
            this.lastWasLive = false;
        }

        const formattedStr = (ConsoleOutput.showColors) ? ConsoleOutput.format(message, 'success') : message;
        console.error(formattedStr);
    }

    public static warning(message: string) {
        if (this.lastWasLive) {
            console.log('');
            this.lastWasLive = false;
        }

        const formattedStr = (ConsoleOutput.showColors) ? ConsoleOutput.format(message, 'warning') : message;
        console.error(formattedStr);
    }

    public static logLive = (message: string) => {
        // @ts-ignore
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0, null);
        process.stdout.write(message);
        ConsoleOutput.lastWasLive = true;
    };

    public static format(message: string, type: 'error' | 'info' | 'success' | 'warning') {
        switch (type) {
            case 'info':
                return `\x1b[34m${message}\x1b[0m`;
            case 'warning':
                return `\x1b[33m${message}\x1b[0m`;
            case 'error':
                return `\x1b[31m${message}\x1b[0m`;
            case 'success':
                return `\x1b[32m${message}\x1b[0m`;
        }
    }


    public static getTimeString(timespan: number) {
        if (timespan < 0) {
            timespan = 0;
        }

        let result = '';
        const minutes: string = this.formatNumber(this.getMinutes(timespan), 2);
        const seconds: string = this.formatNumber(this.getSeconds(timespan), 2);
        const hours: string = this.formatNumber(this.getHours(timespan), 2);

        result += hours + ':' + minutes + ':' + seconds;

        return result;
    }

    private static formatNumber = (num, length): string => {
        let result = '' + num.toFixed(0);
        while (result.length < length) {
            result = '0' + result;
        }
        return result;
    };

    private static getSeconds(timespan: number): number {
        return Math.floor(timespan / 1000) % 60;
    }

    private static getMinutes(timespan: number): number {
        return Math.floor(timespan / 1000 / 60) % 60;
    }

    private static getHours(timespan: number): number {
        return Math.floor(timespan / 1000 / 60 / 60);
    }
}
