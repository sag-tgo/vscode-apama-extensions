import { window, commands, Disposable, workspace, OutputChannel, TreeDataProvider, EventEmitter, Event, TreeView, FileSystemWatcher, ExtensionContext, QuickPickItem, TextDocument, Uri, TreeItemCollapsibleState, TreeItem, WorkspaceFolder, RelativePattern } from 'vscode';
import { ApamaRunner } from '../apama_util/apamarunner';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import { ApamaProcessItem, IApamaProcessItem } from './apamaProcess';

export class ApamaProcessView implements TreeDataProvider<string | IApamaProcessItem> {
	private _onDidChangeTreeData: EventEmitter<ApamaProcessItem | undefined> = new EventEmitter<ApamaProcessItem | undefined>();
	readonly onDidChangeTreeData: Event<ApamaProcessItem | undefined> = this._onDidChangeTreeData.event;

	//we want to have a list of processes managed in this view
	private processList: ApamaProcessItem[] = []; 
	private treeView: TreeView<{}>;

	//
	// Added facilities for multiple workspaces - this will hopefully allow 
	// ssh remote etc to work better later on, plus allows some extra organisational
	// facilities....
	constructor(private apamaEnv: ApamaEnvironment, private logger: OutputChannel, private context?: ExtensionContext) {
		let subscriptions: Disposable[] = [];
		this.registerCommands();
		this.processList.push( new ApamaProcessItem(logger,"Test","localhost",1234,new ApamaRunner("test","ls",logger)));
		this.processList[0].items.push(new ApamaProcessItem(logger,"Test Watcher","localhost",1234,new ApamaRunner("test","ls",logger)));
		this.processList[0].items[0].contextValue="watcher";
		this.treeView = window.createTreeView('apamaProcesses', { treeDataProvider: this });
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// Create new Correlator config
				//
				commands.registerCommand('extension.apamaProcess.newCorrelator', () => {
					return;
				}),

				//Correlator commands 
				commands.registerCommand('extension.apamaProcess.start', (process: ApamaProcessItem) => {
					return;
				}),

				commands.registerCommand('extension.apamaProcess.stop', (process: ApamaProcessItem) => {
					return;
				}),

				//Creates a child process
				commands.registerCommand('extension.apamaProcess.startWatcher', (process: ApamaProcessItem) => {
					//this.apama_project.run(bundle.fsDir, ['remove', 'bundle', '"' + bundle.label + '"'])
					//.then(result => window.showInformationMessage(`${result.stdout}`))
					//.catch(err => window.showErrorMessage(`${err}`));					
					return;
				}),

				commands.registerCommand('extension.apamaProcess.stopWatcher', (process: ApamaProcessItem) => {
					return;
				}),

				commands.registerCommand('extension.apamaProcess.inject', (process: ApamaProcessItem) => {
					return;
				}),

				//Show logger output for command
				commands.registerCommand('extension.apamaProcess.SelectItem', (process: ApamaProcessItem) => {
					//this.logger.appendLine(document.fileName);
					return;
				}),

				//
				// refresh projects
				//
				commands.registerCommand('extension.apamaProcess.refresh', () => {
					this.refresh();
				})
			]);
		}
	}

	//
	// Trigger refresh of the tree
	//
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	//
	// get the children of the current item (group or item)
	// made this async so we can avoid race conditions on updates
	//
	async getChildren(item?:ApamaProcessItem | undefined): Promise<undefined | ApamaProcessItem[] > {

		//if this is a correlator - then there may be dependent processes
		if (item && item.contextValue === "watcher") {
			this.logger.appendLine("getChildren -- watcher");
				return [];
		}

		if (item && item.contextValue === "correlator") {
			this.logger.appendLine("getChildren -- Correlator : " + this.processList[0].items.toString());
			return this.processList[0].items;
		}


		//Root nodes
		this.logger.appendLine("getChildren -- Root : " + this.processList.toString());
		return this.processList;
	}



	//
	// interface requirement
	//
	getTreeItem(element: ApamaProcessItem | string): TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			this.logger.appendLine("ERROR ???? getTreeItem -- " + element.toString());
			return new TreeItem(element, TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
		return <TreeItem>element;
	}
}


