//
// I want a class that can hold elements we want to cache 
// for example if I have completion items then I want to 
// store the relevent fields of that element, similarly for 
// locations in files. To aid update of the structure 
// when the filesystem watcher triggers an update I want to 
// be able to skip things not touched so file names and 
// locations will be required. 
//
// regexes for location and potentially substitution 
//
// Additionally I am looking to keep hierarchical data so
// (for example) fields on an event can be contextually
// included or skipped in a list shown to the user. 
//
// strings are the main key here 
//
import * as vscode from "vscode";

//keywords and static information (doesn't change)
export const staticLanguageItems = require('../syntaxes/epl.default.json');

//Built cache of information : dictionary of events/fields , monitors/actions/parameters
//the idea is to add to structure incrementally using filesystem watcher/change callbacks
//https://code.visualstudio.com/docs/extensionAPI/vscode-api#_workspace 
//(watches for config, document and workspace changes which will promp rescanning potentially)
//ws.createFileSystemWatcher(globPattern: GlobPattern, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): FileSystemWatcher
export let workspaceLanguageDataMap: { [index: string]: CompletionLanguageItem; } = {};

//basic class for items. I think we might be able to reuse if we 
//use interfaces possibly or inherit from a base class and provide 
//ways to extract the Items required. WIP
export class CompletionLanguageItem 
{
    symbol: string;
    symbolType: string;
    filename: string;
    type: vscode.CompletionItemKind;
    //actual text of the Item (temporary while developing?)

    constructor( sym: string, symtype: string, fileName: string, t: vscode.CompletionItemKind) {
        this.symbol = sym;
        this.symbolType = symtype;
        this.filename = fileName;
        this.type = t;
        if(!( this.symbol in workspaceLanguageDataMap)){
            workspaceLanguageDataMap[this.symbol] = this;
        }
    }

    public getCompletionItem() : vscode.CompletionItem {
        return {
                label: this.symbol + ":" + this.symbolType,
                kind: this.type,
                documentation: this.symbolType + ' ' + this.symbol,
                insertText: this.symbol
        };
    }
}