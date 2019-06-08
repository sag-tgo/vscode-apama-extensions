import { window, commands, Disposable, workspace, OutputChannel, TreeDataProvider, EventEmitter, Event, TreeView, FileSystemWatcher, ExtensionContext, QuickPickItem, TextDocument, Uri, TreeItemCollapsibleState, TreeItem, WorkspaceFolder, RelativePattern } from 'vscode';
import { ApamaProject, ApamaProjectWorkspace, ApamaTreeItem, BundleItem } from './apamaProject';
import { ApamaRunner, ApamaAsyncRunner } from '../apama_util/apamarunner';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';

export class ApamaCorrelatorView implements TreeDataProvider<string | ApamaTreeItem> {
	private _onDidChangeTreeData: EventEmitter<ApamaTreeItem | undefined> = new EventEmitter<ApamaTreeItem | undefined>();
	readonly onDidChangeTreeData: Event<ApamaTreeItem | undefined> = this._onDidChangeTreeData.event;

	//we want to have a list of top level nodes (projects)
	private definedList: ApamaTreeItem[] = []; 
	private treeView: TreeView<{}>;

	private apama_correlator: ApamaAsyncRunner;

	//
	// Added facilities for multiple workspaces - this will hopefully allow 
	// ssh remote etc to work better later on, plus allows some extra organisational
	// facilities....
	constructor(private apamaEnv: ApamaEnvironment, private logger: OutputChannel, private context?: ExtensionContext) {
		let subscriptions: Disposable[] = [];
		
		this.apama_correlator = new ApamaAsyncRunner('apama_correlator', apamaEnv.getCorrelatorCmdline(), logger);
		let ws: WorkspaceFolder;
		//project commands 
		this.registerCommands();
		//the component
		this.treeView = window.createTreeView('apamaCorrelators', { treeDataProvider: this });
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// Create correlator definition 
				//
				commands.registerCommand('extension.apamaProjects.apamaToolDefineCorrelator', () => {
					//display prompt.
					window.showInputBox({
						value: "Correlator port",
						placeHolder: "Correlator Port"
					})
						.then(result => {
							if (typeof result === "string" && workspace.rootPath !== undefined) {
								this.logger.appendLine("To be implemented");
							}
						});
				}),

				//
				// run Correlator
				//
				commands.registerCommand('extension.apamaProjects.apamaDebug', (project: ApamaProject) => {
					this.logger.appendLine("To be implemented");
				}),

				//
				// inject script into Correlator
				//
				commands.registerCommand('extension.apamaProjects.apamaToolInject', (project: ApamaProject) => {
					this.logger.appendLine("To be implemented");
				}),
				//
				// refresh projects
				//
				commands.registerCommand('extension.apamaProjects.refresh', () => {
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
	async getChildren(item?: BundleItem | ApamaProject | ApamaProjectWorkspace | undefined): Promise<undefined | BundleItem[] | ApamaProject[] | ApamaProjectWorkspace[] > {

		//if this is a bundle - then there are no children
		if (item && item.contextValue === "bundle") {
			if( item.items.length === 0 ) {
				this.logger.appendLine("noChildren : " + item.toString());
				return [];
			}
			else {
				return item.items;
			}
		}

		//if this is a project - we should have set up the bundles now
		if (item instanceof ApamaProject) {
			//lets get the bundles 
			let index = this.workspaceList[item.ws.index].items.findIndex( proj => proj === item );
			this.workspaceList[item.ws.index].items[index].items = await item.getBundlesFromProject();
			return this.workspaceList[item.ws.index].items[index].items;
		}

		//if this is a project - we should have set up the bundles now
		if (item instanceof ApamaProjectWorkspace) {
			//lets get the projects for a workspace 
			this.workspaceList[item.ws.index].items = await item.scanProjects();
			return await this.workspaceList[item.ws.index].items;
		}

		return this.workspaceList;
	}



	//
	// interface requirement
	//
	getTreeItem(element: BundleItem | ApamaProject | string): TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			this.logger.appendLine("ERROR ???? getTreeItem -- " + element.toString());
			return new TreeItem(element, TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
		return <TreeItem>element;
	}
}


