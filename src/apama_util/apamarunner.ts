import { OutputChannel, window } from 'vscode';
import { promisify } from 'util';
import { ChildProcess, spawn } from 'child_process';
import { rejects } from 'assert';

const exec = promisify(require('child_process').exec);

export class ApamaRunner {

  stdout: string = '';
  stderr: string = '';

  constructor(public name: string, public command: string, private logger: OutputChannel) {
  }

  async run(workingDir: string, args: string[]): Promise<any> {
    //if fails returns promise.reject including err 
    return await exec(this.command + ' ' + args.join(' '), { cwd: workingDir });
  }
}


export class ApamaAsyncRunner {

  stdout: string = '';
  stderr: string = '';
  child?: ChildProcess;

  constructor(public name: string, public command: string, private logger: OutputChannel) {
    this.logger = window.createOutputChannel(this.name);
    this.logger.show();
  }

  public start(args: string[]): ChildProcess {

    if (this.child && !this.child.killed) {
      this.logger.appendLine(this.name + " already started, stopping...");
      this.child.kill('SIGKILL');
    }

    this.logger.appendLine("Starting " + this.name);
    this.child = spawn(this.command + args.join(' '), {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    //Running with process Id
    this.logger.appendLine("Shell started, PID:" + this.child.pid);

    this.child.once('exit', (exitCode) => this.logger.appendLine(this.name + " stopped, exit code: " + exitCode));
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (data: string) => {
      if (this.logger) {
        this.logger.append(data);
      }
    });

    return this.child;
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.child && !this.child.killed) {
        this.child.once('exit', () => {
          resolve();
        });

        this.logger.appendLine("Correlator stopping...");
        this.child.kill('SIGINT');
        const attemptedToKill = this.child;
        setTimeout(() => {
          if (!attemptedToKill.killed) {
            this.logger.appendLine("Failed to stop shell in 5 seconds, killing...");
            attemptedToKill.kill('SIGKILL');
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }
}
