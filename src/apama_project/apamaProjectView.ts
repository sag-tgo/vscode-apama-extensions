import * as path from 'path';
import { window, commands, Disposable, workspace, OutputChannel, TreeDataProvider, EventEmitter, Event, TreeView, FileSystemWatcher, ExtensionContext, QuickPickItem, TextDocument, Uri, TreeItemCollapsibleState, TreeItem } from 'vscode';
import { BundleItem } from './BundleItem';
import { ApamaProject } from './apamaProject';
import { runApamaProject } from './runApamaProject';

export class PopulateProjects implements TreeDataProvider<string | BundleItem | ApamaProject> {
	private _onDidChangeTreeData: EventEmitter<BundleItem | ApamaProject | undefined> = new EventEmitter<BundleItem | ApamaProject | undefined>();
	readonly onDidChangeTreeData: Event<BundleItem | ApamaProject | undefined> = this._onDidChangeTreeData.event;

	//private textDocuments: TextDocument[] = [];
	//we want to have a list of top level nodes (projects)
	private projects: ApamaProject[] = [];

	private treeView: TreeView<{}>;

	private fsWatcher: FileSystemWatcher;
	private delWatcher: FileSystemWatcher;

	constructor(private logger: OutputChannel, private workspaceRoot: string, private context?: ExtensionContext) {
		let subscriptions: Disposable[] = [];

		this.registerCommands();

		this.fsWatcher = workspace.createFileSystemWatcher("**/*.project");
		this.delWatcher = workspace.createFileSystemWatcher("**/*"); //if you delete a directory it will not trigger all contents

		this.fsWatcher.onDidCreate((item) => {
			this.refresh();
		});
		this.delWatcher.onDidDelete(() => {
			this.refresh();
		});
		this.fsWatcher.onDidChange((item) => {
			this.refresh();
		});
		this.treeView = window.createTreeView('apamaProjects', { treeDataProvider: this });
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// Create project 
				//
				commands.registerCommand('extension.apamaProjects.apamaToolCreateProject', () => {
					//display prompt.
					window.showInputBox({
						value: "apama_project",
						placeHolder: "Project directory name"
					})
						.then(result => {
							if (typeof result === "string" && workspace.rootPath !== undefined) {
								this.logger.appendLine(result);
								runApamaProject(`apama_project create ${result}`, workspace.rootPath)
									.then((result: string[]) => {
										window.showInformationMessage(`${result}`);
									})
									.catch((err: string[]) => {
										window.showErrorMessage(`${err}`);
									});
							}
						});
				}),

				//
				// Add Bundle
				//
				commands.registerCommand('extension.apamaProjects.apamaToolAddBundles', (project: ApamaProject) => {
					this.logger.appendLine(project.fspath);
					runApamaProject("apama_project list bundles", project.fspath)
						.then((result: string[]) => {
							let displayList: QuickPickItem[] = [];
							result.forEach((item) => {
								item = item.trim();
								//matches number followed by text
								if (item.search(/^[0-9][0-9]?\s.*$/) === 0) {
									item = item.replace(/^([0-9][0-9]?\s)(.*)$/g, (cap1, cap2, cap3) => { return cap3; });
									displayList.push({ label: item });
								}
							});
							this.logger.appendLine(displayList.join('\n'));
							return window.showQuickPick(displayList, { placeHolder: "Choose a bundle to add" });
						})
						.then((picked) => {
							if (picked === undefined) {
								return;
							}
							
							this.logger.appendLine("User chose " + picked.label);

							runApamaProject(`apama_project add bundle \"${picked.label}\"`, project.fspath)
								.then((result: string[]) => {
									window.showInformationMessage(`${result}`);
								})
								.catch((err: string[]) => {
									window.showErrorMessage(`${err}`);
								});
						})
						.catch((err: string[]) => {
							window.showErrorMessage(`${err}`);
						});
					this.refresh();
				}),

				//
				// Remove Bundle
				//
				commands.registerCommand('extension.apamaProjects.apamaToolRemoveBundle', (bundle: BundleItem) => {
					this.logger.appendLine(bundle.dirname);
					runApamaProject(`apama_project remove bundle \"${bundle.label}\"`, bundle.project.fspath)
						.then((result: string[]) => {
							window.showInformationMessage(`${result}`);
						})
						.catch((err: string[]) => {
							window.showErrorMessage(`${err}`);
						});
					this.refresh();
				}),

				//
				// Engine Deploy
				//
				commands.registerCommand('extension.apamaProjects.apamaToolDeployProject', (project: ApamaProject) => {
					this.logger.appendLine(project.label);
					runApamaProject(`engine_deploy --outputDeployDir ${project.label}_deployed ${project.label}`, this.workspaceRoot)
						.then((result: string[]) => {
							window.showInformationMessage(`${result}`);
						})
						.catch((theError: string[]) => this.logger.appendLine(`ERROR: ${theError}`));
					this.refresh();
				}),

				//
				// Placeholder for clicking on a bundle/project - will open files possibly or navigate to the right directory.
				//
				commands.registerCommand('extension.apamaProjects.SelectItem', (document: TextDocument) => {
					this.logger.appendLine(document.fileName);
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
	async getChildren(item?: BundleItem | ApamaProject | undefined): Promise<undefined | BundleItem[] | ApamaProject[]> {

		//if this is a bundle - then there are no children
		if (item && item.contextValue === "bundle") {
			this.logger.appendLine("noChildren : " + item.toString());
			return [];
		}

		//if this is a project - we should have set up the bundles now
		if (item instanceof ApamaProject) {
			//lets get the bundles 
			this.logger.appendLine(`getBundles : ${item.label} => ${item.items.length}`);
			return (<ApamaProject>item).items;
		}

		//if we need a root or two
		let rVal: BundleItem[] | ApamaProject[] = await this.scanProjects();
		return rVal;
	}

	//
	// Find all the projects 
	//
	async scanProjects(): Promise<ApamaProject[]> {
		let result: ApamaProject[] = [];
		//find .projects, but exclude anything with _deployed suffix
		//also covers all roots of a multi root workspace
		let projectNames = await workspace.findFiles("**/.project", "**/*_deployed/**");
		this.logger.appendLine("projects found: " + projectNames.length);
		for (let index = 0; index < projectNames.length; index++) {
			const project: Uri = projectNames[index];
			let current: ApamaProject = new ApamaProject(this.logger,
				path.relative(this.workspaceRoot, path.dirname(project.fsPath)),
				TreeItemCollapsibleState.Collapsed,
				path.dirname(project.fsPath)
			);
			await this.getBundlesFromProject(current);
			this.logger.appendLine(`getBundles updated project : ${current.label} => ${current.items.length}`);
			result.push(current);
		}
		return result;
	}

	//
	// Use apama project tool to populate ApamaProject objects list of Bundles
	//
	async getBundlesFromProject(project: ApamaProject): Promise<void> {
		project.items = [];
		let result = await runApamaProject("apama_project list bundles", project.fspath);
		let withinInstalledRegion: boolean = false;
		result.forEach((item) => {
			//matches number followed by text
			if (withinInstalledRegion && item.search("Bundles that can be added:") === -1) {
				let current = item.trim();
				project.items.push(new BundleItem(current, project));
			} else {
				//hacky way to capture the installed bundles.
				if (item.search("Bundles that have already been added:") > -1) {
					withinInstalledRegion = true;
				} else if (item.search("Bundles that can be added:") > -1) {
					withinInstalledRegion = false;
				}
			}
		});
		this.logger.appendLine(`Bundles Added : ${project.label} => ${project.items.length}`);
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


