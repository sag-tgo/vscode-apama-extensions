# epl-syntax-highlighting README

This is a simple extention that adds syntax highlighting to EPL files. These files are the language used by Apama Streaming Analytics product to create applications (monitors and events) within the correlator component.

For mor information on EPL and Apama please visit the [Apama Community Edition website](http://www.apamacommunity.com/)

## Features

* Supports EPL language from Apama 10.5.3 +
* Support for debugging and launching pure EPL in a correlator. 
* Supports apama_project

![example code](images/mainpage.PNG)

##Snippets
![Snippets](images/1-snippets.gif)

##Correlator Task
![Snippets](images/2-run-corr.gif)

##Send Event
![Snippets](images/3-send-single-evt.gif)

##Send Multiple Events
![Snippets](images/4-send-multiple-evt.gif)

## Requirements

There are no requirements for use of this extention currently.

## Extension Settings

No settings currently.

## Known Issues

TBA

## Development

Users are welcome to make pull requests with fixes and enhancements but I reserve the right to control what and when goes into released versions of the extention.

The syntax highlighting is being adapted from a Javascript syntax file and is being cleaned up and enhanced iteratively. I will eventually have a complete JSON based syntax file for EPL at which point I will probably publish it separately for others to use in the various editors that use the Texmate format. (N.B vscode does have some quirks which will need translating)

## Release Notes

v0.7 - Better syntax highlighting, Snippets, Apama EPL debugging 
v0.1 - initial release, basic highlighting support and placeholder for command(s)
