import * as DebugAdapter from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import {
    MatlabRuntimeAdaptor,
    MatlabBreakpoint
} from './matlabAdaptor';
import { cpus } from 'os';

interface MatlabLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    extensionFolder: string;
    sessionTag: string;
    inputLogFile: string;
}

export class MatlabDebugSession extends DebugAdapter.LoggingDebugSession {

    private _runtime: MatlabRuntimeAdaptor;

    public constructor(
        sessionTag: string,
        extensionFolder: string,
        inputLogFile: string
    ) {
        super();
        this._runtime = new MatlabRuntimeAdaptor(
            sessionTag,
            extensionFolder,
            inputLogFile
        );
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
            (response) => {
                console.log(response);
                this.sendResponse(response);
            }
        )

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

        let matlabBreakPoints: MatlabBreakpoint[] = new Array();

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

    protected async continueRequest(
        response: DebugProtocol.ContinueResponse,
        args: DebugProtocol.ContinueArguments
    ) {
        this._runtime.continue();
        response.body = response.body || {};
        this.sendResponse(response);
    }

    protected async nextRequest(
        response: DebugProtocol.NextResponse,
        args: DebugProtocol.NextArguments
    ) {
        this._runtime.step();
        response.body = response.body || {};
        this.sendResponse(response);
    }

    protected async stepInRequest(
        response: DebugProtocol.StepInResponse,
        args: DebugProtocol.StepInArguments
    ) {
        this._runtime.stepIn();
        response.body = response.body || {};
        this.sendResponse(response);
    }

    protected async stepOutRequest(
        response: DebugProtocol.StepOutResponse,
        args: DebugProtocol.StepOutArguments
    ) {
        this._runtime.stepOut();
        response.body = response.body || {};
        this.sendResponse(response);
    }

    protected async restartRequest(
        response: DebugProtocol.RestartResponse,
        args: DebugProtocol.RestartArguments
    ) {
        this._runtime.dbquit();
        response.body = response.body || {};
        this.sendResponse(response);
    }

}