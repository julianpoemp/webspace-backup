import * as readline from 'readline';
import * as process from 'process';

export class ConsoleOutput {
    private static lastWasLive = false;

    public static log(message: string) {
        if(this.lastWasLive){
            console.log("");
            this.lastWasLive = false;
        }
        console.log(`${message}`);
    }

    public static error(message: string) {
        if(this.lastWasLive){
            console.log("");
            this.lastWasLive = false;
        }
        console.log(`\x1b[31m${message}\x1b[0m`);
    }

    public static info(message: string) {
        if(this.lastWasLive){
            console.log("");
            this.lastWasLive = false;
        }
        console.log(`\x1b[34m${message}\x1b[0m`);
    }

    public static success(message: string) {
        if(this.lastWasLive){
            console.log("");
            this.lastWasLive = false;
        }
        console.log(`\x1b[32m${message}\x1b[0m`);
    }

    public static warning(message: string) {
        if(this.lastWasLive){
            console.log("");
            this.lastWasLive = false;
        }
        console.log(`\x1b[33m${message}\x1b[0m`);
    }

    public static logLive = (message: string) => {
        // @ts-ignore
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0, null);
        process.stdout.write(message);
        ConsoleOutput.lastWasLive = true;
    }
}
