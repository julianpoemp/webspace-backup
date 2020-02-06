import SSH2 from 'ssh2';

export class SSH {
    connection?: SSH2;
    
    constructor() {
        this.connection = null
    }
    
    public connect(givenConfig: ConfigGiven): Promise<this>{
        return null;
    }
    
    async requestShell(): Promise<any>{
        return null;
    }
    
    async requestSFTP(): Promise<any>{
        return null;
    }
    
    async mkdir(path: string, type: 'exec' | 'sftp' = 'sftp', givenSftp: any = null): Promise<void>{}
    
    async exec(
        command: string,
        parameters: Array<string> = [],
        options: {
            cwd?: string,
            stdin?: string,
            stream?: string,
            options?: any,
            onStdout?: (chunk: Buffer) => void,
            onStderr?: (chunk: Buffer) => void,
        } = {},
    ): Promise<string | any>{
        return null;
    }
    
    async execCommand(
        givenCommand: string,
        options: {
            cwd?: string,
            stdin?: string,
            options?: any,
            onStdout?: (chunk: Buffer) => void,
            onStderr?: (chunk: Buffer) => void,
        } = {}
    ): Promise<{ stdout: string, stderr: string, code: number, signal?: string }>{
        return null;
    }
    
    async getFile(localFile: string, remoteFile: string, givenSftp?: any, givenOpts: any = {}): Promise<void>{}
    
    async putFile(localFile: string, remoteFile: string, givenSftp?: any, givenOpts: any = {}): Promise<void>{}
    
    async putFiles(files: Array<{ local: string, remote: string }>, givenConfig: any = {}): Promise<void>{};

    async putDirectory(localDirectory: string, remoteDirectory: string, givenConfig: any = {}): Promise<boolean> {
        return null;
    }

    dispose() {
        if (this.connection) {
            this.connection.end()
        }
    }
}

export type ConfigGiven = {
    host: string,
    port?: number,
    username: string,
    password?: string,
    privateKey?: string,
    onKeyboardInteractive?: () => void | boolean,
}