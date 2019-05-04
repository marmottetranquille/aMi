import * as DebugAdapter from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import {
    MatlabRuntimeAdaptor,
    MatlabBreakpoint
} from './matlabAdaptor';
import { Terminal } from 'vscode';
import { cpus } from 'os';

interface MatlabLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    extensionFolder: string;
    sessionTag: string;
    inputLogFile: string;
}

type MatlabStatus = 'pendingOnCommandWindow' | 'debugging';

export class MatlabDebugSession extends DebugAdapter.LoggingDebugSession {

    private _runtime: MatlabRuntimeAdaptor;
    private _matlabTerminal: Terminal; //reserved
    private _matlabStatus: MatlabStatus;

    public constructor(
        sessionTag: string,
        extensionFolder: string,
        inputLogFile: string,
        matlabTerminal: Terminal 
    ) {
        super();
        this._runtime = new MatlabRuntimeAdaptor(
            sessionTag,
            extensionFolder,
            inputLogFile
        );
        this._matlabTerminal = matlabTerminal;
        this._matlabStatus = 'pendingOnCommandWindow';
    }

    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ):void {
        response.body = response.body || {};
        response.success = true;

        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsRestartRequest = true;

        this._runtime.on(
            'startupDone',
            (success: boolean) => {
                if (success) {
                    console.log('Matlab adaptor successfuly started');
                    this._matlabTerminal.show();
                    this.sendEvent(new DebugAdapter.InitializedEvent());
                }
                else {
                    console.error('Something went wrong connecting to Matlab session');
                }
            }
        );

        this._runtime.on(
            'setBreakpointsDone',
            (response) => {
                console.log(response);
                this.sendResponse(response);
            }
        );

        this._runtime.on(
            'stackTraceResponse',
            (response: DebugProtocol.StackTraceResponse) => {
                console.log(response);
                if (response.body.stackFrames.length > 1) {
                    this._matlabStatus = 'debugging';
                }
                else {
                    this._matlabStatus = 'pendingOnCommandWindow';
                }
                this.sendResponse(response);
            }
        );

        this._runtime.on(
            'inputEvent',
            (args) => {
                console.log('stopped after command window input execution.');
                this.sendEvent(
                    new DebugAdapter.StoppedEvent(
                        'commandWindowInput',
                        0
                    )
                );
            }
        );

        console.log(response);
        this.sendResponse(response);
    }

    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: MatlabLaunchRequestArguments
    ) {
        console.log(response);
        this.sendResponse(response);
    }

    protected async setBreakPointsRequest(
        response: DebugProtocol.SetBreakpointsResponse,
        args: DebugProtocol.SetBreakpointsArguments
    ) {

        if (args.breakpoints !== undefined && args.source.path !== undefined) {
            this._runtime.updateBreakPoints(
                args.source.path,
                args.breakpoints,
                response
            );
        }
    }

    protected async setExceptionBreakPointsRequest(
        response: DebugProtocol.SetExceptionBreakpointsResponse,
        args: DebugProtocol.SetExceptionBreakpointsArguments
    ) {
        response.success = true;
        this.sendResponse(response);
    }

    protected async configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments
    ) {
        response.body = response.body || {};
        response.success = true;
        this.sendResponse(response);
        console.log('DEBUG ADAPTOR CONFIGURATION DONE');
        this.sendEvent(
            new DebugAdapter.StoppedEvent(
                '',
                0
            )
        );
    }

    protected async threadsRequest(
        response: DebugProtocol.ThreadsResponse,
    ) {

        // Supports only one thread for now
        response.body = response.body || {};
        response.body.threads = new Array<DebugAdapter.Thread>();
        response.body.threads.push(new DebugAdapter.Thread(0, 'MATLAB'));
        response.success = true;

        console.log(response);
        this.sendResponse(response);

    }

    protected async stackTraceRequest(
        response: DebugProtocol.StackTraceResponse,
        args: DebugProtocol.StackTraceArguments
    ) {
        this._runtime.getStackTrace(response);
    }

    protected async scopesRequest(
        response: DebugProtocol.ScopesResponse,
        args: DebugProtocol.ScopesArguments
    ) {
        response.body = response.body || {};
        response.body.scopes = new Array<DebugAdapter.Scope>();
        
        console.log(response);
        this.sendResponse(response);
    }

    protected async variablesRequest(
        response: DebugProtocol.VariablesResponse,
        args: DebugProtocol.VariablesArguments
    ) {
        response.body = response.body || {};
        response.body.variables = new Array<DebugAdapter.Variable>();

        console.log(response);
        this.sendResponse(response);
    }

    protected async pauseRequest(
        response: DebugProtocol.PauseResponse,
        args: DebugProtocol.PauseArguments
    ) {
        // One does not simply pause Matlab
        response.success = false;
        this.sendResponse(response);
    }

    protected async continueRequest(
        response: DebugProtocol.ContinueResponse,
        args: DebugProtocol.ContinueArguments
    ) {
        response.body = response.body || {};
        if (this._matlabStatus === 'pendingOnCommandWindow') {
            response.success = false;
        }
        else {
            this._runtime.continue();
        }
        this.sendResponse(response);
    }

    protected async nextRequest(
        response: DebugProtocol.NextResponse,
        args: DebugProtocol.NextArguments
    ) {
        response.body = response.body || {};
        if (this._matlabStatus === 'pendingOnCommandWindow') {
            response.success = false;
        }
        else {
            this._runtime.step();
            response.success = true;
        }
        this.sendResponse(response);
    }

    protected async stepInRequest(
        response: DebugProtocol.StepInResponse,
        args: DebugProtocol.StepInArguments
    ) {
        response.body = response.body || {};
        if (this._matlabStatus === 'pendingOnCommandWindow') {
            response.success = false;
        }
        else {
            this._runtime.stepIn();
            response.success = true;
        }
        this.sendResponse(response);
    }

    protected async stepOutRequest(
        response: DebugProtocol.StepOutResponse,
        args: DebugProtocol.StepOutArguments
    ) {
        response.body = response.body || {};
        if (this._matlabStatus === 'pendingOnCommandWindow') {
            response.success = false;
        }
        else {
            this._runtime.stepOut();
            response.success = true;
        }
        this.sendResponse(response);
    }

    protected async restartRequest(
        response: DebugProtocol.RestartResponse,
        args: DebugProtocol.RestartArguments
    ) {
        response.body = response.body || {};
        if (this._matlabStatus === 'pendingOnCommandWindow') {
            response.success = false;
        }
        else {
            this._runtime.dbquit();
        }
        this.sendResponse(response);
    }

    protected async terminateRequest(
        response: DebugProtocol.TerminateResponse,
        args: DebugProtocol.TerminateArguments
    ) {
        this._runtime.terminate();
        response.body = response.body || {};
    }
}