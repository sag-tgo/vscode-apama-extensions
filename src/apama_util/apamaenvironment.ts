import { workspace, WorkspaceConfiguration, OutputChannel } from 'vscode';
import { platform } from 'os';
import { join } from 'path';



const confignode: string = 'eplLanguageServer';
const default_linux_correlator: string = 'correlator';
const default_windows_correlator: string = 'correlator.exe';
const default_linux_deploy: string = 'engine_deploy';
const default_windows_deploy: string = 'engine_deploy.exe';
const default_linux_inject: string = 'engine_inject';
const default_windows_inject: string = 'engine_inject.exe';
const default_linux_project: string = 'apama_project';
const default_windows_project: string = 'apama_project.exe';
const default_linux_env: string = 'apama_env';
const default_windows_env: string = 'apama_env.bat';
const default_linux_source: string = '. ';
const default_windows_source: string = '';


export class ApamaEnvironment {

  private workspaceConfig: WorkspaceConfiguration;
  private isLinux: boolean;

  //apama installation dir
  private apamaHome: string;

  //applications
  private cmd_source: string;
  private cmd_env: string;
  private cmd_correlator: string;
  private cmd_deploy: string;
  private cmd_inject: string;
  private cmd_project: string;

  constructor( private logger:OutputChannel ) {
    this.workspaceConfig = workspace.getConfiguration(confignode);

    this.isLinux = (platform() === 'linux');
    if (this.isLinux) {
      this.apamaHome = '/opt/softwareag/Apama';
    }
    else {
      this.apamaHome = join('C:', 'SoftwareAG', 'Apama');
    }

    //overridden in config? 
    if (this.workspaceConfig.has('apamaHome')) {
      //shouldn't be undefined here because has checks, but for linting need to cover
      this.apamaHome = this.workspaceConfig.get('apamaHome') || this.apamaHome;
    }
    else {
      //otherwise set default in config
      this.workspaceConfig.update('apamaHome', this.apamaHome, true);
    }

    
    //applications
    //make sure separators correct for paths 
    if (this.isLinux) {
      this.cmd_source = default_linux_source;
      this.cmd_env = join(this.apamaHome, 'bin', default_linux_env);
      this.cmd_correlator = join(this.apamaHome, 'bin', default_linux_correlator);
      this.cmd_deploy = join(this.apamaHome, 'bin', default_linux_deploy);
      this.cmd_inject = join(this.apamaHome, 'bin', default_linux_inject);
      this.cmd_project = join(this.apamaHome, 'bin', default_linux_project);
    }
    else {
      this.cmd_source = default_windows_source;
      this.cmd_env = join(this.apamaHome, 'bin', default_windows_env);
      this.cmd_correlator = join(this.apamaHome, 'bin', default_windows_correlator);
      this.cmd_deploy = join(this.apamaHome, 'bin', default_windows_deploy);
      this.cmd_inject = join(this.apamaHome, 'bin', default_windows_inject);
      this.cmd_project = join(this.apamaHome, 'bin', default_windows_project);
    }


  }

  sourceEnv(): string {
    return this.cmd_source + this.cmd_env + ' ';
  }

  getCorrelatorCmdline(): string {
    let r = this.sourceEnv() + ' && ' + this.cmd_correlator + ' '; 
    this.logger.appendLine('startCorrelator ' + r);
    return r;
  }

  //doesn't need environment
  getDeployCmdline(): string {
    let r = this.cmd_deploy + ' '; 
    this.logger.appendLine('startDeploy ' + r);
    return r;
  }

  getInjectCmdline(): string {
    let r = this.sourceEnv() + ' && ' + this.cmd_inject + ' '; 
    this.logger.appendLine('startInject ' + r);
    return r;
  }

  getApamaProjectCmdline(): string {
    let r = this.sourceEnv() + ' && ' + this.cmd_project + ' '; 
    this.logger.appendLine('startProject ' + r);
    return r;
  }

}
