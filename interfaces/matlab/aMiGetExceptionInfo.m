function aMiGetExceptionInfo()

aMiException = evalin('base', 'aMiException;');

message = ['{"identifier": "', aMiException.identifier, '", ', ...
            '"message": "', replace10(aMiException.message), '", ' ...
            '"stack": ', formatStackTrace(aMiException.stack),  ...
           '}'];

evalin('base','clear aMiException;');

disp(message);