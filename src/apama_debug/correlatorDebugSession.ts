import {
	DebugSession,
	InitializedEvent,
	OutputEvent,
	TerminatedEvent,
	Breakpoint,
	StoppedEvent,
	Thread,
	StackFrame,
	Source,
	Scope,
	Variable
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { CorrelatorHttpInterface, CorrelatorBreakpoint, CorrelatorPaused } from './correlatorHttpInterface';
import { basename } from 'path';
import * as vscode from 'vscode';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import { ApamaAsyncRunner, ApamaRunner } from '../apama_util/apamarunner';

const MAX_STACK_SIZE = 1000;

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** List of files to inject into the correlator */
	injectionList: string[];
}

/**
 * Handles debug requests from the frontend
 * Order of events received:
 * - Initialize
 * - Launch
 * (After Initialized sent back to client)
 * - SetBreakpoint (Zero or more)
 * - ConfigurationDone
 */

export interface CorrelatorConfig {
	host: string;
	port: number;
	args: string[];
}

export class CorrelatorDebugSession extends DebugSession {
	private deployCmd: ApamaRunner;
	private correlatorHttp: CorrelatorHttpInterface;
	private manager: ApamaRunner;
	public constructor(private logger: vscode.OutputChannel, private apamaEnv: ApamaEnvironment, private config: CorrelatorConfig) {
		super();

		this.manager = new ApamaRunner("engine_management", apamaEnv.getManagerCmdline(),logger);
		this.deployCmd = new ApamaRunner("engine_deploy", apamaEnv.getDeployCmdline(), logger);
		console.log("Correlator interface host: " + config.host.toString() + " port " + config.port.toString());
		this.correlatorHttp = new CorrelatorHttpInterface(logger, config.host, config.port);
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		console.log("Initialize called");

		if (!response.body) {
			response.body = {};
		}

		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsFunctionBreakpoints = false;
		response.body.exceptionBreakpointFilters = [
			{
				label: "Uncaught Exceptions",
				filter: 'uncaught',
				default: true
			}
		];

		this.sendResponse(response);
	}


	private runCorrelator(): vscode.Task {
		let correlator = new vscode.Task(
		  {type: "shell", task: ""},
		  "DebugCorrelator",
		  "correlator",
		  new vscode.ShellExecution(this.apamaEnv.getCorrelatorCmdline(),this.config.args.concat(['-p',this.config.port.toString()])),
		  []
		);
		correlator.group = 'test';
		return correlator;
	  }
	/**
	 * Frontend requested that the application be launched
	 */
	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {
		console.log("Debug started on host: " + this.config.host.toString() + " port " + this.config.port.toString());
		
		let te = await vscode.tasks.executeTask(this.runCorrelator());
		this.correlatorHttp.enableDebugging()
			.then(async () => {
				// Pause correlator while we wait for the configuration to finish, we want breakpoints to be set first
				await this.correlatorHttp.pause();

				let folder = undefined;
				//check for a single folder 
				if( vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
					folder = vscode.workspace.workspaceFolders[0];
				}
				else
				{
					folder = await vscode.window.showWorkspaceFolderPick();
				}

				// does workspace contain folders
				// if yes - allow pick, check for deployed and then run
				
				if (folder !== undefined) {
					console.log("Debug : " + folder.uri.fsPath );
					await this.deployCmd.run('.', ['--inject', this.config.host.toString(), this.config.port.toString()]
						.concat(folder.uri.fsPath));
					this.sendEvent(new InitializedEvent()); // We're ready to start recieving breakpoints
					this.sendResponse(response);
				}
			})
			.catch((error) => {
				console.error(error);
			});
	}

