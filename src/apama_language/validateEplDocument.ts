import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { eplbuddy, connection } from '../server';


export async function validateEplDocument(textDocument: TextDocument): Promise<void> {
	let diagnostics: Diagnostic[] = [];
	try {
		await eplbuddy.request("DEL", textDocument.uri);
		await eplbuddy.request("MON", textDocument.uri, textDocument.getText());
		await eplbuddy.request("BUILD");	
		let badness = await eplbuddy.request("BADNESS", textDocument.uri);
		let i = 0;
		while (i < badness.length) {
			let line = +badness[i + 1];
			let message = badness[i + 2];
			let severity: DiagnosticSeverity = 1;
			if (badness[i] === "ERROR") {
				severity = DiagnosticSeverity.Error;
			}
			if (badness[i] === "WARN") {
				severity = DiagnosticSeverity.Information;
			}
			diagnostics.push({
				severity: severity,
				range: {
					start: { line: line - 1, character: 0 },
					end: { line: line - 1, character: Number.MAX_VALUE }
				},
				message: message.toString(),
			});
			i = i + 3;
		}
	}
	catch(error) {
		//console.debug(error);
	}
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
