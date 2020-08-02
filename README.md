# aMi: alternative Matlab ide

## What this extension is about

The "alternative Matlab ide" aims at providing a full fledged Matlab user
experience directly from VSCode.

This extension is a work in progress and features will be added as described in
the Feature section bellow.

This extension is intended for Linux users (so most should work on MacOS).

**Current version 0.5.1**.

## What this extension is not about

... though it might be if it comes for free ...

There is no intent to provide integration for toolboxes, application packaging
or Simulink. These Matlab extensions are available through the Matlab
command window.

There is no immediate intent to provide compatibility to Windows... not that I
want to preclude from using Windows, but I just don't own one...

## Usage

### To start Matlab

* Open the command palette using `Ctrl+Shift+P`
* Type `aMi: Start Matlab` in the command palette

### To use Matlab

* Use the command window as usual
* Start scripts from either the file editor or file explorer using right click
  and then selecting `Run Matlab file`
* Execute selected code in the file editor using right click and then selecting
  `Run selection in Matlab command window`

### To stop Matlab

* Open the command palette using `Ctrl+Shift+P`
* Type `aMi: Stop Matlab` in the command palette

### To start interactive debugging

* Open the command palette using `Ctrl+Shift+P`
* Type `aMi: Start debug adaptor` in the command palette

### To stop interactive debugging

* Use the stop button (red square) in the debug command widget.

## Features

### Basics (Version 0)

There is no intent to provide syntax higlighting or linter in version 0. Other
extensions can be used for this ([Gimly81.matlab](https://marketplace.visualstudio.com/items?itemName=Gimly81.matlab)
for instance).

#### Integrated Matlab command window (Version 0.0)

Provide Matlab command window in a terminal.

#### Run script files (Version 0.1)

Run .m file from editors or from the file explorer window.

#### Run selected code (Version 0.2)

Run current selection in the integrated command window.

#### Add / remove breakpoints (Version 0.3)

Add remove breakpoints from editors (Matlab functions and scripts only).

#### Pause on error / warning (Version 0.4)

Debug mode catches error and warning and pauses execution to allow debugging.

#### Workspace explorer (Version 0.5)

Explore the current workspace variables. Go up and down the execution stack
when debugging.

#### OS agnostic terminal (Version 0.6)

Works "out of the box" with Windows, MacOS and Linux. Matlab editor by-passed.

#### Workspace editor (Version 0.7)

Edit values from the workspace explorer.

#### Profile explorer (Version 0.8)

Drill down profiler results.

### Advanced editing (Version 1)

#### Command window auto completion (Version 1.0)

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

Matlab Engine API for Python (min 3.6) must be installed (follow these
[instructions](https://www.mathworks.com/help/matlab/matlab_external/install-the-matlab-engine-for-python.html)).

## Extension Settings

None for now.

## Release Notes Version 0.5.1

* When debug adaptor is started, variables of the selected stack workspace are
now displayed in the variables tab of the debug pane.
* For release 0.5.1 arrays and cell arrays exploration support has been added.
Structure and object support will be added in next release.

## Known Issues

### Major

* Some error messages in the command window are printed incorrectly.
* Debugging files not in path (run file in place) does not work. Workaround is
to add them to the path.
* Exception and warning catching can only be treated as an otherwise standard
breakpoint. Error informations are only availble from the command window. There
will probably not be any fix for this as this is linked to what information
Matlab can programatically provide on the current debug state.

### Annoying

* Conda environments can preclude this extension to work properly. It will not
work for instance if you have installed a recent Anaconda (using now Python3.7)
and let the installer initialize your .bashrc file. To work this around, create
an environment compatible with this extension and start VSCode from that one.
* Command history is lost when VSCode is closed before using `aMi: Stop Matlab`
or terminating Matlab manualy from its command window (using `exit`).
* The debug stop button (red square) is misleading as it forces the debug
adaptor to shut down. If you want to stop debugging and return to the command
window, use debug restart button instead (green rotating arrow). If you stop
the debug adaptor by mistake, just restarting it should restore previous state.
Note: there will be no fix to this as this is the behaviour enforced by the
debug protocol.
* First undefined variable or function error in the command window catches
Matlab internal errors if `Caught Errors` option is set.
* Altering the class of the content of a cell (in a cell array) can break
VSCode variable explorer if that cell is displayed when the change is done.
Workaround is to stop and restart the debug adaptor.

### Minor

* Breakpoints remain set after the debug addaptor has been shut down (not sure
yet if this is an issue or desirable feature - feedback welcome). To clear all
breakpoints: re start debug adaptor and remove all breakpoints, or
alternatively enter `dbclear all` in the Matlab command window.
* Shared session of Matlab can not be stopped cleanly from the Python API. The
error raised at exit is simply ignored.
