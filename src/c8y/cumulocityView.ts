import * as vscode from 'vscode';
import { ApamaEnvironment } from '../apama_util/apamaenvironment';
import {Client, BasicAuth} from '@c8y/client';
import requestPromise = require('request-promise-native');
import * as fs from 'fs';



export class EPLApplication extends vscode.TreeItem {
	//"{"eplfiles":[{"id":"713","name":"Testjbh","state":"inactive","errors":[],"warnings":[],"description":"This is a test"},{"id":"715","name":"jbh1","state":"active","errors":[],"warnings":[],"description":"jbh desc"},{"id":"719","name":"thisIsATest","state":"active","errors":[],"warnings":[],"description":"This is a test monitor uploaded from VS Code"}]}"
	constructor(
		public readonly id:string, 
		public readonly label: string, 
		public readonly active:boolean,
		public readonly warnings:string[], 
		public readonly errors:string[],
		public readonly desc:string) 
	{
		//{"id":"713","name":"Testjbh","state":"inactive","errors":[],"warnings":[],"description":"This is a test"}
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}
	contextValue: string = 'EPLApplication';
}


export class CumulocityView implements vscode.TreeDataProvider<EPLApplication> {
	private _onDidChangeTreeData: vscode.EventEmitter<EPLApplication | undefined> = new vscode.EventEmitter<EPLApplication | undefined>();
	readonly onDidChangeTreeData: vscode.Event<EPLApplication | undefined> = this._onDidChangeTreeData.event;

	private treeView: vscode.TreeView<{}>;
	private filelist:EPLApplication[] = [];

	//
	// Added facilities for multiple workspaces - this will hopefully allow 
	// ssh remote etc to work better later on, plus allows some extra organisational
	// facilities....
	constructor(private apamaEnv: ApamaEnvironment, private logger: vscode.OutputChannel, private context?: vscode.ExtensionContext) {
		let subscriptions: vscode.Disposable[] = [];
		
		//project commands 
		this.registerCommands();

		//the component
		this.treeView = vscode.window.createTreeView('c8y', { treeDataProvider: this });
	}
	processResponse(resp: any): void {
		this.logger.appendLine("Status:" + resp.res.status + " " + resp.res.statusText);
	}

	processError(resp:any): void {
		if('res' in resp){
			this.logger.appendLine("Status:" + resp.res.status + " " + resp.res.statusText);
		} else {
			this.logger.appendLine("Status: Error " + resp.message);
		}
	}

	registerCommands(): void {
		if (this.context !== undefined) {
			this.context.subscriptions.push.apply(this.context.subscriptions, [

				//
				// inventory using sdk
				//
				vscode.commands.registerCommand('extension.c8y.login', async () => {
					let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8y');

					if( config ) {
						let tenant:string = config.get('tenant',"");
						let user:string = config.get('user',"");
						let password:string = config.get('password',"");
						let baseurl:any = config.get('url',"");
						this.logger.appendLine("Logging into c8y");

						let x = new BasicAuth({
							tenant,
							user,
							password
						});

						let client = new Client(x,baseurl);

						try {
							let y = await client.inventory.list();
							let z = y.data;
						}
						catch (err) {
							debugger;
						}
							
					}
				}),
				
				vscode.commands.registerCommand('extension.c8y.upload_epl_app', async (uri) => {
					try {
						let appname = uri.path;
						const lastPathSepIndex = appname.lastIndexOf('/');
						if (lastPathSepIndex >= 0) {
							appname = appname.slice(lastPathSepIndex + 1);
						}

						if (appname.endsWith(".mon")) {
							appname = appname.slice(0, -4);
						}

						let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8y');
						let url: string = config.get('url',""); // C8Y host
						if (!url.endsWith("/")) {
							url += "/";
						}
						url += "service/cep/eplfiles";
						const options = {
							auth: {
								user: config.get("user", ""),
								pass: config.get("password", "")
							},
							body: {
								name: appname,
								contents: "",
								state: "active",
								description: "Uploaded from VS Code"
							},
							json: true
						}
						options.body.contents = fs.readFileSync(uri.fsPath).toString();
						const result = await requestPromise.post(url, options);
						if (result.state === "inactive") {
							let message = '';
							for (let i = 0; i < result.errors.length ; i++) {
								const error = result.errors[i]; // line text
								message += "\t[" + error.line + "] " + error.text + "\n";
							}
							vscode.window.showErrorMessage("Uploaded EPL contains errors: " + uri.path +":\n" + message);
						}
						// console.log(JSON.stringify(result));
						// TODO: show errors/warnings
					} catch (error) {
						vscode.window.showErrorMessage("Error uploading " + uri.path +":\n" + error.error.message);
					}
				}),

				//
				// refresh projects
				//
				vscode.commands.registerCommand('extension.c8y.refresh', async () => {
					await this.refresh();
				})
			]);
		}
	}

	//
	// Trigger refresh of the tree
	//
	async refresh(): Promise<void> {
		this.filelist = [];
		try {
			let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('softwareag.c8y');
			let url: string = config.get('url',"") + "service/cep/eplfiles";
			const options = {
				auth: {
					user: config.get("user", ""),
					pass: config.get("password", "")
				}
			};
			const result = await requestPromise.get(url, options);
			const eplfiles = JSON.parse(result);
			//"{"eplfiles":[{"id":"713","name":"Testjbh","state":"inactive","errors":[],"warnings":[],"description":"This is a test"},{"id":"715","name":"jbh1","state":"active","errors":[],"warnings":[],"description":"jbh desc"},{"id":"719","name":"thisIsATest","state":"active","errors":[],"warnings":[],"description":"This is a test monitor uploaded from VS Code"}]}"
			for (let element of eplfiles.eplfiles) {
				this.filelist.push(new EPLApplication(element.id,element.name, (element.state === 'inactive'),element.warnings,element.errors,element.desc));
			}

		} catch (error) {
			debugger;
		}
		this._onDidChangeTreeData.fire();
	}

	//
	// get the children of the current item (group or item)
	// made this async so we can avoid race conditions on updates
	//
	async getChildren(item?: EPLApplication | undefined): Promise<undefined | EPLApplication[] > {
		await this.refresh();
		return this.filelist;
	}



	//
	// interface requirement
	//
	getTreeItem(element: EPLApplication | string): vscode.TreeItem {

		//No string nodes in my tree so should never happen
		if (typeof element === "string") {
			this.logger.appendLine("ERROR ???? getTreeItem -- " + element.toString());
			return new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
		}

		//should just be the element clicked on
		return <vscode.TreeItem>element;
	}
}
