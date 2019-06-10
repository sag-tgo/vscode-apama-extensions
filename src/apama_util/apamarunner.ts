import { OutputChannel, window } from 'vscode';
import { promisify } from 'util';
import { ChildProcess, spawn } from 'child_process';
import { rejects } from 'assert';

const exec = promisify(require('child_process').exec);

export class ApamaRunner {

  stdout: string = '';
  stderr: string = '';

  constructor(public name: string, public command: string, private logger: OutputChannel) {
    logger.appendLine("Created " + this.name);
  }

  async run(workingDir: string, args: string[]): Promise<any> {
    //if fails returns promise.reject including err 
    this.logger.appendLine("Running in " + workingDir);
    return await exec(this.command + ' ' + args.join(' '), { cwd: workingDir });
  }
}


export class ApamaAsyncRunner {

  stdout: string = '';
  stderr: string = '';
  child?: ChildProcess;
  correlatorPid: number;

  constructor(public name: string, public command: string, private logger: OutputChannel) {
    this.logger = window.createOutputChannel(this.name);
    this.logger.show();
    logger.appendLine("Created " + this.name);
    this.correlatorPid = -1;
  }

  public start(args: string[]): ChildProcess {

    if (this.child && !this.child.killed) {
      this.logger.appendLine(this.name + " already started, stopping...");
      if( this.correlatorPid !== -1) {
        process.kill(this.correlatorPid , 'SIGKILL');
      }
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

      if (data.includes("Running with process Id")) {
        let result = data.match("Running with process Id (\d+)") || ['-1', '-1'];
        this.correlatorPid = +result[1];
        if (this.correlatorPid === -1) {
          throw "bad pid";
        }
      }

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
        if( this.correlatorPid !== -1) {
          process.kill(this.correlatorPid , 'SIGKILL');
        }
        this.child.kill('SIGINT');
        const attemptedToKill = this.child;
        setTimeout(() => {
          if (!attemptedToKill.killed) {
            this.logger.appendLine("Failed to stop correlator in 30 seconds, killing...");
            attemptedToKill.kill('SIGKILL');
          }
        }, 30000);
      } else {
        resolve();
      }
    });
  }
}
