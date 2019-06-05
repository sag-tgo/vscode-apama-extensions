import { spawn, ChildProcess, execFileSync } from 'child_process';
import { OutputChannel, window } from 'vscode';
import { ApamaEnvironment } from '../util/apamaenvironment';

export interface CorrelatorConfig {
    host: string;
    port: number;
    args: string[];
}

export class CorrelatorCommandLineInterface {
    correlatorProcess?: ChildProcess;
    stdoutChannel?: OutputChannel;

    constructor(private logger: OutputChannel, private apamaEnv: ApamaEnvironment, private config: CorrelatorConfig) { }

	/**
	 * Start the correlator
	 */
    public start(): ChildProcess {
        if (this.correlatorProcess && !this.correlatorProcess.killed) {
            this.logger.appendLine("Correlator already started, stopping...");
            this.correlatorProcess.kill('SIGKILL');
        }

        this.logger.appendLine("Starting Correlator");

        this.stdoutChannel = window.createOutputChannel('Apama Correlator');
        this.stdoutChannel.show();

        let args = ["-p", this.config.port.toString()].concat(this.config.args);
        this.correlatorProcess = spawn(this.apamaEnv.startCorrelator() + args.join(' '), {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.logger.appendLine("Correlator started, PID:" + this.correlatorProcess.pid);

        this.correlatorProcess.once('exit', (exitCode) => this.logger.appendLine("Correlator stopped, exit code: " + exitCode));
        this.correlatorProcess.stdout.setEncoding('utf8');
        this.correlatorProcess.stdout.on('data', (data: string) => {
            if (this.stdoutChannel) {
                this.stdoutChannel.append(data);
            }
        });

        return this.correlatorProcess;
    }

    /**
     * Inject files into the correlator
     */
    public injectFiles(files: string[]) {
        execFileSync(this.apamaEnv.startInject() + files.join(' '));
    }


    /**
	 * Stop the correlator
	 */
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.correlatorProcess && !this.correlatorProcess.killed) {
                this.correlatorProcess.once('exit', () => {
                    if (this.stdoutChannel) {
                        this.stdoutChannel.dispose();
                    }
                    resolve();
                });

                this.logger.appendLine("Correlator stopping...");
                this.correlatorProcess.kill();
                const attemptedToKill = this.correlatorProcess;
                setTimeout(() => {
                    if (!attemptedToKill.killed) {
                        this.logger.appendLine("Failed to stop correlator in 5 seconds, killing...");
                        attemptedToKill.kill('SIGKILL');
                    }
                }, 5000);
            } else {
                resolve();
            }
        });
    }
}