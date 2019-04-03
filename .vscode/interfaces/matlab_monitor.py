
import matlab.engine
from time import sleep
import json
import sys


def return_vscode(success=True, message='', data=None):
    print(json.dumps({u'success': success,
                      u'message': message,
                      u'data': data}))


def confirm_start(args):
    session_tag = str(args[u'session_tag'])
    sleep_time = 0.1
    start_timeout = 60
    wait_time = 0
    while (session_tag not in matlab.engine.find_matlab() and
           wait_time < start_timeout):
        sleep(sleep_time)
        wait_time += sleep_time

    if session_tag in matlab.engine.find_matlab():
        message = u'Matlab started in session {}'.format(session_tag)
        return_vscode(success=True,
                      message=message)
    else:
        message = u'Matlab startup failed.'
        return_vscode(success=False,
                      message=message)


def send_exit(args):
    session_tag = str(args[u'session_tag'])
    if session_tag in matlab.engine.find_matlab():
        eng = matlab.engine.connect_matlab(session_tag)
        try:
            # for some reason it seems that this is the only way to exit Matlab
            eng.eval('exit', nargout=0)
        except:
            # there is no way to stop it without spitting an error
            pass

        message = u'Matlab session {} is closing.'.format(session_tag)
        return_vscode(success=True,
                      message=message)
    else:
        message = u'Matlab session {} does not exist.'.format(session_tag)
        return_vscode(success=False,
                      message=message)


def confirm_stop(args):
    session_tag = str(args[u'session_tag'])
    sleep_time = 0.1
    stop_timeout = 60
    wait_time = 0
    while (session_tag in matlab.engine.find_matlab() and
           wait_time < stop_timeout):
        sleep(sleep_time)
        wait_time += sleep_time

    if session_tag not in matlab.engine.find_matlab():
        message = u'Matlab session {} has closed.'.format(session_tag)
        return_vscode(success=True,
                      message=message)
    else:
        message = u'Matlab session {} is still up after timeout.'
        message = message.format(session_tag)
        return_vscode(success=False,
                      message=message)


def terminate(args):
    global stop_script
    stop_script = True
    return_vscode()


CALLBACK_DICT = {u'confirm_start': confirm_start,
                 u'send_exit': send_exit,
                 u'confirm_stop': confirm_stop,
                 u'terminate': terminate}


stop_script = False


for line in sys.stdin:
    command = json.loads(line)
    callback = CALLBACK_DICT[command[u'callback']]
    args = command[u'args']

    callback(args)

    if stop_script:
        break
