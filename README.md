# epl-syntax-highlighting README

This is a simple extention that adds syntax highlighting to EPL files. These files are the language used by Apama Streaming Analytics product to create applications (monitors and events) within the correlator component.

For mor information on EPL and Apama please visit the [Apama Community Edition website](http://www.apamacommunity.com/)

![example code](images/mainpage.PNG)

## Features

* Supporting EPL language from Apama 10.3 +
* Snippet support
* Basic Autocomplete support

## Requirements

There are no requirements for use of this extention currently.

## Extension Settings

* **apama.apamaHome** defines the Apama install directory that will be used by the Debug support.

## Known Issues

TBA

## Development

Users are welcome to make pull requests with fixes and enhancements but I reserve the right to control what and when goes into released versions of the extention.

Highlighting tokens can be based on the following:
<https://github.com/Microsoft/vscode/blob/1.8.0/src/vs/editor/browser/standalone/media/standalone-tokens.css>

so where we use **token.constant.language.epl** it will match with **token.constant.language** when defined in the loaded theme.

And Additionally rules taken from here :
<https://github.com/Microsoft/vscode/blob/master/extensions/java/syntaxes/java.tmLanguage.json>

## Release Notes

v0.1 - initial release, basic highlighting support and placeholder for command(s)