	/**
	 * Frontend requested that breakpoints be set
	 */
	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
		// TODO: It'll probably set the breakpoints twice in a file if a new breakpoint is added while running - so we should fix that
		if (args.source.path) {
			const filePath = args.source.path;

			// Attempt to set all of the breakpoints
			console.log('Requesting breakpoints');

			const breakpointIds : {[key: string]:string}  = {} as {[key: string]:string} ;
			console.log('for');
			console.log(args);
			for ( let lineNumber  of args.lines || [] ){
				try {
					breakpointIds[lineNumber.toString()] = await this.correlatorHttp.setBreakpoint(filePath, lineNumber);
				}
				catch(e) {
					console.log('Error: ' +  e.response.statusText);
				}
			}
			console.log('Requested breakpoints');
			console.log(breakpointIds);
			console.log('Check Breakpoints');
			let setBreakPoints = await this.correlatorHttp.getAllSetBreakpoints();
			console.log(setBreakPoints);
			console.log('Requested breakpoints 2');
			let setBreakpointsById = setBreakPoints.reduce(
				(acc, breakpoint) => 
				{
				acc[breakpoint.id] = breakpoint;
				return acc;
				} , {} as { [key: string]: CorrelatorBreakpoint });

			// Ask the correlator which breakpoints have been set
			// Compare the attempted and the actually set to determine whether they've actually been set (and on which line)
			let bps : Breakpoint[] = [];
			for (const key in breakpointIds) {
				if (breakpointIds.hasOwnProperty(key)) {
					if (setBreakpointsById[key]) {
						// Successful breakpoint
						bps.push(new Breakpoint(true, setBreakpointsById[key].line));					
					} else {
						// Breakpoint failed to be set
						bps.push(new Breakpoint(false));
					}
				}
			}
			response.body = {
				breakpoints: bps
			};

			console.log(response);
			// Send the response with the list of breakpoints
			this.sendResponse(response);
				
		} else {
			console.error("Unable to set breakpoints, no file path provided");
			this.sendResponse(response);
		}
	}

	/**
	 * Indication that the frontend is done setting breakpoints etc
	 */
	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		console.log('Configuration done');
		this.correlatorHttp.resume()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}


	protected async waitUntilTaskEnds(taskName: string) {
		return new Promise<void>(resolve => {
			let disposable = vscode.tasks.onDidEndTask(e => {
				if (e.execution.task.name === taskName) {
					disposable.dispose();
					resolve();
				}
			});
		});
	}

	/**
	 * Frontend requested that the application terminate
	 */
	protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments) {
		console.log("Stop requested to port " + this.config.port.toString());
		this.manager.run('.',['-s','debug_stop','-p',this.config.port.toString()]);
		await this.waitUntilTaskEnds("DebugCorrelator");
		//this.correlatorCmd.stop().then(() => this.sendResponse(response));
		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		console.log("Threads requested");
		this.correlatorHttp.getContextStatuses()
			.then(contextStatuses => contextStatuses.map(status => new Thread(status.contextid, status.context)))
			.then(threads => {
				response.body = {
					threads
				};
				this.sendResponse(response);
			});
	}

	/**
	 * Frontend requested stacktrace
	 */
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		console.log("Stacktrace requested");
		this.correlatorHttp.getStackTrace(args.threadId)
			.then(correlatorStackFrames => correlatorStackFrames.stackframes.map((stackframe, i) => new StackFrame(this.createFrameId(correlatorStackFrames.contextid, i), stackframe.action, this.createSource(stackframe.filename), stackframe.lineno)))
			.then(stackFrames => {
				response.body = {
					stackFrames
				};
				this.sendResponse(response);
			});
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		console.log("Scopes requested");
		response.body = {
			scopes: [
				new Scope("Local", this.createVariablesRef(args.frameId, 'local')),
				new Scope("Monitor", this.createVariablesRef(args.frameId, 'monitor'))
			]
		};
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		console.log("Variables requested");
		const { contextid, frameidx, type } = this.parseVariablesRef(args.variablesReference);

		this.getVariablesForType(type, contextid, frameidx)
			.then(variables => variables
				.filter(variable => variable.value !== '<uninitialized>')
				.filter(variable => !variable.name.startsWith("::"))
				// Can end up with duplicate names for variables when used in other scopes (which is super annoying), so we number them.
				.map((variable, i, variables) => {
					const count = variables.slice(0, i + 1).filter(otherVariable => otherVariable.name === variable.name).length;
					if (count > 1) {
						variable.name = `${variable.name}#${count}`;
					}
					return variable;
				})
			)
			.then(variables => variables.map(variable => new Variable(variable.name, variable.value)))
			.then(variables => {
				response.body = {
					variables
				};
				this.sendResponse(response);
			});
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		console.log("Continue requested");
		this.correlatorHttp.resume()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		console.log("Next requested");
		this.correlatorHttp.stepOver()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		console.log("Step In requested");
		this.correlatorHttp.stepIn()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		console.log("Step Out requested");
		this.correlatorHttp.stepOut()
			.then(() => this.sendResponse(response))
			.then(() => this.waitForCorrelatorPause());
	}

	protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments): void {
		console.log("Exception breakpoint requested");
		const breakOnUncaught = args.filters.indexOf('uncaught') !== -1;
		this.correlatorHttp.setBreakOnErrors(breakOnUncaught)
			.then(() => this.sendResponse(response));
	}

	protected convertClientPathToDebugger(clientPath: string): string {
		return normalizeCorrelatorFilePath(super.convertClientPathToDebugger(clientPath));
	}

	protected convertDebuggerPathToClient(debuggerPath: string): string {
		return normalizeCorrelatorFilePath(super.convertDebuggerPathToClient(debuggerPath));
	}

	private async waitForCorrelatorPause() {
		let response = await this.correlatorHttp.awaitPause();
		this.sendEvent(new StoppedEvent(response.reason, response.contextid));
	}

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath));
	}

	private createFrameId(contextId: number, frameidx: number): number {
		return contextId * MAX_STACK_SIZE + frameidx;
	}

	private parseFrameId(frameid: number): { contextid: number, frameidx: number } {
		const frameidx = frameid % MAX_STACK_SIZE;
		const contextid = (frameid - frameidx) / MAX_STACK_SIZE;
		return {
			contextid,
			frameidx
		};
	}

	private createVariablesRef(frameId: number, variableType: 'monitor' | 'local'): number {
		let typeNumber = 0;
		switch (variableType) {
			case 'local': typeNumber = 0; break;
			case 'monitor': typeNumber = 1; break;
		}
		return frameId * 10 + typeNumber;
	}

	private parseVariablesRef(variablesRef: number): { type: 'monitor' | 'local', contextid: number, frameidx: number } {
		const typeNumber = variablesRef % 10;
		let type: 'monitor' | 'local';
		switch (typeNumber) {
			case 0: type = 'local'; break;
			case 1: type = 'monitor'; break;
			default: throw Error("Unknown type code: " + typeNumber);
		}
		const { contextid, frameidx } = this.parseFrameId((variablesRef - typeNumber) / 10);
		return {
			type,
			contextid,
			frameidx
		};
	}

	private getVariablesForType(type: 'monitor' | 'local', contextid: number, frameidx: number) {
		switch (type) {
			case 'monitor': return this.correlatorHttp.getContextStatuses()
				.then(contextStatuses => contextStatuses.find(contextStatus => contextStatus.contextid === contextid))
				.then(possiblePause => {
					if (!possiblePause) {
						throw Error("Trying to read variables from non existent context: " + contextid);
					}
					if (!possiblePause.paused) {
						throw Error("Trying to read variables from unpaused context: " + contextid);
					}
					return possiblePause as CorrelatorPaused;
				})
				.then(pause => this.correlatorHttp.getMonitorVariables(contextid, pause.instance));
			case 'local': return this.correlatorHttp.getLocalVariables(contextid, frameidx);
		}
	}
}

export function normalizeCorrelatorFilePath(filePath: string): string {
	if (process.platform === 'win32') {
		return filePath.replace(/.+:/, match => match.toUpperCase());
	} else {
		return filePath;
	}
}
