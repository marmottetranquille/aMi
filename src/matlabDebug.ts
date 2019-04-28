import * as DebugAdapter from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import {
    MatlabRuntimeAdaptor,
    MatlabBreakpoint
} from './matlabAdaptor';

interface MatlabLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    extensionFolder: string;
    sessionTag: string;
    inputLogFile: string;
}

export class MatlabDebugSession extends DebugAdapter.LoggingDebugSession {

    private _runtime: MatlabRuntimeAdaptor;

    public constructor() {
        super();
        this._runtime = new MatlabRuntimeAdaptor();
    }

    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ):void {
        response.body = response.body || {};
        response.success = true;

        this._runtime.on(
            'startupDone',
            (response) => {
                console.log(response);
                this.sendResponse(response);
            }
        );

        this._runtime.on(
            'setBreakpointsDone',
            (response) => {
                console.log(response);
                this.sendResponse(response);
                this.sendEvent(
                    new DebugAdapter.StoppedEvent('postSetBreakpoints')
                );
            }
        );

        console.log(response);
        this.sendResponse(response);
        this.sendEvent(new DebugAdapter.InitializedEvent());
    }

    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: MatlabLaunchRequestArguments
    ) {
        this._runtime.start(
            args.sessionTag,
            args.inputLogFile,
            args.extensionFolder);
    }

    protected async setBreakPointsRequest(
        response: DebugProtocol.SetBreakpointsResponse,
        args: DebugProtocol.SetBreakpointsArguments
    ) {

        let matlabBreakPoints: MatlabBreakpoint[] = new Array();

        if (args.breakpoints !== undefined && args.source.path !== undefined) {
            this._runtime.updateBreakPoints(
                args.source.path,
                args.breakpoints
            );
        }
    }
}