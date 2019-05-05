function breakPointValid = aMiSetBreakpoint(filePath, line)

try
    dbstop('in', filePath, 'at', line);
    breakPointValid = true;
catch
    breakPointValid = false;
end