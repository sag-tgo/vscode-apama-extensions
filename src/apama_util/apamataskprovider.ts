import {TaskProvider,CancellationToken,ProviderResult,Task, ProcessExecution, TaskDefinition, ShellExecution, ShellExecutionOptions, OutputChannel, TaskScope} from 'vscode';
import { ApamaEnvironment } from './apamaenvironment';

export class ApamaTaskProvider implements TaskProvider {

  constructor( private logger:OutputChannel , private apamaEnv:ApamaEnvironment ) {
    
  }

  provideTasks(token?: CancellationToken | undefined): ProviderResult<Task[]> {
    let result:Task[] = [];
    let tscope:TaskScope = TaskScope.Global;

    let tdef:TaskDefinition = {
      type:"AutoApama",
      isBackground: true
    };
    let seo:ShellExecutionOptions = {
      cwd:".",
      env: {name:"value"},
      executable: "shell executable",
      shellArgs: ["-c or -Command or /d /c"]
      //shellQuoting: {escape}
    };
    let shellExecution:ShellExecution = new ShellExecution(this.apamaEnv.getCorrelatorCmdline(), {/*cwd,env, */});
    let processExecution:ProcessExecution = new ProcessExecution(this.apamaEnv.getApamaProjectCmdline(),{ /*cwd,env*/});

    let localTask:Task = new Task( tdef, tscope, "Correlator", "Apama", shellExecution , "$ApamaProblems");
    result.push(localTask);
    return result;
  }  
  
  resolveTask(task: Task, token?: CancellationToken | undefined): ProviderResult<Task> {
    throw new Error("Method not implemented.");
  }

  
}