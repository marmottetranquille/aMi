
import matlab.engine
from time import sleep
import json
import sys

session_tag = ''


def return_vscode(success=True, message='', data=None):
    return_message = json.dumps({u'success': success,
                                 u'message': message,
                                 u'data': data})
    fid = open('/tmp/jean/log.txt', 'a')
    fid.write('{}: {}'.format(session_tag, return_message))
    fid.close()

    print(return_message)


def confirm_start(args):
    global session_tag
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


def connect_to_engine():
    global session_tag
    if session_tag in matlab.engine.find_matlab():
        engine = matlab.engine.connect_matlab(session_tag)
    else:
        engine = None
        message = u'Matlab session has been closed or died.'
        return_vscode(success=False,
                      message=message)

    return engine


def send_exit(args):
    global session_tag
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
    global session_tag
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


def is_script_in_path(args):
    from os.path import realpath, splitext, basename
    engine = connect_to_engine()

    if engine is not None:
        script_real_path = realpath(args[u'script_path'])
        function_name = splitext(basename(script_real_path))[0]
        response = engine.which(function_name)
        if str(script_real_path) == response:
            return_vscode(success=True,
                          data=True)
        else:
            return_vscode(success=True,
                          data=False)
    else:
        return_vscode(success=False,
                      message='Could not find Matlab session {}'
                              .format(session_tag))


def file_attributes(args):
    from os.path import realpath, split, splitext

    file_path, file_name = split(args[u'file_path'])
    file_name, file_ext = splitext(file_name)

    return_vscode(data={u'file_path': file_path,
                        u'file_name': file_name,
                        u'file_ext': file_ext})


def terminate(args):
    global stop_script
    stop_script = True
    return_vscode()


CALLBACK_DICT = {u'confirm_start': confirm_start,
                 u'send_exit': send_exit,
                 u'confirm_stop': confirm_stop,
                 u'is_script_in_path': is_script_in_path,
                 u'file_attributes': file_attributes,
                 u'terminate': terminate}

stop_script = False


def process_line(line):
    global session_tag
    command = json.loads(line)
    callback = CALLBACK_DICT[command[u'callback']]
    session_tag = command[u'session_tag']
    args = command[u'args']

    fid = open('/tmp/jean/log.txt', 'a')
    fid.write('{}: {}'.format(session_tag, line))
    fid.close()

    callback(args)


if __name__ == '__main__':

    for line in sys.stdin:
        process_line(line)
        if stop_script:
            break
