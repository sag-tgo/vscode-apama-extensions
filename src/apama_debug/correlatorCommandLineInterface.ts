import { spawn, ChildProcess, execFileSync, execSync } from 'child_process';
import { OutputChannel, window } from 'vscode';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';

export interface CorrelatorConfig {
    host: string;
    port: number;
    args: string[];
}

export class CorrelatorCommandLineInterface {
    correlatorProcess?: ChildProcess;
    stdoutChannel?: OutputChannel;
    correlatorPid: number;

    constructor(private logger: OutputChannel, private apamaEnv: ApamaEnvironment, private config: CorrelatorConfig) { 
        this.correlatorPid = -1;
    }

	/**
	 * Start the correlator
	 */
    public start(): ChildProcess {
        if (this.correlatorProcess && !this.correlatorProcess.killed) {
            this.logger.appendLine("Correlator already started, stopping...");
            if( this.correlatorPid !== -1 ) {
                process.kill(this.correlatorPid,"SIGKILL");
            } 
            this.correlatorProcess.kill('SIGKILL');
        }

        this.logger.appendLine("Starting Correlator");
        this.stdoutChannel = window.createOutputChannel('Apama Correlator');
        this.stdoutChannel.show();

        let args = ["-p", this.config.port.toString()].concat(this.config.args);
        this.correlatorProcess = spawn(this.apamaEnv.getCorrelatorCmdline() + args.join(' '), {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        //Running with process Id
        this.logger.appendLine("Shell started, PID:" + this.correlatorProcess.pid);

        this.correlatorProcess.once('exit', (exitCode) => this.logger.appendLine("Correlator stopped, exit code: " + exitCode));
        this.correlatorProcess.stdout.setEncoding('utf8');
        this.correlatorProcess.stdout.on('data', (data: string) => {

            //set the pid of the correlator process so we can stop it.
            //Running with process Id
            if( data.includes("Running with process Id") ) {
                let result = data.match("Running with process Id (\d+)") || ['-1','-1'];
                this.correlatorPid = +result[1];
                if( this.correlatorPid === -1 ) {
                    throw "bad pid";
                }
            }

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
        //execFileSync(this.apamaEnv.startInject() + ' -p ' + port + ' ' + files.join(' '));
        execSync(this.apamaEnv.getInjectCmdline()+ ' ' + files.join(' '));
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
                process.kill(this.correlatorPid);
                this.correlatorProcess.kill('SIGINT');
                const attemptedToKill = this.correlatorProcess;
                setTimeout(() => {
                    if (!attemptedToKill.killed) {
                        this.logger.appendLine("Failed to stop correlator in 5 seconds, killing...");
                        attemptedToKill.kill('SIGKILL');
                    }
                }, 30000);
            } else {
                resolve();
            }
        });
    }
}