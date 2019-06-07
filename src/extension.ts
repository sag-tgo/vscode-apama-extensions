"use_strict";

import * as path from 'path';

import { Disposable, ExtensionContext, workspace, debug, OutputChannel, window } from 'vscode';
import {
	LanguageClient, LanguageClientOptions, ServerOptions,
	TransportKind, ForkOptions, WorkspaceFolder
} from 'vscode-languageclient';

import {ApamaConfigurationProvider} from './apama_debug/apamadebugconfig';
import { ApamaProjectView } from './apama_project/apamaProjectView';
import { ApamaEnvironment } from './apama_util/apamaenvironment';


let placeholder: ApamaProjectView;
let logger:OutputChannel; 
//
// client activation function, this is the entrypoint for the client
//
export function activate(context: ExtensionContext): void {
	let commands: Disposable[] = [];
	logger = window.createOutputChannel('Apama Extension');
	logger.show();
	logger.appendLine('Started EPL language server');

	let apamaEnv:ApamaEnvironment = new ApamaEnvironment(logger);

	// this is the code for the side bar apama-project parts.
	if (workspace.workspaceFolders !== undefined) {

		logger.appendLine('Starting EPL language server');
		placeholder = new ApamaProjectView(apamaEnv, logger, workspace.workspaceFolders ,context);
		const provider = new ApamaConfigurationProvider(logger,apamaEnv);
		context.subscriptions.push(debug.registerDebugConfigurationProvider('apama', provider));
    context.subscriptions.push(provider);
	}


	// The server is implemented in server.ts - built when this is built
	let serverModule: string = context.asAbsolutePath(path.join('out', 'server.js'));
	// The debug options for the server
	let debugOptions: ForkOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the  normal ones are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	};

	// Options of the language client
	let clientOptions: LanguageClientOptions = {
		// Activate the server for epl files
		documentSelector: ['epl', 'yaml'],
		synchronize: {
			// Synchronize the section 'eplLanguageServer' of the settings to the server
			configurationSection: 'eplLanguageServer',
			// Notify the server about file changes to epl files contained in the workspace
			// need to think about this
			// fileEvents: workspace.createFileSystemWatcher('**/.epl')
		}
	};

	// Create the language client and start the client.
	let langServer: Disposable = new LanguageClient('eplLanguageServer', 'Language Server', serverOptions, clientOptions).start();

	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	commands.forEach(command => context.subscriptions.push(command));
	context.subscriptions.push(langServer);
}


// this method is called when your extension is deactivated
export function deactivate() { }
