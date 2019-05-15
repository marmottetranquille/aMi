import matlab.engine
from matlab.engine import EngineError as MatlabEngineError
import json
import sys
import os
from getpass import getuser
import asyncio
import select


log_python_adaptor = False


def return_vscode(message_type=None,
                  success=None,
                  command=None,
                  message=None,
                  data=None):

    global log_python_adaptor
    global output_log

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

    if log_python_adaptor:
            output_log.write(returned_message + '\n')
            output_log.flush()

    sys.stdout.write(returned_message + '\n')
    sys.stdout.flush()


engine = None
command_input_log_file = None
execute_input_event_emitter = False
input_event_log = None
stop_on_warnings = False
terminate_loops = False

async def input_event_emitter():
    global command_input_log_file
    global engine
    global execute_input_event_emitter
    global log_python_adaptor
    global stop_on_warnings
    global input_event_log
    global terminate_loops
    import time
    from io import StringIO

    if log_python_adaptor:
        input_event_log = open('/tmp/aMiInputEvent.log', 'w+')
        input_event_log.write('TEST\n')
        input_event_log.flush()

    old_size = 0

    while not terminate_loops:
        if execute_input_event_emitter:
            if old_size == 0:
                old_size = os.stat(command_input_log_file).st_size
                command_input_log = open(str(command_input_log_file), 'r')

            new_size = os.stat(command_input_log_file).st_size

            input_event_detected = False

            if old_size < new_size:
                command_input_log.seek(old_size, 0)
                new_line = command_input_log.readline()

                if new_line and '\n' in new_line:
                    input_event_detected = True
                    old_size = new_size
                else:
                    command_input_log.seek(old_size, 0)

            if input_event_detected:
                m_stdout = StringIO()
                m_stderr = StringIO()
                engine.aMiStopEventDiscriminator(stop_on_warnings,
                                                 nargout=0,
                                                 stdout=m_stdout,
                                                 stderr=m_stderr)

                reason_string = m_stdout.getvalue()
                if log_python_adaptor:
                    input_event_log.write(reason_string + '\n')
                    input_event_log.flush()
                reason = json.loads(reason_string)

                return_vscode(
                    message_type='response',
                    command='input_event_emitter',
                    message='',
                    data=reason
                )

                old_size = os.stat(command_input_log_file).st_size
                command_input_log.seek(old_size, 0)
            else:
                await asyncio.sleep(0.005)

        else:

            await asyncio.sleep(0.005)


def connect(args):
    global session_tag
    global engine
    global command_input_log_file
    global execute_input_event_emitter
    session_tag = str(args[u'session_tag'])
    # command_input_log_file = open(str(args[u'input_log_file']), 'r')
    command_input_log_file = str(args[u'input_log_file'])
    try:
        engine = matlab.engine.connect_matlab(session_tag)
        return_vscode(message_type='response',
                      command='connect',
                      success=True,
                      message='Matlab engine succesfully connected.',
                      data={})
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='connect',
                      success=False,
                      message=str(error),
                      data={'args': args})

    execute_input_event_emitter = True


def wait_startup(args):
    from io import StringIO
    global engine
    m_stdout = StringIO()
    m_stderr = StringIO()
    matlab_adaptor_lib_path = os.path.dirname(__file__) + '/matlab'
    try:
        return_vscode(
            message_type='info',
            command='wait_startup',
            message='',
            success=True,
            data={'matlab_adaptor_lib_path': matlab_adaptor_lib_path}
        )
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
    global engine
    breakpoints = args[u'breakpoints']
    response = args[u'response']

    return_vscode(message_type='info',
                  command='update_breakpoints',
                  success=True,
                  message='Breakpoints processed.',
                  data={'breakpoints': breakpoints,
                        'response': response})

    try:
        engine.dbclear('in', breakpoints[u'file_path'], nargout=0)

        for index in range(len(breakpoints[u'breakpoints'])):
            breakpoint = breakpoints[u'breakpoints'][index]
            breakpoints[u'breakpoints'][index][u'valid'] = \
                engine.aMiSetBreakpoint(
                    breakpoints[u'file_path'],
                    str(breakpoint[u'line'])
                )

        return_vscode(message_type='response',
                      command='update_breakpoints',
                      success=True,
                      message='Breakpoints processed.',
                      data={'breakpoints': breakpoints,
                            'response': response})

    except MatlabEngineError as error:
        return_vscode(message_type='response',
                      command='connect',
                      success=False,
                      message=str(error),
                      data={'args': args})


