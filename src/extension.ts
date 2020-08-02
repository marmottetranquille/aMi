// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { O_SYMLINK } from 'constants';
import { cpus, userInfo } from 'os';
import { isUndefined } from 'util';
import { Socket } from 'net';
import { PythonShell } from 'python-shell';
import { stringify } from 'querystring';
import { toUnicode } from 'punycode';
import * as Net from 'net';
import { remove } from 'fs-extra';
import { MatlabDebugSession } from './matlabDebug';


type chained_argouts = {
	success: Boolean,
	message: string,
	data: any
};

type error_callback = ({ }) => void;

type error_callback_chain = {
	immediate: error_callback | undefined,
	following: error_callback_chain | undefined
} | undefined;

type success_callback = (
	context: vscode.ExtensionContext,
	args: chained_argouts,
	success_callback_chain: success_callback_chain | undefined,
	error_callback_chain: error_callback_chain | undefined
) => void;

type success_callback_chain = {
	immediate: success_callback | undefined,
	following: success_callback_chain | undefined
} | undefined;


export function createSessionTag(context: vscode.ExtensionContext) {
	// Prepare tag for finding the Matlab shared session
	const current_date = new Date();
	const year = current_date.getUTCFullYear();
	const month = current_date.getUTCMonth();
	const day = current_date.getUTCDate();
	const hour = current_date.getUTCHours();
	const minute = current_date.getUTCMinutes();
	const second = current_date.getUTCSeconds();
	const username = userInfo().username;
	let session_tag = `${year}${month}${day}${hour}${minute}${second}`;
	session_tag = username + session_tag;

	let log_dir = '/tmp/' + username + '/matlab' + session_tag;
	
	context.workspaceState.update('matlab_session_tag', session_tag);
	context.workspaceState.update('log_dir', log_dir);
	context.workspaceState.update('input_log_file', log_dir + '/input.log');
}


export function getSessionTag(context: vscode.ExtensionContext): any {
	let sessionTag = context.workspaceState.get('matlab_session_tag');
	return sessionTag;
}

export function getLogDir(context: vscode.ExtensionContext): any {
	let logDir = context.workspaceState.get('log_dir');
	return logDir;
}

export function getInputLogFile(context: vscode.ExtensionContext): any {
	let inputLogFile = context.workspaceState.get('input_log_file');
	return inputLogFile;
}

export function find_matlab_terminal(context: vscode.ExtensionContext) : vscode.Terminal | undefined {
	let matlab_terminal_id = context.workspaceState.get('matlab_terminal_id');
	if (matlab_terminal_id !== undefined) {
		return vscode.window.terminals.find(
			x => x.processId === matlab_terminal_id);
	}
	else {
		return undefined;
	}
}


export function matlab_callback(
	context: vscode.ExtensionContext,
	callback: string,
	args: {},
	success_callback_chain: success_callback_chain | undefined,
	error_callback_chain: error_callback_chain | undefined) {
	
	console.log({
		matlab_callback: callback,
		argins: args
	});

	let argouts:chained_argouts;
	let response_received = false;
	let error_received = false;

	// Monitor startup
	const monitor_script_path = context.extensionPath + '/interfaces/matlab_monitor.py';
	let pyshell = new PythonShell(monitor_script_path, { mode: 'json' });

	const session_tag = context.workspaceState.get('matlab_session_tag');

	pyshell.stdout.on('data', function (response) {
		argouts = JSON.parse(response);
		console.log(argouts);
		if (success_callback_chain !== undefined) {
			if (success_callback_chain.immediate !== undefined) {
				success_callback_chain.immediate(
					context,
					argouts,
					success_callback_chain.following,
					error_callback_chain === undefined ?
						undefined :
						error_callback_chain.following);	
			}
		}
	});

	pyshell.stdout.on('error', function (err) {
		if (error_callback_chain !== undefined) {
			if (error_callback_chain.immediate !== undefined) {
				error_callback_chain.immediate(err);
			}
		}
	});

	pyshell.send({
		callback: callback,
		session_tag: session_tag,
		args: args
	});

	pyshell.end(() => { });

}


