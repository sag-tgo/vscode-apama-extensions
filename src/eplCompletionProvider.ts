import * as vscode from "vscode";
import * as Lang from "./languageItem";
//
// Stage 1 simple completion from references in the current file
// Stage 1.5 - remove duplicates and filter based on current typing
// stage 2 refs from workspace files
// Stage 3 refs from "included" files?
//

function getItem(
  symbol: string,
  type: string,
  filename: string,
  symbolKind: vscode.CompletionItemKind
) {
  let compItem = Lang.workspaceLanguageDataMap.get(symbol);
  if (!compItem) {
    //automatically adds itself to list.
    let temp = new Lang.CompletionLanguageItem(
      symbol,
      type,
      filename,
      symbolKind
    );
    return temp.getCompletionItem();
  }
  return compItem.getCompletionItem();
}

function extractItems(
  partial: string,
  document: vscode.TextDocument,
  regex: RegExp,
  symbolKind: vscode.CompletionItemKind,
  currentItems: { rVal: vscode.CompletionItem[] }
) {
  //dictionary of symbol to type
  let doc = document.getText();
  let eventMatches = doc.match(regex);
  if (eventMatches) {
    for (let m in eventMatches) {
      //expecting 2 capture groups that will be the extracted symbol.
      let theMatch = eventMatches[m];
      let type = theMatch.replace(regex, "$1");
      let symbol = theMatch.replace(regex, "$2");
      //is it already cached
      //could be what we want
      if (symbol.includes(partial)) {
        //not in the return array
        if (!currentItems.rVal.findIndex(x => x.label === symbol)) {
          currentItems.rVal.push(getItem(symbol,type,document.fileName,symbolKind));
        }
      }
    }
  }
  return;
}

export class EPLCompletionItemProvider
  implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Thenable<vscode.CompletionItem[]> {
    let partial = "";
    let partialRange = document.getWordRangeAtPosition(position);
    if (partialRange) {
      partial = document.getText(partialRange);
    }

    //The capture group will be the replacement for the whole match (I.E. the identifier)
    let eventRegex = /\s*(event)\s*([_A-Za-z][_A-Za-z0-9]*)?\s*\{/g;
    let theList: { rVal: vscode.CompletionItem[] } = { rVal: [] };
    extractItems(
      partial,
      document,
      eventRegex,
      vscode.CompletionItemKind.Class,
      theList
    );

    let actionRegex = /\s*(action)\s*([_A-Za-z][_A-Za-z0-9]*)?\s*\(/g;
    extractItems(
      partial,
      document,
      actionRegex,
      vscode.CompletionItemKind.Function,
      theList
    );

    let varRegex = /\s*(integer|float|string|boolean)\s*([_A-Za-z][_A-Za-z0-9]*)?\s*\;/g;
    extractItems(
      partial,
      document,
      varRegex,
      vscode.CompletionItemKind.Variable,
      theList
    );

    return new Promise<vscode.CompletionItem[]>((resolve, reject) => {
      resolve(theList.rVal);
    });
  }
}