def update_exception_breakpoints(args):
    global engine
    global stop_on_warnings

    engine.eval(str(args[u'errors']) + ' if error;', nargout=0)
    engine.eval(str(args[u'caughterrors']) + ' if caught error;', nargout=0)
    engine.eval(str(args[u'warnings']) + ' if warning;', nargout=0)

    if args[u'warnings'] == u'dbstop':
        stop_on_warnings = True
    else:
        stop_on_warnings = False


def get_stack_frames(args):
    from io import StringIO
    global engine
    m_stdout = StringIO()
    m_stderr = StringIO()
    try:
        engine.aMiGetStackTrace(nargout=0,
                                stdout=m_stdout,
                                stderr=m_stderr)
        stack_frames = m_stdout.getvalue()
        return_vscode(message_type='info',
                      command='get_stack_frames',
                      message=stack_frames)
        stack_frames = json.loads(stack_frames)
        return_vscode(message_type='response',
                      command='get_stack_frames',
                      success=True,
                      message='',
                      data={'stackFrames': stack_frames,
                            'response': args})
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='get_stack_frames',
                      success=False,
                      message=str(error),
                      data={'args': args})


def get_scopes(args):
    from io import StringIO
    global engine
    m_stdout = StringIO()
    m_stderr = StringIO()
    try:
        response = args
        engine.aMiGetScopes(nargout=0,
                            stdout=m_stdout,
                            stderr=m_stderr)
        scopes = m_stdout.getvalue()
        response[u'body'][u'scopes'] = json.loads(scopes)
        return_vscode(message_type='info',
                      command='get_scopes',
                      success=True,
                      message=scopes)
        return_vscode(message_type='response',
                      command='get_scopes',
                      success=True,
                      message='',
                      data={'response': response})
    except MatlabEngineError as error:
        pass


def get_exception_info(args):
    from io import StringIO
    global engine
    global log_python_adaptor
    global input_event_log
    m_stdout = StringIO()
    m_stderr = StringIO()

    # MException.last can only be called from command prompt...
    engine.evalin('base', 'aMiException = MException.last',
                  nargout=0)

    engine.aMiGetExceptionInfo(
        nargout=0,
        stdout=m_stdout,
        stderr=m_stderr)
    exception_info = m_stdout.getvalue()

    if log_python_adaptor:
        input_event_log.write(exception_info + '\n')
        input_event_log.flush()

    exception_info = json.loads(exception_info)
    exception_info[u'response'] = args
    return_vscode(message_type='response',
                  command='get_exception_info',
                  success=True,
                  message='',
                  data=exception_info)


def dbcont(args):
    global engine
    # no need to do much, it will be caught back by an input event
    try:
        engine.dbcont(nargout=0)
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='continue',
                      success=False,
                      message=str(error),
                      data={'args': args})


def step(args):
    global engine
    try:
        engine.dbstep(nargout=0)
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='step',
                      success=False,
                      message=str(error),
                      data={'args': args})


def step_in(args):
    global engine
    try:
        engine.dbstep('in', nargout=0)
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='step_in',
                      success=False,
                      message=str(error),
                      data={'args': args})


def step_out(args):
    global engine
    try:
        engine.dbstep('out', nargout=0)
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='step_out',
                      success=False,
                      message=str(error),
                      data={'args': args})


def dbquit(args):
    global engine
    try:
        engine.dbquit(nargout=0)
    except MatlabEngineError as error:
        return_vscode(message_type='error',
                      command='dbquit',
                      success=False,
                      message=str(error),
                      data={'args': args})


def terminate(args):
    global terminate_loops
    terminate_loops = True

    loop = asyncio.get_event_loop()
    loop.stop()


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
    'update_exception_breakpoints': update_exception_breakpoints,
    'get_stack_frames': get_stack_frames,
    'get_scopes': get_scopes,
    'get_exception_info': get_exception_info,
    'continue': dbcont,
    'step': step,
    'step_in': step_in,
    'step_out': step_out,
    'dbquit': dbquit,
    'terminate': terminate,
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
    global terminate_loops
    while not terminate_loops:
        if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
            line = sys.stdin.readline()
            try:
                if log_python_adaptor:
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
    global output_log

    if log_python_adaptor:
        input_log = open('/tmp/aMiInput.log', 'a+')
        output_log = open('/tmp/aMiOutput.log', 'w+')

    return_vscode(message_type='info',
                  command=None,
                  success=True,
                  message=str(sys.version),
                  data={})

    loop = asyncio.get_event_loop_policy().new_event_loop()
    asyncio.set_event_loop(loop)

    asyncio.ensure_future(adaptor_listner(), loop=loop)
    asyncio.ensure_future(input_event_emitter(), loop=loop)

    loop.run_until_complete(loop.create_future())

    # loop.run_forever()
