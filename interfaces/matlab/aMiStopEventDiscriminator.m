function aMiStopEventDiscriminator(stopOnWarnings)

stackFrames = dbstack(1);

if numel(stackFrames) == 0
    disp('{"reason": "commandwindow"}');
    return;
end

frameName = stackFrames(1).name;
frameLine = stackFrames(1).line;

breakpoints = dbstatus;

lastError = lasterror;
if stopOnWarnings
    lastWarning = lastwarn;
else
    lastWarning = '';
end

sendErrorReason = ~isempty(lastError.message) | ~isempty(lastWarning);

if sendErrorReason
    disp('{"reason": "exception"}');
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
