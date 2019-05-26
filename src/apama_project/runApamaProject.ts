import { exec } from 'child_process';
export function runApamaProject(command: string, workingDir: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		console.count("Running - " + command + " in " + workingDir );
		exec(command, { cwd: workingDir }, (err: any, stdout: any, stderr: any) => {
			let addedBundles: string[] = [];
			if (err) {
				// node couldn't execute the command
				addedBundles.push(err);
				reject(addedBundles);
				return;
			}
			//whole output is a list of bundles we can add :
			//console.log( stdout );
			let lines: string[] = stdout.split(/\r?\n/);
			for (let index = 0; index < lines.length; index++) {
				const element = lines[index];
				addedBundles.push(element.trim());
			}
			// the *entire* stdout and stderr (buffered)
			resolve(addedBundles);
		});
	});
}
