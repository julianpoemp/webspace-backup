import {Subject} from 'rxjs';

export class FTPQueue {
    private _tasks: FTPTask[] = [];
    private status = 'pending';

    constructor() {
    }

    public add(task: FTPTask) {
        console.log(`task ${task.id} added.`);
        this._tasks.push(task);
        this.startNext();
    }

    private startNext() {
        if (this._tasks.length > 0 && this.status !== 'running') {
            this.status = 'running';
            console.log(`start task!`);
            this._tasks[0].start().then(() => {
                console.log(`ok finished ${this._tasks[0].id}`);
                this._tasks.splice(0, 1);
                this.status = 'pending';
                this.startNext();
            }).catch((error) => {
                console.log(error);
                this._tasks.splice(0, 1);
                this.status = 'pending';
                this.startNext();
            });
        }
    }
}

export class FTPTask {
    get id(): number {
        return this._id;
    }
    private func: (args: any[]) => Promise<any>;
    private args: any[];
    private _id: number;

    public resultRetrieved = new Subject<any>();

    private static counter = 1;

    constructor(func: (args: any[]) => Promise<any>, args: any[]) {
        this.func = func;
        this.args = args;
        this._id = FTPTask.counter++;
    }

    public start() {
        return new Promise<any>((resolve, reject) => {
            console.log(`run ${this.id}...`);
            this.func(this.args).then((result) => {
                console.log(`task ${this.id} finished`);
                this.resultRetrieved.next(result);
                this.resultRetrieved.complete();
                resolve(result);
            }).catch((error) => {
                reject(error);
            });
        });
    }
}
