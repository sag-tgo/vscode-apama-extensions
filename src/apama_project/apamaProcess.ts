import { OutputChannel, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { ApamaRunner, ApamaAsyncRunner } from '../apama_util/apamarunner';



export interface IApamaProcessItem {
	logger:OutputChannel;
	label: string;
	host: string;
	port: number;
	items: IApamaProcessItem[];
	contextValue: string;
	apama_process: ApamaRunner|ApamaAsyncRunner;
}

export class ApamaProcessItem extends TreeItem implements IApamaProcessItem {

	constructor(
		public logger:OutputChannel,
		public readonly label: string,
    public readonly host: string,
    public readonly port: number,
		public apama_process: ApamaRunner|ApamaAsyncRunner
    ) {
		super(label, TreeItemCollapsibleState.Collapsed);
	}

	items: ApamaProcessItem[] = [];
  contextValue: string = 'correlator';
}


