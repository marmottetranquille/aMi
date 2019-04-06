# aMi: alternative Matlab ide

## What this extension is about

The "alternative Matlab ide" aims at providing a full fledged Matlab user
experience directly from VSCode.

This extension is a work in progress and features will be added as described in
the Feature section bellow.

This extension is intended for Linux users (so most should work on MacOS).

Current version 0.1.0.

## What this extension is not about

... though it might be if it comes for free ...

There is no intent to provide integration for toolboxes, application packaging
or Simulink. These Matlab extensions are available through the Matlab
command window.

There is no intent to provide compatibility to Windows... not that I want to
preclude from using Windows, but I just don't own one...

## Usage

### To start Matlab

* Open the command palette using `Ctrl+Shift+P`
* Type `aMi: Start Matlab` in the command palette

### To use Matlab

* Use the command window as usual
* Start scripts from either the file editor or file explorer using right click
  and then selection `Run Matlab file`

### To stop Matlab

* Open the command palette using `Ctrl+Shift+P`
* Type `aMi: Start Matlab` in the command palette

## Features

### Basics (Version 0)

There is no intent to provide syntax higlighting or linter in version 0. Other
extensions can be used for this ([Gimly81.matlab](https://marketplace.visualstudio.com/items?itemName=Gimly81.matlab)
for instance).

#### Integrated Matlab command window (Version 0.0)

Provide Matlab command window in a terminal.

#### Run script files (Version 0.1)

Run current file in the integrated command window.

#### Run selected code (Version 0.2)

Run current selection in the integrated command window.

#### Add / remove breakpoints (Version 0.3)

Add remove breakpoints from editors (Matlab functions and scripts only).

#### Pause on error / warning (Version 0.4)

Debug mode catches error and warning and pauses execution to allow debugging.

#### Workspace explorer (Version 0.5)

Explore the current workspace variables.

#### Workspace editor (Version 0.6)

Edit values from the workspace explorer.

#### Execution Stack explorer (Version 0.7)

Go up and down the execution stack when debugging.

#### Profile explorer (Version 0.8)

Drill down profiler results.

### Advanced editing (Version 1)

#### Edit command opens file in VSCode (Version 1.0)

Matlab editor is by-passed so you can work only in VSCode like environment.

#### Command window auto completion (Version 1.1)

Auto completion hints straight from the command window.

#### Integrated syntax highlighter (Version 1.2)

Stand alone syntax highlighter based on in situ Matlab installation.

#### Integrated linter (Version 1.3)

Stand alone linter based on situ Matlab installation.

#### Run current cell (Version 1.4)

Run cells in the current command window.

## Requirements

Matlab must be installed on your computer and configured so that `matlab`
command starts it. This extension is built and tested using Matlab R2019a.
Backward compatibility is not granted though it should work smoothly as of
R2014b.

Matlab Engine API for Python must be installed (follow these
[instructions](https://www.mathworks.com/help/matlab/matlab_external/install-the-matlab-engine-for-python.html)).

## Extension Settings

None for now.

## Known Issues

* Shared session of Matlab can not be stopped cleanly from the Python API. The
  error raised at exit is simply ignored.
* Command history is lost when VSCode is closed before using `aMi: Stop Matlab`
or terminating Matlab manualy from its command window (using `exit`).

## Release Notes
