"use_strict";

import * as path from 'path';

import * as vscode from 'vscode';

import { ApamaEnvironment } from './apama_util/apamaenvironment';
import { ApamaTaskProvider } from './apama_util/apamataskprovider';
import { ApamaDebugConfigurationProvider } from './apama_debug/apamadebugconfig';
import { ApamaProjectView } from './apama_project/apamaProjectView';

//
// client activation function, this is the entrypoint for the client
//
export function activate(context: vscode.ExtensionContext): void {
	let commands: vscode.Disposable[] = [];
	const logger = vscode.window.createOutputChannel('Apama Extension');
	logger.show();
	logger.appendLine('Started EPL Extension');

	let apamaEnv:ApamaEnvironment = new ApamaEnvironment(logger);
	const taskprov = new ApamaTaskProvider(logger,apamaEnv);
	context.subscriptions.push(vscode.tasks.registerTaskProvider( "apama" , taskprov ));

	const provider = new ApamaDebugConfigurationProvider(logger,apamaEnv);
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('apama', provider));
	context.subscriptions.push(provider);

	//this needs a workspace folder which under some circumstances can be undefined. 
	//but we can ignore in that case and things shjould still work
	if (vscode.workspace.workspaceFolders !== undefined) 
	{
		const projView = new ApamaProjectView(apamaEnv, logger, vscode.workspace.workspaceFolders, context);
	}

	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	commands.forEach(command => context.subscriptions.push(command));

	const commands2 = new Map();
	commands2.set("myExtension.sayHello", (name: string = "world") => {
		console.log(`Hello ${name}!!!`);
	});

	for (let [command, commandHandler] of commands2) {
		context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
	}

}


// this method is called when your extension is deactivated
export function deactivate() { }
