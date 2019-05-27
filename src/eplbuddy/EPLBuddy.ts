import { spawn, ChildProcess } from 'child_process';
/**
 * Looks after the long-running 'eplbuddy' process that maintains the EPL model for a project, and provides read/write operations via a token-based protocol.
 */
export class EPLBuddy {
	private proc: ChildProcess | undefined;
	constructor() {
		this.proc = spawn("eplbuddy", []);
		this.proc.on('error' , error => this.proc = undefined );
	}
	/** Make a request to EPLBuddy. The response (as tokens) will be returned. */
	request(...toks: string[]): Promise<string[]> {
		//if no epl buddy 
		let buf = "";
		for (let i in toks) {
			let tok = toks[i];
			buf += "0".repeat(10 - (String(tok.length).length));
			buf += String(tok.length) + tok;
		}
		buf = buf + "#".repeat(10);
		let ret = new Promise<string[]>((resolve, request) => {
			if( this.proc !== undefined ) {
				this.proc.stdout.once("data", (toks: string) => {
					let ret = [];
					while (true) {
						let tok_sz = +(toks.slice(0, 10));
						if (tok_sz === 0){
							break;
						}
						ret.push(toks.slice(10, 10 + tok_sz));
						toks = toks.slice(10 + tok_sz);
					}
					resolve(ret);
				});
				this.proc.stdin.write(buf);
				this.proc.stdin.uncork();
			}
			else 
			{
				resolve([]);
			}
		});
		return ret;
	}
}
