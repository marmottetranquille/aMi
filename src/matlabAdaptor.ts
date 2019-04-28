import * as pyshell from 'python-shell';
import * as events from 'events';
import { DebugProtocol } from 'vscode-debugprotocol';
import { emit } from 'cluster';
import { RelativePattern } from 'vscode';


type command =
    'connect' |
    'wait_startup' |
    'update_breakpoints' |
    'ping';

type adaptorResponse = {
    message_type: 'response' | 'error' | 'info',
    command: command,
    success: boolean,
    message: string,
    data: any
};

type adaptorCommand = {
    command: command
    args: {}
};

export type MatlabBreakpoint = {
    filepath: string,
    line: number,
    valid: boolean
};

export class MatlabRuntimeAdaptor extends events.EventEmitter  {

    private _pyshell?: pyshell.PythonShell;

    public start(
        sessionTag: string,
        inputLogFile: string,
        extensionFolder: string
    ) {
        this._pyshell = new pyshell.PythonShell(
            extensionFolder + '/interfaces/matlab_adaptor.py',
            { mode: 'json' },
        );
        this._pyshell.on(
            'message',
            (response) => {
                this.processResponse(response, this);
            }
        );
        this.connectMatlab(sessionTag, inputLogFile);
    }

    public processSetBreakpointsResponse(
        success: boolean,
        matlabBreakpoints: MatlabBreakpoint[]
    ) {
        let response = {} as DebugProtocol.SetBreakpointsResponse;
        let breakpoints: DebugProtocol.Breakpoint[] = Array();

        matlabBreakpoints.forEach(
            (matlabBreakpoint) => {
                breakpoints.push(
                    {
                        verified: matlabBreakpoint.valid
                    }
                );
            }
        );

        response.success = true;
        response.body.breakpoints = breakpoints;

        this.emit('setBreakpointsDone', response);
    }

    public processWaitStartupResponse(success: boolean) {
        let response = {} as DebugProtocol.LaunchResponse;
        if (!success) {
            response.success = false;
        }
        else {
            response.success = true;
        }
        this.emit('startupDone', response);
    }

    public processConnectResponse(success: boolean) {
        if (this._pyshell === undefined) {
            console.error('Python shell has not been started yet.');
        }
        else {
            if (!success) {
                console.error('Could not connect to Matlab.');
            }
            else {
                this._pyshell.send(
                    {
                        command: 'wait_startup',
                        args: {}
                    } as adaptorCommand
                );
            }
        }
    }

    private processResponse(
        response: adaptorResponse,
        me: MatlabRuntimeAdaptor
    ) {
        switch (response.message_type) {
            case 'error':
                console.error(response);
                break;
            case 'info':
                console.log(response);
                break;
            case 'response':
                console.log(response);
                switch (response.command) {
                    case 'connect':
                        me.processConnectResponse(response.success);
                        break;
                    case 'wait_startup':
                        me.processWaitStartupResponse(response.success);
                        break;
                    case 'update_breakpoints':
                        me.processSetBreakpointsResponse(
                            response.success,
                            response.data
                        );
                        break;
                }
        }
    }

    public connectMatlab(
        sessionTag: string,
        inputLogFile: string
    ) {

        if (this._pyshell !== undefined) {
            this._pyshell.send(
                {
                    command: 'connect',
                    args: {
                        session_tag: sessionTag,
                        input_log_file: inputLogFile
                    }
                } as adaptorCommand
            );
        }
    }

    public updateBreakPoints(
        sourceFile: string,
        breakpoints: DebugProtocol.SourceBreakpoint[]
    ) {
        let matlabBreakPoints: MatlabBreakpoint[] = new Array();

        breakpoints.forEach(
            (breakpoint) => {
                matlabBreakPoints.push(
                    {
                        filepath: sourceFile,
                        line: breakpoint.line,
                        valid: false
                    }
                );
            }
        );
        
        if (this._pyshell !== undefined) {
            this._pyshell.send(
                {
                    command: 'update_breakpoints',
                    args: {
                        breakpoints: matlabBreakPoints
                    }
                } as adaptorCommand
            );
        }
    }
}