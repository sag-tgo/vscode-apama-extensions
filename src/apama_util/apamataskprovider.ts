import { TaskProvider, CancellationToken, ProviderResult, Task, ProcessExecution, TaskDefinition, ShellExecution, ShellExecutionOptions, OutputChannel, TaskScope } from 'vscode';
import { ApamaEnvironment } from './apamaenvironment';

export class ApamaTaskProvider implements TaskProvider {

  constructor(private logger: OutputChannel, private apamaEnv: ApamaEnvironment) {

  }



  provideTasks(): ProviderResult<Task[]> {
    return [
        this.runCorrelator(),
    ];
  }

  private runCorrelator(): Task {
    let correlator = new Task(
      {type: "shell", task: ""},
      "Run Correlator",
      "correlator",
      new ShellExecution(this.apamaEnv.getCorrelatorCmdline()),
      []
    );
    correlator.group = 'test';
    return correlator;
  }

  resolveTask(task: Task, token?: CancellationToken | undefined): ProviderResult<Task> {
    throw new Error("Method not implemented.");
  }


}