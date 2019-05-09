function varargout = aMiGetStackTrace()

stack = dbstack(1);

response = formatStackTrace(stack, 'json');

if nargout == 0
    disp(response)
    varargout = {};
else
    varargout = {response};
end
