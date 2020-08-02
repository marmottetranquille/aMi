function aMiGetExceptionInfo()

aMiException = evalin('caller', 'aMiException;');

message = ['{"identifier": "', aMiException.identifier, '", ', ...
            '"message": "', replace10(aMiException.message), '", ' ...
            '"stack": ', formatStackTrace(aMiException.stack, 'flat'),  ...
           '}'];

evalin('base','clear aMiException;');

disp(message);