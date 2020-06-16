# epl-syntax-highlighting README

This is a simple extention that adds syntax highlighting to EPL files. These files are the language used by Apama Streaming Analytics product to create applications (monitors and events) within the correlator component.

For mor information on EPL and Apama please visit the [Apama Community Edition website](http://www.apamacommunity.com/)

## Features

* Enables features for correct versions of Apama.
* Supports EPL language diagnostics from Apama 10.5.3+
* Support for debugging and launching pure single and multi file EPL applications in a correlator.
* Supports apama_project.
* Apama based settings for current and upcoming changes live.

## limitations

* Debug of deployed projects only.
* Diagnostics are limited to EPL files currently (imported packages may not work).
* Completion is currently only snippet and history based.

## Theme based syntax highlighting

Based on the theme you choose the EPL code will be highlighted and easier to read than plain text files. This has been the case since the beginning of this extension, but it is more complete now and won't change significantly from here onward.

![example code](images/mainpage.PNG)

## Settings

There are various setting enabled for the extention now. All the Apama configuration entries are prefixed 'SoftwareAG.Apama' searching for 'Apama' will show all of them.

* ApamaHome contains the path to the installation directory of the version you wish to use.
* DebugHost is the default host for a correlator started for debug (allowing remote instance).
* DebugPort is the default port for a correlator started for debug.
* LangserverType is a dropdown that controls the LSP for vscode, it can be local (starts and attaches), remote (attaches) or disabled.
  * Langserver.Host is the host that vscode should connect to the Langserver on.
  * Langserver.Port is the port the langserver is running on.
  * Langserver.MaxErrors is the max diagnostics that should be returned by the LSP (INACTIVE)

There are also some placeholders for using EPL with Cumulocity. these will become active in a later release (>v1.0).

![settings](images/settings.png)

## diagnostics

If you have enabled the Language Server and are using Apama full version 10.5.3+ then you will have access to live diagnostics. These diagnostics are limited to the file being edited currently but will become more fully featured as future releases are produced. Specifically if you write EPL that uses external bundles or code the diagnostics may not take these into account.

![tasks](images/11-diagnostics.gif)

## Snippets

There are various snippets defined in the extension to make writing code easier.

![Snippets](images/1-snippets.gif)

## Correlator Task, inject monitor and send event

Tasks can be created for running correlators on specific ports, the commands to inject EPL and send events also support these ports. Additionally there are tasks for engine_watch and engine_recieve that can also be set up. In future releases there will be a more coherent interface for this allowing a suite of tasks to be set up in one operation.

The animation below shows the default operation of the tasks.

![correlator](images/2-runcorr-inject.gif)

## Send Event file

Once you have a correlator running some EPL you can inject event files with a right click.

![events](images/3-evtfile-send.gif)

## Create Tasks

The animation below shows how to create a non default tasks (allowing multiple correlators on different ports for example).

![tasks](images/5-tasks-create.gif)

## Create Project

apama_project can be used to create projects which are compatible with designer, and will also allow you to edit designer created projects in vscode.

![project support](images/4-project-create.gif)

## Add bundles

You can add Bundles and instances to the project using the UI.

![tasks](images/6-project-addbundle.gif)

## Remove bundles

You can remove Bundles and instances to the project using the UI.

![tasks](images/7-project-rmbundle.gif)

## Deploy project

You can deploy the project using the UI and then run that project in a correlator. N.B. currently you may need to create or move a configuration file into the root of the deployed directory.

![tasks](images/8-project-deploy.gif)

## Add breakpoints

You can add breakpoints to the code for debugging. These are limited to line based breaks currently.

![tasks](images/9-set-breakpoints.gif)

## debug

Debugging the application also follows the standard vscode patterns.

![tasks](images/10-debug.gif)

## Requirements

To use the diagnostics you must have version 10.5.3+ installed.

## Known Issues

There are a number of issues that will be fixed, but please do raise issues in <https://github.com/CaribouJohn/vscode-apama-extensions/issues> if you come accross things. I am very open to pull requests to fix things also :)

## Development

Users are welcome to make pull requests with fixes and enhancements but I reserve the right to control what and when goes into released versions of the extention.

## Release Notes

## v1.0.1

* Finished syntax highlighting.
* Documentation.
* Apama EPL diagnostics.
* Apama project integration.
* fixed small bug when starting the Language Server.

v0.7 - Better syntax highlighting, Snippets, Apama EPL debugging
v0.1 - initial release, basic highlighting support and placeholder for command(s)
