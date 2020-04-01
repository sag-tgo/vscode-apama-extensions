import * as vscode from 'vscode';
import { ApamaProject, ApamaProjectWorkspace, ApamaTreeItem, BundleItem } from './apamaProject';
import { ApamaRunner } from '../apama_util/apamarunner';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';

export class ApamaProjectView implements vscode.TreeDataProvider<string | ApamaTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ApamaTreeItem | undefined> = new vscode.EventEmitter<ApamaTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<ApamaTreeItem | undefined> = this._onDidChangeTreeData.event;

	//we want to have a list of top level nodes (projects)
	private workspaceList: ApamaProjectWorkspace[] = []; 
	
	private projects: ApamaProject[] = [];

	private treeView: vscode.TreeView<{}>;

	private fsWatcher: vscode.FileSystemWatcher;
	private delWatcher: vscode.FileSystemWatcher;
	private apama_project: ApamaRunner;
	private apama_deploy: ApamaRunner;

	//
	// Added facilities for multiple workspaces - this will hopefully allow 
	// ssh remote etc to work better later on, plus allows some extra organisational
	// facilities....
	constructor(private apamaEnv: ApamaEnvironment, private logger: vscode.OutputChannel, private context?: vscode.ExtensionContext) {
		let subscriptions: vscode.Disposable[] = [];
		
		this.apama_project = new ApamaRunner('apama_project', apamaEnv.getApamaProjectCmdline(), logger);
		this.apama_deploy = new ApamaRunner('apama_deploy', apamaEnv.getDeployCmdline(), logger);
		let ws: vscode.WorkspaceFolder;
		if (vscode.workspace.workspaceFolders !== undefined) {
			vscode.workspace.workspaceFolders.forEach( ws => {
				this.workspaceList.push(new ApamaProjectWorkspace(logger,ws.name,ws.uri.fsPath,ws,this.apama_project))
			});
		}

		//project commands 
		this.registerCommands();

		//this file is created/updated/deleted as projects come and go and depends on the "current" set of file systems
		this.fsWatcher = vscode.workspace.createFileSystemWatcher("**/*.dependencies");
		//but for deletions of the entire space we need 
		this.delWatcher = vscode.workspace.createFileSystemWatcher("**/*"); //if you delete a directory it will not trigger all contents
		//handlers 
		this.fsWatcher.onDidCreate((item) => {
			this.refresh();
		});
		this.delWatcher.onDidDelete(() => { 
			this.refresh();
		});
		this.fsWatcher.onDidChange((item) => {
			this.refresh();
		});

		//the component
		this.treeView = vscode.window.createTreeView('apamaProjects', { treeDataProvider: this });
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// Create project 
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolCreateProject', () => {
					//display prompt.
					vscode.window.showInputBox({
						value: "apama_project",
						placeHolder: "Project directory name"
					})
						.then(result => {
							if (typeof result === "string" && vscode.workspace.rootPath !== undefined) {
								this.apama_project.run(vscode.workspace.rootPath, ['create', result])
									.catch((err: string) => {
										this.logger.appendLine(err);
									});
							}
						});
				}),

				//
				// Add Bundle
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolAddBundles', (project: ApamaProject) => {
					this.apama_project.run(project.fsDir, ['list', 'bundles'])
						.then((result) => {
							let lines: string[] = result.stdout.split(/\r?\n/);
							let displayList: vscode.QuickPickItem[] = [];
							lines.forEach((item) => {
								item = item.trim();
								//matches number followed by text
								if (item.search(/^[0-9][0-9]?\s.*$/) === 0) {
									item = item.replace(/^([0-9][0-9]?\s)(.*)$/g, (cap1, cap2, cap3) => { return cap3; });
									displayList.push({ label: item });
								}
							});
							return vscode.window.showQuickPick(displayList, { placeHolder: "Choose a bundle to add" });
						})
						.then(picked => {
							if (picked === undefined) {
								return;
							}

							this.apama_project.run(project.fsDir, ['add', 'bundle', '"' + picked.label.trim()+ '"'])
								.then(result => vscode.window.showInformationMessage(`${result.stdout}`))
								.catch(err => vscode.window.showErrorMessage(`${err}`));
						})
						.catch(err => vscode.window.showErrorMessage(`${err}`));
				}),

				//
				// Remove Bundle
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolRemoveBundle', (bundle: BundleItem) => {

					this.apama_project.run(bundle.fsDir, ['remove', 'bundle', '"' + bundle.label + '"'])
					.then(result => vscode.window.showInformationMessage(`${result.stdout}`))
					.catch(err => vscode.window.showErrorMessage(`${err}`));					
				}),

				//
				// Engine Deploy
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolDeployProject', (project: ApamaProject) => {
					this.apama_deploy.run(project.ws.uri.fsPath, ['--outputDeployDir', project.label + '_deployed',  project.label])
					.then(result => vscode.window.showInformationMessage(`${result.stdout}`))
					.catch(err => vscode.window.showErrorMessage(`${err}`));
				}),

				//
				// Placeholder for clicking on a bundle/project - will open files possibly or navigate to the right directory.
				//
				vscode.commands.registerCommand('extension.apamaProjects.SelectItem', (document: vscode.TextDocument) => {
					//this.logger.appendLine(document.fileName);
					return;
				}),

				//
				// refresh projects
				//
				vscode.commands.registerCommand('extension.apamaProjects.refresh', () => {
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

		//Root nodes
		return this.workspaceList;
	}



	//
	// interface requirement
	//
	getTreeItem(element: BundleItem | ApamaProject | string): vscode.TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			this.logger.appendLine("ERROR ???? getTreeItem -- " + element.toString());
			return new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
		return <vscode.TreeItem>element;
	}
}


