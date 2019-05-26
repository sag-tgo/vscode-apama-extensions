import * as vscode from 'vscode';
import * as path from 'path';
import {ApamaProject} from './apamaProject';

export class BundleItem extends vscode.TreeItem {
	constructor(public readonly projectPath: string, public project : ApamaProject) {
		super(projectPath, vscode.TreeItemCollapsibleState.None);
		this.label = path.basename(this.projectPath);
		this.dirname = path.dirname(this.projectPath);
	}
	contextValue: string = 'bundle';
	label: string = '';
	dirname: string = '';
	ext: string = '';
	get command(): vscode.Command {
		return {
			command: 'extension.apamaProjects.SelectItem',
			title: '',
			arguments: [this.projectPath]
		};
	}
	close(): void {
		(async () => {
			await console.log(this.projectPath);
			//vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		})();
	}
}
