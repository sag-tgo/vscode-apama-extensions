'use strict';

//
// Originating from a tutorial - we need to add in the comms to EPL buddy  
//

import {
  IPCMessageReader, IPCMessageWriter,
  createConnection, IConnection, TextDocuments, TextDocument, InitializeResult, TextDocumentPositionParams,
  CompletionItem, CompletionItemKind} from 'vscode-languageserver';

import { validateYamlConfig } from './yamlValidation/validateYamlConfig';
import { EPLBuddy } from './eplbuddy/EPLBuddy';
import { validateEplDocument } from './eplbuddy/validateEplDocument';

// Create a connection for the server. The connection uses Node's IPC as a transport
export let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Listen on the connection
connection.listen();

//this is a change

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);


// The settings interface describe the server relevant settings part
interface Settings {
  eplLanguageServer: EplSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface EplSettings {
  maxNumberOfProblems: number;
}


// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
export let eplbuddy = new EPLBuddy();


// here we will need to build a list of stuff we could complete with
//let ... : Array<string> ....
// hold a list of colors and shapes for the completion provider
//let colors: Array<string>;
//let shapes: Array<string>;

connection.onInitialize((): InitializeResult => {

  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: documents.syncKind,
            // Tell the client that the server support code complete
            // completionProvider: {
            //   resolveProvider: true,
            //   "triggerCharacters": ['=',"."]
            // },
            // hoverProvider: false
    }
  };
});

// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
  let settings = <Settings>change.settings;
  maxNumberOfProblems = settings.eplLanguageServer.maxNumberOfProblems || 100;
  // Revalidate any open text documents
  documents.all().forEach(validateEplDocument);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  console.log(change.document.languageId);
  if( change.document.languageId === 'epl')
  {
    validateEplDocument(change.document);
  }  else {
    validateYamlConfig( change.document );
  }
});

//let names: Array<any>;



connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): Promise<Array<CompletionItem> >  => {
  if ( maxNumberOfProblems <= 0 ) {
    console.log("hello");
  }
	return new Promise<Array<CompletionItem> >((resolve) => {
		let textDoc: TextDocument | undefined = documents.get(textDocumentPosition.textDocument.uri);

		if (textDoc !== undefined) {
			let text: string = textDoc.getText();
			let lines = text.split(/\r?\n/g);
			let position = textDocumentPosition.position;

			let currentContext = lines[position.line].trim();
			if(currentContext.length === 0) {
				lines[position.line] = "!CONTENTASSIST! 0 !CONTENTASSIST!";
				text = lines.join("\r\n");
				eplbuddy.request("CONTENTASSIST", textDoc.uri, text).then(response => {
					let results = new Array<CompletionItem>();
					for(let i = 3; i < response.length; i = i + 2) {
						results.push({
							label: response[i + 1].toString(),
							kind: CompletionItemKind.Text,
							data: response[i + 1].toString(),
						});
					}
					resolve(results);
				});
			}
			if(currentContext.length > 0 && currentContext[currentContext.length-1] === ".") {
				lines[position.line] = "!CONTENTASSIST! " + currentContext.slice(0, currentContext.length-1) + " !CONTENTASSIST!";
				text = lines.join("\r\n");
				eplbuddy.request("CONTENTASSIST", textDoc.uri, text).then(response => {
					eplbuddy.request("FIELDLIST", response[2]).then(response => {
						let results = new Array<CompletionItem>();
						for(let i = 1; i < response.length; i = i + 2) {
							results.push({
								label: response[i].toString(),
								kind: CompletionItemKind.Text,
								data: response[i].toString(),
							});
						}
						resolve(results);
					});
				});
			}
		}
	});
});

// connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
//   if (item.data.startsWith("Completion")) {
//     item.detail = 'Example 1';
//     item.documentation = 'http://www.graphviz.org/doc/info/colors.html';
//   }

//   if (item.data.startsWith('Item')) {
//     item.detail = 'Example 2';
//     item.documentation = 'http://www.graphviz.org/doc/info/shapes.html';
//   }

//   return item;
// });

// connection.onHover(({ position }): Hover | undefined => {
//   if( names !== undefined ){
//     for (var i = 0; i < names.length; i++) {
//       if (names[i].line === position.line
//         && (names[i].start <= position.character && names[i].end >= position.character)) {
//         // we return an answer only if we find something
//         // otherwise no hover information is given
//         return {
//           contents: names[i].text
//         };
//       }
//     }
//   }
//   //disabled example hover because I want to see validation errors shown.
//   //return {
//   //  contents: "Example Hover"
//   //};
// });



