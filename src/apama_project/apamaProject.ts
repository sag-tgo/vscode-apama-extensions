import { BundleItem } from './BundleItem';
import { OutputChannel, TreeItem, TreeItemCollapsibleState, Command } from 'vscode';

export class ApamaProject extends TreeItem {
	constructor(
		private logger:OutputChannel,
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly fspath: string,
    public readonly command?: Command
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
