import * as vscode from 'vscode';
import * as path from 'path';
import { ApamaRunner } from '../apama_util/apamarunner';



export interface ApamaTreeItem {
	logger: vscode.OutputChannel;
	label: string;
	fsDir: string;
	items: ApamaTreeItem[];
	contextValue: string;
	instance: boolean;
	ws: vscode.WorkspaceFolder;
	apama_project: ApamaRunner;
}

export class ApamaProjectWorkspace extends vscode.TreeItem implements ApamaTreeItem {

	constructor(
		public logger: vscode.OutputChannel,
		public readonly label: string,
    public readonly fsDir: string,
		public ws: vscode.WorkspaceFolder,
		public apama_project: ApamaRunner
    ) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}

	items: ApamaProject[] = [];
  contextValue: string = 'workspace';
	instance: boolean = false;

	//
	// Find all the projects 
	//
	async scanProjects(): Promise<ApamaProject[]> {

		const result: ApamaProject[] = [];

		//find .projects, but exclude anything with _deployed suffix
		//also covers all roots of a multi root workspace
		const rootPattern: vscode.RelativePattern = new vscode.RelativePattern(this.ws , "/.project");
		const ignorePattern: vscode.RelativePattern = new vscode.RelativePattern(this.ws , "**/*_deployed/**");

		if (vscode.workspace.workspaceFolders !== undefined) {
			const rootFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];

			try {
				const projectFile: vscode.Uri = vscode.Uri.file(rootFolder.uri.fsPath + "/.project");
				await vscode.workspace.fs.stat(projectFile);
				// .project file exists in the root...
				result.push(new ApamaProject(this.logger,
					path.relative(this.ws.uri.fsPath, path.dirname(rootFolder.uri.fsPath)),
					path.dirname(rootFolder.uri.fsPath),
					this.ws,
					this.apama_project
				));
				return result;
			} catch (error) {
				// .project file doesn't exist in the root
				// vscode.window.showErrorMessage(error);
			}
		}

		const rootProject = await vscode.workspace.findFiles(rootPattern, ignorePattern);
		
		const projectsPattern: vscode.RelativePattern = new vscode.RelativePattern( this.ws , "**/.project" );
		const projectNames = await vscode.workspace.findFiles(projectsPattern, ignorePattern);
	
		for (let index = 0; index < projectNames.length; index++) {
			const project: vscode.Uri = projectNames[index];
			result.push(new ApamaProject(this.logger,
				path.relative(this.ws.uri.fsPath, path.dirname(project.fsPath)),
				path.dirname(project.fsPath),
				this.ws,
				this.apama_project
			));
		}
		return result;
	}
}


export class ApamaProject extends vscode.TreeItem  implements ApamaTreeItem {
	constructor(
		public logger: vscode.OutputChannel,
    public readonly label: string,
		public readonly fsDir: string,
		public ws: vscode.WorkspaceFolder,
		public apama_project: ApamaRunner
    ) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}
	items: BundleItem[] = [];
  contextValue: string = 'project';	
	instance: boolean = false;


	//
	// Use apama project tool to populate ApamaProject objects list of Bundles
	//
	async getBundlesFromProject(): Promise<BundleItem[]> {
		let items : BundleItem[] = [];
		let result = await this.apama_project.run(this.fsDir, ['list','bundles']);
		let withinInstalledRegion: boolean = false;
		let lines: string[] = result.stdout.split(/\r?\n/);
		let previousBundle: BundleItem;
		lines.forEach((item) => {
			//skipped until "Bundles that have already been added:"
			//Then processes until "Bundles that can be added:"
			//indentation implies bundle and instance
			if (withinInstalledRegion && item.search("Bundles that can be added:") === -1) {
				if( item.length > 0 ) {
					//on the raw string, count the indentation
					let current = item.trimRight();
					let indentation = current.length;
					current = item.trimLeft();
					indentation = indentation - current.length;

					if( indentation === 12) {
						previousBundle.instance = true; //TODO : this is wrong the thing im creating here is an instance...
						previousBundle.items.push(new BundleItem(this.logger, current, this.fsDir,this.ws,this.apama_project));
					} else {
						if( previousBundle !== undefined) {
							items.push( previousBundle );
						}
						//this.logger.appendLine(`Creating : ${current}`);
						previousBundle = new BundleItem(this.logger, current, this.fsDir,this.ws,this.apama_project);
					}

				}
			} else {
				//hacky way to capture the installed bundles.
				if (item.search("Bundles that have already been added:") > -1) {
					withinInstalledRegion = true;
				} else if (item.search("Bundles that can be added:") > -1) {
					//if we have dropped out add the last bundle 
					if( previousBundle !== undefined ){
						//this.logger.appendLine(`Adding : ${previousBundle.label}`);
						items.push( previousBundle );
					}
					withinInstalledRegion = false;
				}
			}
		});
		//this.logger.appendLine(`Bundles Added : ${this.label} => ${items.length}`);
		return items;
	}
}

export class BundleItem extends vscode.TreeItem implements ApamaTreeItem {
	constructor(public logger: vscode.OutputChannel,
							public readonly label: string,
							public fsDir: string,
							public ws: vscode.WorkspaceFolder,
							public apama_project: ApamaRunner) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}
	items: BundleItem[] = [];
	contextValue: string = 'bundle';
	instance: boolean = false;
}
