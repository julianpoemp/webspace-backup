export class ConsoleOutput {
    public static log(message: string) {
        console.log(`${message}`);
    }

    public static error(message: string) {
        console.log(`\x1b[31m${message}\x1b[0m`);
    }

    public static info(message: string) {
        console.log(`\x1b[34m${message}\x1b[0m`);
    }

    public static success(message: string) {
        console.log(`\x1b[32m${message}\x1b[0m`);
    }

    public static warning(message: string) {
        console.log(`\x1b[33m${message}\x1b[0m`);
    }
}
