import * as pyshell from 'python-shell';
import * as events from 'events';
import { DebugProtocol } from 'vscode-debugprotocol';
import { emit } from 'cluster';
import { RelativePattern } from 'vscode';
import { Response } from 'vscode-debugadapter';


type command =
    'connect' |
    'wait_startup' |
    'update_breakpoints' |
    'get_stack_frames' |
    'pause' |
    'continue' |
    'step' |
    'step_in' |
    'step_out' |
    'dbquit' |
    'input_event_emitter' |
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
    line: number,
    valid: boolean
};

export type MatlabBreakpoints = {
    file_path: string,
    breakpoints: MatlabBreakpoint[]
};

export class MatlabRuntimeAdaptor extends events.EventEmitter  {

    private _pyshell?: pyshell.PythonShell;

    constructor(
        sessionTag: string,
        extensionFolder: string,
        inputLogFile: string
    ) {
        super();
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

    public stop() {
        if (this._pyshell !== undefined) {
            this._pyshell.end(() => {});
        }
    }

    public processSetBreakpointsResponse(
        success: boolean,
        data: {
            breakpoints: MatlabBreakpoints,
            response: DebugProtocol.SetBreakpointsResponse
        }
    ) {
        let response = data.response;
        let matlabBreakpoints = data.breakpoints;
        let breakpoints: DebugProtocol.Breakpoint[] = Array();

        matlabBreakpoints.breakpoints.forEach(
            (matlabBreakpoint) => {
                breakpoints.push(
                    {
                        verified: matlabBreakpoint.valid
                    }
                );
            }
        );

        response.success = true;
        response.body = response.body || {};
        response.body.breakpoints = breakpoints;

        this.emit('setBreakpointsDone', response);
    }

    public processWaitStartupResponse(
        success: boolean
    ) {
        this.emit('startupDone', success);
    }

    public processConnectResponse(
        success: boolean
    ) {
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

    public processGetStackFramesResponse(
        success: boolean,
        data: {
            stackFrames: DebugProtocol.StackFrame[],
            response: DebugProtocol.StackTraceResponse
        }
    ) {
        let response = data.response;
        response.success = success;

        response.body = response.body || {};
        response.body.stackFrames = data.stackFrames;

        this.emit('stackTraceResponse', response);
    }

    public processInputEventResponse() {
        this.emit('inputEvent');
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
                        me.processConnectResponse(
                            response.success
                        );
                        break;
                    case 'wait_startup':
                        me.processWaitStartupResponse(
                            response.success
                        );
                        break;
                    case 'update_breakpoints':
                        me.processSetBreakpointsResponse(
                            response.success,
                            response.data
                        );
                        break;
                    case 'get_stack_frames':
                        me.processGetStackFramesResponse(
                            response.success,
                            response.data
                        );
                        break;
                    case 'input_event_emitter':
                        me.processInputEventResponse();
                        break;
                }
        }
    }

    public connectMatlab(
        sessionTag: string,
        inputLogFile: string,
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
        breakpoints: DebugProtocol.SourceBreakpoint[],
        response: DebugProtocol.SetBreakpointsResponse
    ) {
        let matlabBreakPoints: MatlabBreakpoints;
        matlabBreakPoints = {
            file_path: sourceFile,
            breakpoints: new Array<MatlabBreakpoint>()
        };

        console.log(sourceFile);
        console.log(breakpoints);

        breakpoints.forEach(
            (breakpoint) => {
                matlabBreakPoints.breakpoints.push(
                    {
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
                        breakpoints: matlabBreakPoints,
                        response: response
                    }
                } as adaptorCommand
            );
        }
    }

    public getStackTrace(
        response: DebugProtocol.StackTraceResponse
    ) {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'get_stack_frames',
                args: response
            } as adaptorCommand);
        }
    }

    public pause() {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'pause',
                args: {}
            } as adaptorCommand);
        }
    }

    public continue() {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'continue',
                args: {}
            } as adaptorCommand);
        }
    }

    public step() {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'step',
                args: {}
            } as adaptorCommand);
        }
    }

    public stepIn() {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'step_in',
                args: {}
            } as adaptorCommand);
        }
    }

    public stepOut() {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'step_out',
                args: {}
            } as adaptorCommand);
        }
    }

    public dbquit() {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'dbquit',
                args: {}
            } as adaptorCommand);
        }
    }

    public terminate() {
        if (this._pyshell !== undefined) {
            this._pyshell.end(() => { });
        }
    }
}