function dispose_terminal(
	context: vscode.ExtensionContext,
	args: chained_argouts,
	success_callback_chain: success_callback_chain,
	error_callback_chain: error_callback_chain
) {
	let matlab_terminal = find_matlab_terminal(context);
	if (matlab_terminal !== undefined) {
		matlab_terminal.dispose();
	}
	context.workspaceState.update('matlab_terminal_id', undefined);
}


function confirm_stop(
	context: vscode.ExtensionContext,
) {

	let success_chain: success_callback_chain = {
		immediate: dispose_terminal,
		following: undefined
	};

	matlab_callback(
		context,
		'confirm_stop', {},
		success_chain,
		undefined
		);
}


function send_exit(
	context: vscode.ExtensionContext,
) {
	matlab_callback(
		context,
		'send_exit', {},
		undefined,
		undefined
	);
}


function send_command_to_terminal(
	context: vscode.ExtensionContext,
	args: chained_argouts,
	success_callback_chain: success_callback_chain,
	error_callback_chain: error_callback_chain
) {
	let matlab_terminal = find_matlab_terminal(context);
	const command = args.data.command;
	if (matlab_terminal !== undefined) {
		matlab_terminal.sendText(command);
	}
	else { }
}


function run_script(
	context: vscode.ExtensionContext,
	file_path: string
) {

	function file_path_to_command(
		context: vscode.ExtensionContext,
		args: chained_argouts,
		success_callback_chain: success_callback_chain,
		error_callback_chain: error_callback_chain
	) {

		matlab_callback(
			context,
			'file_path_to_command', { file_path: file_path },
			success_callback_chain,
			undefined
		);
	}

	function add_dir_of_file_to_path(
		context: vscode.ExtensionContext,
		success_callback_chain: success_callback_chain,
		error_callback_chain: error_callback_chain
	) {

		matlab_callback(
			context,
			'add_dir_of_file_to_path', { file_path: file_path },
			success_callback_chain,
			undefined
		);
	}

	function path_management_switch(option: String) {
		if (!option !== undefined) {
			if (option === 'aMi: Add script folder to path') {

				let success_chain: success_callback_chain = {
					immediate: file_path_to_command,
					following: {
						immediate: send_command_to_terminal,
						following: undefined
					}
				};

				add_dir_of_file_to_path(context, success_chain, undefined);
			}
			if (option === 'aMi: Run script in place') {
				let command = 'run ' + file_path;
				send_command_to_terminal(
					context,
					{ success: true, message: '', data: { command: command } },
					undefined,
					undefined
				);
			}
			if (option === 'aMi: Cancel run script') {
				
			}
			else { }
		}
	}

	function file_in_path_switch(
		context: vscode.ExtensionContext,
		args: chained_argouts,
		success_callback_chain: success_callback_chain,
		error_callback_chain: error_callback_chain
	) {
		if (args.success === true) {
			if (args.data === true) {
				//vscode.window.showInformationMessage('aMi: Script will be started.');
				let success_chain = {
					immediate: send_command_to_terminal,
					following: undefined
				};
				file_path_to_command(
					context,
					{ success: true, message: '', data: {} },
					success_chain,
					undefined
				);
			}
			else {
				vscode.window.showWarningMessage('aMi: Script is not in Matlab path.');
				vscode.window.showQuickPick([
					'aMi: Add script folder to path',
					'aMi: Run script in place',
					'aMi: Cancel run script']).then(
						(option) => {
							option !== undefined ?
								path_management_switch(option) :
								vscode.window.showErrorMessage(
									'Something unexpected happened with option selection.');
						}
					);
			}
		}
	}

	let success_chain: success_callback_chain = {
		immediate: file_in_path_switch,
		following: undefined
	};

	matlab_callback(
		context,
		'is_file_in_path', { file_path: file_path },
		success_chain,
		undefined
	);

}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"aMi" is now active!');

	createSessionTag(context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disp_startMatlab = vscode.commands.registerCommand('aMi.startMatlab', () => {
		

		// Check if a session is already running
		let matlab_terminal = find_matlab_terminal(context);
		if (matlab_terminal !== undefined) {
			// Matlab is already running, just focus the command window
			matlab_terminal.show(true);
			vscode.window.showWarningMessage('Matlab is already started.');
			return;
		}

		// Start terminal where Matlab command window will be
		matlab_terminal = vscode.window.createTerminal(
			'Matlab',
			undefined,
			undefined);
		matlab_terminal.hide();

		// Prepare tag for finding the Matlab shared session
		/*const current_date = new Date();
		const year = current_date.getUTCFullYear();
		const month = current_date.getUTCMonth();
		const day = current_date.getUTCDate();
		const hour = current_date.getUTCHours();
		const minute = current_date.getUTCMinutes();
		const second = current_date.getUTCSeconds();
		const username = userInfo().username;
		let session_tag = `${year}${month}${day}${hour}${minute}${second}`;
		session_tag = username + session_tag;*/
		let session_tag = getSessionTag(context);
		let log_dir = getLogDir(context);
		let log_file = getInputLogFile(context);

		// Start Matlab in shared mode
		matlab_terminal.sendText('mkdir -p ' + log_dir);
		matlab_terminal.sendText('chmod og-rwx ' + log_dir);
		let matlab_command = 'matlab -nodesktop -nosplash';
		matlab_command = matlab_command + ' -r \"matlab.engine.shareEngine(\'';
		matlab_command = matlab_command + session_tag + '\')\"';
		matlab_command = matlab_command + ' | tee -i ' + log_file;
		matlab_terminal.sendText('reset');
		matlab_terminal.show(false);
		matlab_terminal.sendText(matlab_command, true);

		// Register Matlab command window terminal
		context.workspaceState.update(
			'matlab_terminal_id',
			matlab_terminal.processId);

		// Monitor startup
		matlab_callback(
			context,
			'confirm_start', {},
			undefined,
			undefined);

	});

	let disp_stopMatlab = vscode.commands.registerCommand(
		'aMi.stopMatlab', () => {

			let matlab_terminal = find_matlab_terminal(context);
			if (matlab_terminal !== undefined) {
				const session_tag = getSessionTag(context);
				send_exit(context);
				confirm_stop(context);
			}
			else {
				vscode.window.showWarningMessage(
					'Matlab terminal had already been closed.');
			}

			let logDir = getLogDir(context);
			if (logDir !== undefined) {
				remove(logDir);
			}
		}
	);
	
	let disp_runEditorScript = vscode.commands.registerCommand(
		'aMi.runEditorScript', () => {
			
			const session_tag = getSessionTag(context);
			if (session_tag === undefined) {
				vscode.window.showErrorMessage('aMi: Please start Matlab first.');
				return;
			}
			
			const matlab_terminal = find_matlab_terminal(context);
			if (matlab_terminal === undefined) {
				vscode.window.showErrorMessage('aMi: Please start Matlab first.');
				return;
			}

			let current_editor = vscode.window.activeTextEditor;
			if (current_editor === undefined) {
				vscode.window.showErrorMessage('aMi: No text editor currently active (?).');
				return;
			}
			let current_document = current_editor.document;
			if (current_document.isDirty || current_document.isUntitled) {
				vscode.window.showErrorMessage('aMi: Please save script first.');
				return;
			}

			let script_path = current_document.fileName;
			
			run_script(context, script_path);

		}
	);

	let disp_runExplorerScript = vscode.commands.registerCommand(
		'aMi.runExplorerScript', (uri: vscode.Uri) => {
			
			const session_tag = getSessionTag(context);
			if (session_tag === undefined) {
				vscode.window.showErrorMessage('aMi: Please start Matlab first.');
				return;
			}
			
			const matlab_terminal = find_matlab_terminal(context);
			if (matlab_terminal === undefined) {
				vscode.window.showErrorMessage('aMi: Please start Matlab first.');
				return;
			}

			let script_file = uri.path;
			if (script_file === undefined) {
				vscode.window.showErrorMessage('aMi: No file currently selected (?).');
				return;
			}

			if (script_file !== uri.path) {
				vscode.window.showErrorMessage('aMi: Running remote script execution is not supported.');
				return;
			}
			
			run_script(context, script_file);

		}
	);

	let disp_runEditorSelection = vscode.commands.registerCommand(
		'aMi.runEditorSelection', () => {
			
			const session_tag = getSessionTag(context);
			if (session_tag === undefined) {
				vscode.window.showErrorMessage('aMi: Please start Matlab first.');
				return;
			}
			
			const matlab_terminal = find_matlab_terminal(context);
			if (matlab_terminal === undefined) {
				vscode.window.showErrorMessage('aMi: Please start Matlab first.');
				return;
			}

			let current_editor = vscode.window.activeTextEditor;
			if (current_editor === undefined) {
				vscode.window.showErrorMessage('aMi: No text editor currently active (?).');
				return;
			}

			let current_selection = current_editor.selection;
			if (current_selection === undefined) {
				vscode.window.showErrorMessage('aMi: No text is currently selected (?).');
			}

			let selected_code = current_editor.document.getText(current_selection);

			send_command_to_terminal(
				context,
				{ success: true, message: '', data:{command: selected_code}},
				undefined,
				undefined
			);

		}
	);

	const factory = new MatlabDebugDescriptorFactory(context);
	context.subscriptions.push(
		vscode.debug.registerDebugAdapterDescriptorFactory(
			'matlab',
			factory
		)
	);

	let startDebugAdaptor = vscode.commands.registerCommand('aMi.startDebugAdaptor', () => {

		//vscode.debug.onDidChangeBreakpoints(logNewBreakPoint);

		const matlabTerminal = find_matlab_terminal(context);
		if (matlabTerminal !== undefined) {
			const matlabConfiguration = new MatlabConfiguration(
				getSessionTag(context),
				getInputLogFile(context),
				context.extensionPath);
	
			vscode.debug.startDebugging(undefined, matlabConfiguration);
		}
		else {
			vscode.window.showWarningMessage('Start Matlab first.');
		}
	});

	context.subscriptions.push(disp_startMatlab);
	context.subscriptions.push(disp_stopMatlab);
	context.subscriptions.push(disp_runEditorScript);
	context.subscriptions.push(disp_runExplorerScript);
	context.subscriptions.push(disp_runEditorSelection);
	context.subscriptions.push(factory);
	context.subscriptions.push(startDebugAdaptor);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

export class MatlabConfiguration implements vscode.DebugConfiguration {

    type: string;
    name: string;
    request: string;
	extensionFolder: string;
	sessionTag: string | undefined;
	inputLogFile: string | undefined;

	public constructor(
		sessionTag: string | undefined,
		inputLogFile: string | undefined,
		extensionFolder: string
	) {
        this.type = 'matlab';
        this.name = 'Start Matlab';
        this.request = 'launch';
		this.extensionFolder = extensionFolder;
		if (sessionTag !== undefined) {
			this.sessionTag = sessionTag;
		}
		else {
			console.error('Matlab sessionTag undefined; did you start Matlab?');
		}
		if (inputLogFile !== undefined) {
			this.inputLogFile = inputLogFile;
		}
		else {
			console.error('Input log file is undefined.');
		}
    }
}

class MatlabDebugDescriptorFactory implements
	vscode.DebugAdapterDescriptorFactory {
	
	private server?: Net.Server;
	private context: vscode.ExtensionContext;

	constructor(
		context: vscode.ExtensionContext
	) {
		this.context = context;
	}
	
	createDebugAdapterDescriptor(
		session: vscode.DebugSession,
		executable: vscode.DebugAdapterExecutable | undefined
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		if (!this.server) {
			this.server = Net.createServer(
				(socket) => {
					const sessionTag = getSessionTag(this.context);
					if (sessionTag === undefined) {
						throw new Error('sessionTag is undefined.');
					}
					const extensionFolder = this.context.extensionPath;
					const inputLogFile = getInputLogFile(this.context);
					if (inputLogFile === undefined) {
						throw new Error('inputLogFile is undefined.');
					}
					const matlabTerminal = find_matlab_terminal(this.context);
					if (matlabTerminal === undefined) {
						throw new Error('Could not find Matlab terminal.');
					}
					const session = new MatlabDebugSession(
						sessionTag,
						extensionFolder,
						inputLogFile,
						matlabTerminal
					);
					session.setRunAsServer(true);
					session.start(<NodeJS.ReadableStream>socket, socket);
				}
			).listen(0);
		}

		let addressInfo = this.server.address() as Net.AddressInfo;

		return new vscode.DebugAdapterServer(addressInfo.port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}