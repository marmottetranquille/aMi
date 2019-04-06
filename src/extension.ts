// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { O_SYMLINK } from 'constants';
import { cpus, userInfo } from 'os';
import { isUndefined } from 'util';
import { Socket } from 'net';
import { PythonShell } from 'python-shell';
import { stringify } from 'querystring';


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
	success_callback: ((argouts: {}) => void) | undefined,
	error_callback: ((argouts: {}) => void) | undefined) {
	
	console.log({
		matlab_callback: callback,
		argins: args
	});

	let argouts = {};
	let response_received = false;
	let error_received = false;

	// Monitor startup
	const monitor_script_path = context.extensionPath + '/interfaces/matlab_monitor.py';
	let pyshell = new PythonShell(monitor_script_path, { mode: 'json' });

	const session_tag = context.workspaceState.get('matlab_session_tag');

	pyshell.stdout.on('data', function (response) {
		argouts = JSON.parse(response);
		if (success_callback !== undefined) {
			success_callback(argouts);
		}
	});

	pyshell.stdout.on('error', function (err) {
		if (error_callback !== undefined) {
			error_callback(err);
		}
	});

	pyshell.send({
		callback: callback,
		session_tag: session_tag,
		args: args
	});

	pyshell.end(() => { });

	return argouts;

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"aMi" is now active!');

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
		matlab_terminal.show(false);

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

		// Start Matlab in shared mode
		let matlab_command = 'matlab -nodesktop';
		matlab_command = matlab_command + ' -r \"matlab.engine.shareEngine(\'';
		matlab_command = matlab_command + session_tag + '\')\"';
		matlab_terminal.sendText(matlab_command, true);
		vscode.window.showInformationMessage('Matlab is starting...');

		// Register Matlab command window terminal
		context.workspaceState.update('matlab_session_tag', session_tag);
		context.workspaceState.update(
			'matlab_terminal_id',
			matlab_terminal.processId);

		// Find where matlab is installed
		const { exec } = require('child_process');
		exec('realpath \`which matlab\`', (err: any, stdout: string, stderr: string) => {
			if (err) {
				vscode.window.showErrorMessage('Matlab remote control can not be initiated.');
				return;
			}
			let matlab_root = stdout.slice(0, -'/bin/matlab'.length - 1);
			vscode.window.showInformationMessage('matlab found in ' + matlab_root);
		});

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
				const session_tag = context.workspaceState.get('matlab_session_tag');
				matlab_callback(
					context,
					'send_exit', {},
					undefined,
					undefined);
				matlab_callback(
					context,
					'confirm_stop', {},
					(argouts: {}) => {
						if (matlab_terminal !== undefined) {
							matlab_terminal.dispose();
						}
						console.log(argouts);
					},
					undefined);

				context.workspaceState.update('matlab_terminal_id', undefined);
			}
			else {
				vscode.window.showWarningMessage(
					'Matlab terminal had already been closed.');
			}
		});
	
	let disp_runScript = vscode.commands.registerCommand(
		'aMi.runScript', () => {
			
			const session_tag = context.workspaceState.get('matlab_session_tag');

			let current_editor = vscode.window.activeTextEditor;
			if (current_editor === undefined) {
				return;
			}
			let current_document = current_editor.document;
			if (current_document.isDirty || current_document.isUntitled) {
				vscode.window.showWarningMessage('aMi: Please save script first.');
				return;
			}

			matlab_callback(
				context,
				'is_script_in_path', { script_path: current_document.fileName },
				(argouts: any) => {
					if (argouts.success === true) {
						if (argouts.data === true) {
							vscode.window.showInformationMessage('aMi: Script will be started.');
						}
						else {
							vscode.window.showWarningMessage('aMi: Script is not in Matlab path.');
						}
					}
					else {
						vscode.window.showErrorMessage(argouts.message);
					}
				},
				undefined);


		}
	);

	context.subscriptions.push(disp_startMatlab);
	context.subscriptions.push(disp_stopMatlab);
	context.subscriptions.push(disp_runScript);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
