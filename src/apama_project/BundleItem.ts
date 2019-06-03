import * as path from 'path';
import {ApamaProject} from './apamaProject';
import { OutputChannel, TreeItemCollapsibleState, TreeItem, Command } from 'vscode';

export class BundleItem extends TreeItem {
	constructor(public readonly projectPath: string, public project : ApamaProject) {
		super(projectPath, TreeItemCollapsibleState.None);
		this.label = path.basename(this.projectPath);
		this.dirname = path.dirname(this.projectPath);
	}
	contextValue: string = 'bundle';
	label: string = '';
	dirname: string = '';
	ext: string = '';
	get command(): Command {
		return {
			command: 'extension.apamaProjects.SelectItem',
			title: '',
			arguments: [this.projectPath]
		};
	}
	close(): void {
		(async () => {
			await console.log(this.projectPath);
			//commands.executeCommand('workbench.action.closeActiveEditor');
		})();
	}
}
