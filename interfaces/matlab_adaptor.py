import matlab.engine
from matlab.engine import EngineError as MatlabEngineError
import json
import sys
import os
from getpass import getuser
import asyncio
import select


def return_vscode(message_type=None,
                  success=None,
                  command=None,
                  message=None,
                  data=None):
    if message_type is None:
        message_type = 'response'

    if success is None:
        success = True

    if command is None:
        command = ''

    if message is None:
        message = ''

    if data is None:
        data = {}

    returned_message = json.dumps({'message_type': message_type,
                                   'success': success,
                                   'command': command,
                                   'message': message,
                                   'data': data})

    sys.stdout.write(returned_message + '\n')
    sys.stdout.flush()


engine = None
command_input_log_file = None
execute_input_event_emitter = True


async def input_event_emitter():
    global command_input_log_file
    import time
    while True:
        if execute_input_event_emitter:
            input_line = command_input_log_file.readline()
            if input_line:
                return_vscode(
                    message_type='info',
                    command='input_event_emitter',
                    message=input_line,
                    data={}
                )

        await asyncio.sleep(0.01)


def connect(args):
    global session_tag
    global engine
    global command_input_log_file
    global execute_input_event_emitter
    session_tag = str(args[u'session_tag'])
    command_input_log_file = open(str(args[u'input_log_file']), 'r')
    try:
        engine = matlab.engine.connect_matlab(session_tag)
        return_vscode(message_type='response',
                      command='connect',
                      success=True,
                      message='Matlab engine succesfully connected.',
                      data={})
    except MatlabEngineError as error:
        return_vscode(message_type='response',
                      command='connect',
                      success=False,
                      message=str(error),
                      data={'args': args})

    command_input_log_file.seek(0, 2)
    execute_input_event_emitter = True


def wait_startup(args):
    from io import StringIO
    global engine
    m_stdout = StringIO()
    m_stderr = StringIO()
    matlab_adaptor_lib_path = os.path.dirname(__file__) + '/matlab'
    try:
        engine.eval("addpath('{}');".format(matlab_adaptor_lib_path),
                    nargout=0,
                    stdout=m_stdout,
                    stderr=m_stderr)
        engine.aMiInhibitDebugEdit(nargout=0)
        return_vscode(message_type='response',
                      command='wait_startup',
                      success=True,
                      message='Matlab is ready.',
                      data={})
    except MatlabEngineError as error:
        return_vscode(message_type='response',
                      command='wait_startup',
                      success=False,
                      message=str(error),
                      data={'args': args})


def update_breakpoints(args):
    breakpoints = args[u'breakpoints']

    for index in range(len(breakpoints)):
        breakpoint = breakpoints[index]
        breakpoints[index][u'valid'] = engine.aMiSetBreakpoint(
            breakpoint[u'filepath'],
            str(breakpoint[u'line'])
        )

    return_vscode(message_type='response',
                  command='update_breakpoints',
                  success=True,
                  message='Breakpoints processed.',
                  data=breakpoints)


def ping(args):
    return_vscode(message_type='response',
                  command='ping',
                  message='pong',
                  success=True,
                  data={})


COMMANDS = {
    'connect': connect,
    'wait_startup': wait_startup,
    'update_breakpoints': update_breakpoints,
    'ping': ping
}


def process_line(line):
    global COMMANDS
    global input_log
    input_message = json.loads(line)
    try:
        COMMANDS[input_message[u'command']](input_message[u'args'])
    except Exception as e:
        return_vscode(message_type='error',
                      command=str(input_message[u'command']),
                      success=False,
                      message='Error during command execution',
                      data={'command_line': line,
                            'error': str(e)})


async def adaptor_listner():
    while True:
        if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
            line = sys.stdin.readline()
            try:
                input_log.write(line)
                input_log.flush()
                process_line(line)
            except Exception as e:
                return_vscode(
                    message_type='error',
                    command='none',
                    success=False,
                    message='Unexpected error during command processing',
                    data={'command_line': line})
        else:
            await asyncio.sleep(0.01)


if __name__ == '__main__':

    global input_log
    return_vscode(message_type='info',
                  command=None,
                  success=True,
                  message=str(sys.version),
                  data={})
    input_log = open('/tmp/aMiInput.log', 'a+')

    loop = asyncio.get_event_loop_policy().new_event_loop()
    asyncio.set_event_loop(loop)

    asyncio.ensure_future(adaptor_listner(), loop=loop)
    asyncio.ensure_future(input_event_emitter(), loop=loop)

    loop.run_forever()
