function aMiStopEventDiscriminator(stopOnWarnings) %#ok stopOnWarning unused

stackFrames = dbstack(1);

if numel(stackFrames) == 0
    disp('{"reason": "commandwindow"}');
    return;
end

frameName = stackFrames(1).name;
frameLine = stackFrames(1).line;

breakpoints = dbstatus;

% lastError = lasterror;
% lastError = evalin('caller', 'aMiException;');
% evalin('caller', 'clear aMiException;');
% if stopOnWarnings
%     lastWarning = lastwarn;
%     lastwarn('');
% else
%     lastWarning = '';
% end

% For some weird reason, error info (lastwarn and MException.last) do not seem
% to be resetable from the Python adaptor, so we just never flag any exception
% sendErrorReason = ~isempty(lastError.message) | ~isempty(lastWarning);
sendErrorReason = false;

if sendErrorReason
    if ~isempty(lastError.message) %#ok statement can not be reached
        errorReason = lastError.message;
    else
        errorReason = lastWarning;
    end
    errorMessage ='"reason": "exception"';
    errorText = ['"text": "', errorReason, '"'];
    errorMessage =  ['{', errorMessage, ', ', replace10(errorText) '}'];
    disp(errorMessage);
    return
end

for index = 1:numel(breakpoints)
    if strcmp(frameName, breakpoints(index).name) && ...
       frameLine == breakpoints(index).line
        disp('{"reason": "breakpoint"}');
        return
    end
end

disp('{"reason": "step"}');

end
