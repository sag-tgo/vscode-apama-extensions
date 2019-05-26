import { BundleItem } from './BundleItem';
import * as vscode from 'vscode';

export class ApamaProject extends vscode.TreeItem {
	constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fspath: string,
    public readonly command?: vscode.Command
    ) {
		super(label, collapsibleState);
	}
	items: BundleItem[] = [];
  contextValue: string = 'project';

  //not needed but leaving for possible use later
	close(): void {
		for (let item of this.items) {
			item.close();
		}
	}
}
