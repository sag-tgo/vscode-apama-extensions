import * as path from 'path';
import * as vscode from 'vscode';
import { commands } from 'vscode';
import { BundleItem } from './BundleItem';
import { ApamaProject } from './apamaProject';
import { runApamaProject } from './runApamaProject';

export class PopulateProjects implements vscode.TreeDataProvider<string|BundleItem|ApamaProject> {
	private _onDidChangeTreeData: vscode.EventEmitter<BundleItem | ApamaProject | undefined> = new vscode.EventEmitter<BundleItem | ApamaProject | undefined>();
	readonly onDidChangeTreeData: vscode.Event<BundleItem | ApamaProject | undefined> = this._onDidChangeTreeData.event;



	private fsWatcher : vscode.FileSystemWatcher;
	private delWatcher : vscode.FileSystemWatcher;

	constructor(private workspaceRoot: string, private context?: vscode.ExtensionContext) {

		this.registerCommands();

		this.fsWatcher = vscode.workspace.createFileSystemWatcher("**/*.project");
		this.delWatcher = vscode.workspace.createFileSystemWatcher("**/*"); //if you delete a directory it will not trigger all contents

		this.fsWatcher.onDidCreate(() => {
			this.refresh();
		 });
		 this.delWatcher.onDidDelete(() => {
			this.refresh();
		 });
		 this.fsWatcher.onDidChange(() => {
			this.refresh();
		 });
	}

	registerCommands(): void {
    if( this.context !== undefined ){
      this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// Create project 
				//
				commands.registerCommand('extension.apamaProjects.apamaToolCreateProject', () => {
					//display prompt.
					vscode.window.showInputBox({
						value: "apama_project",
						placeHolder: "Project directory name"
					})
						.then(result => {
							if (typeof result === "string" && vscode.workspace.rootPath !== undefined) {
								console.log(result);
								runApamaProject(`apama_project create ${result}`, vscode.workspace.rootPath)
									.then((result: string[]) => {
										vscode.window.showInformationMessage(`${result}`);
									})
									.catch((err: string[]) => {
										vscode.window.showErrorMessage(`${err}`);
									});
								} 
						});
				}),

				//
				// Add Bundle
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolAddBundles', (project: ApamaProject) => {
					console.log(project.fspath);
					runApamaProject("apama_project list bundles", project.fspath)
						.then((result: string[]) => {
							let displayList: vscode.QuickPickItem[] = [];
							result.forEach( (item) => {
								item = item.trim();
								//matches number followed by text
								if( item.search(/^[0-9][0-9]?\s.*$/) === 0 ) {
									item = item.replace(/^([0-9][0-9]?\s)(.*)$/g , (cap1,cap2,cap3) => {return cap3;});
									displayList.push ( {label: item});
								} 
							});
							console.log(displayList);
							return vscode.window.showQuickPick(displayList,{placeHolder:"Choose a bundle to add"});
						})
						.then( (picked) => {
							console.log(picked);
							if( picked === undefined ){
								return;
							}
							runApamaProject(`apama_project add bundle \"${picked.label}\"`, project.fspath)
							.then((result: string[]) => {
								vscode.window.showInformationMessage(`${result}`);
							})
							.catch((err: string[]) => {
								vscode.window.showErrorMessage(`${err}`);
							});
						})
						.catch((err: string[]) => {
							vscode.window.showErrorMessage(`${err}`);
						});
						this.refresh();
					}),

				//
				// Remove Bundle
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolRemoveBundle', (bundle: BundleItem) => {
					console.log(bundle.dirname);
					runApamaProject(`apama_project remove bundle \"${bundle.label}\"`, bundle.project.fspath)
						.then((result: string[]) => {
							vscode.window.showInformationMessage(`${result}`);
						})
						.catch((err: string[]) => {
							vscode.window.showErrorMessage(`${err}`);
						});
						this.refresh();
				}),

				//
				// Engine Deploy
				//
				vscode.commands.registerCommand('extension.apamaProjects.apamaToolDeployProject', (project: ApamaProject) => {
					console.log(project.label);
					runApamaProject(`engine_deploy --outputDeployDir ${project.label}_deployed ${project.label}`, this.workspaceRoot)
						.then((result: string[]) => {
							vscode.window.showInformationMessage(`${result}`);
						})
						.catch((theError: string[]) => console.log(`ERROR: ${theError}`));
						this.refresh();
				}),

				//
				// Placeholder for clicking on a bundle/project - will open files possibly or navigate to the right directory.
				//
				commands.registerCommand('extension.apamaProjects.SelectItem', (document: vscode.TextDocument) => {
          console.log(document);
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
	async getChildren(item?: BundleItem | ApamaProject | undefined ): Promise<undefined | BundleItem[] | ApamaProject[]> {

		//if this is a bundle - then there are no children
		if (item && item.contextValue === "bundle") {
			console.log( "noChildren : " + item.toString());
			return [];
		}

		//if this is a project - we should have set up the bundles now
		if (item instanceof ApamaProject) {
			//lets get the bundles 
			console.log( `getBundles : ${item.label} => ${item.items.length}`);
			return (<ApamaProject>item).items;
		}

		//if we need a root or two
		let rVal:BundleItem[] | ApamaProject[] = await this.scanProjects();
		return rVal;
	}

	//
	// Find all the projects 
	//
	async scanProjects(): Promise<ApamaProject[]> {
		let result: ApamaProject[] = [];
		//find .projects, but exclude anything with _deployed suffix
		//also covers all roots of a multi root workspace
		let projectNames = await vscode.workspace.findFiles("**/.project","**/*_deployed/**");
		console.log("projects found: " +  projectNames.length );
		for (let index = 0; index < projectNames.length; index++) {
			const project:vscode.Uri = projectNames[index];
			let current:ApamaProject = new ApamaProject(          
				path.relative(this.workspaceRoot, path.dirname(project.fsPath)),
				vscode.TreeItemCollapsibleState.Collapsed,
				path.dirname(project.fsPath)
			);
			 await this.getBundlesFromProject(current);
			console.log( `getBundles updated project : ${current.label} => ${current.items.length}`);
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
		result.forEach( (item) => {
			//matches number followed by text
			if( withinInstalledRegion && item.search("Bundles that can be added:") === -1 ) {
				let current = item.trim();
				project.items.push ( new BundleItem(current,project) );
			} else {
				//hacky way to capture the installed bundles.
				if( item.search("Bundles that have already been added:") > -1 ) {
					withinInstalledRegion = true;
				}else if(item.search("Bundles that can be added:") > -1) {
					withinInstalledRegion = false;
				}
			}									
		});
		console.log( `Bundles Added : ${project.label} => ${project.items.length}`);
	}

	//
	// interface requirement
	//
	getTreeItem(element: BundleItem | ApamaProject | string): vscode.TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			console.log("ERROR ???? getTreeItem -- " + element.toString());
			return new vscode.TreeItem(element,vscode.TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
    return <vscode.TreeItem>element;
	}
}


