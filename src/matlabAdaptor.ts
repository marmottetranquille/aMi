import * as pyshell from 'python-shell';
import * as events from 'events';
import { DebugProtocol } from 'vscode-debugprotocol';
import * as DebugAdapter from 'vscode-debugadapter';


type command =
    'connect' |
    'wait_startup' |
    'update_breakpoints' |
    'update_exception_breakpoints' |
    'get_stack_frames' |
    'get_scopes' |
    'get_variables' |
    'get_exception_info' |
    'pause' |
    'continue' |
    'step' |
    'step_in' |
    'step_out' |
    'dbquit' |
    'input_event_emitter' |
    'ping' |
    'terminate';

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

    public processScopesResponse(
        success: boolean,
        data: {
            response: DebugProtocol.ScopesResponse,
            scopes: [{name: string}]
        }
    ) {
        data.response.body = data.response.body || {};
        data.response.body.scopes = new Array<DebugAdapter.Scope>();

        let scopeReferences: { [scope: string]: number };
        scopeReferences = { local: 0.1, caller: 0.2, global: 0.3 };

        data.scopes.forEach(
            (scope) => {
                data.response.body.scopes.push(
                    new DebugAdapter.Scope(
                        scope.name,
                        scopeReferences[scope.name]
                    )
                );
            }
        );

        this.emit('scopesResponse', data.response);
    }

    public processVariablesResponse(
        success: boolean,
        data: {
            response: DebugProtocol.VariablesResponse,
            variables: Array<DebugProtocol.Variable>
        }
    ) {
        let response = data.response;
        response.body = {
            variables: data.variables
        };

        console.log(response)
        this.emit('variablesResponse', response);

    }

    public processGetExceptionInfoResponse(
        success: boolean,
        data: {
            identifier: string,
            message: string,
            stack: DebugProtocol.StackFrame[],
            response: DebugProtocol.ExceptionInfoResponse
        }
    ) {
        let response = data.response;
        response.body = response.body || {};
        response.body.breakMode = 'always';
        response.body.exceptionId = data.identifier;
        response.body.description = data.message;
        response.body.details = {
            message: data.message,
            typeName: data.identifier,
            fullTypeName: data.identifier,
            stackTrace: 'some stupid stack'
        } as DebugProtocol.ExceptionDetails;
        console.log(response);
        this.emit('exceptionInfoResponse', response);
    }

    public processInputEventResponse(responseData: {reason: string}) {
        this.emit('inputEvent', responseData.reason);
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
                    case 'get_scopes':
                        me.processScopesResponse(
                            true,
                            response.data
                        );
                        break;
                    case 'get_variables':
                        me.processVariablesResponse(
                            true,
                            response.data
                        );
                        break;
                    case 'get_exception_info':
                        me.processGetExceptionInfoResponse(
                            response.success,
                            response.data
                        );
                        break;
                    case 'input_event_emitter':
                        me.processInputEventResponse(response.data);
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

    public updateExceptionBreakpoints(
        breakpoints: DebugProtocol.SetExceptionBreakpointsArguments
    ) {
        let actionList = {} as { [filter: string]: 'dbstop' | 'dbclear' };
        actionList['errors'] = 'dbclear';
        actionList['caughterrors'] = 'dbclear';
        actionList['warnings'] = 'dbclear';

        breakpoints.filters.forEach(
            (filter, index) => {
                actionList[filter] = 'dbstop';
            }
        );

        if (this._pyshell !== undefined) {
            this._pyshell.send(
                {
                    command: 'update_exception_breakpoints',
                    args: actionList
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

    public getScopes(
        response: DebugProtocol.ScopesResponse
    ) {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'get_scopes',
                args: response
            } as adaptorCommand);
        }
    }

    public getVariables(
        args: DebugProtocol.VariablesArguments,
        response: DebugProtocol.VariablesResponse
    ) {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'get_variables',
                args: {
                    request_args: args,
                    response: response
                }
            } as adaptorCommand);
        }
    }

    public getExceptionInfo(
        response: DebugProtocol.ExceptionInfoResponse
    ) {
        if (this._pyshell !== undefined) {
            this._pyshell.send({
                command: 'get_exception_info',
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
            this._pyshell.send({
                command: 'terminate',
                args: {}
            } as adaptorCommand);
            this._pyshell.terminate();
        }
    }
}