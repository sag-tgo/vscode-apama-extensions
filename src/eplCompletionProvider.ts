
import * as vscode from 'vscode';

//
// Stage 1 simple completion from references in the current file
// stage 2 refs from workspace files 
// Stage 3 refs from "included" files?
//

function extractItems(document: vscode.TextDocument , regex: RegExp , symbolKind: vscode.CompletionItemKind) : vscode.CompletionItem[]
{
    let rVal = [];
    let doc = document.getText();
    let eventMatches = doc.match(regex) ;
    if( eventMatches)
    {
        for(let m in eventMatches)
        {
            //expecting 1 capture group that will be the extracted symbol.
            let current = eventMatches[m].replace(regex,"$1");
            console.log(current);
            rVal.push(
                {
                    label: current,
                    kind: symbolKind,
                    documentation: "type " + current,
                    insertText: current
                }
            );
        }
    }
    return rVal;
}


export class EPLCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, 
        position: vscode.Position, token: vscode.CancellationToken):Thenable<vscode.CompletionItem[]> 
    {
        //The capture group will be the replacement for the whole match (I.E. the identifier)
        let eventRegex = /\s*event\s*([_A-Za-z][_A-Za-z0-9]*)?\s*\{/g;
        let theList = extractItems(document, eventRegex, vscode.CompletionItemKind.Class);
        let actionRegex = /\s*action\s*([_A-Za-z][_A-Za-z0-9]*)?\s*\(/g;
        theList = theList.concat( extractItems(document, actionRegex, vscode.CompletionItemKind.Function) );
        //let varRegex = /\s*[integer|float|string|boolean]\s*([_A-Za-z][_A-Za-z0-9]*)?\s*\;/g;
        //theList = theList.concat( extractItems(document, varRegex, vscode.CompletionItemKind.Variable) );
        return new Promise<vscode.CompletionItem[]>( (resolve,reject) => { resolve(theList); });
    }
}

