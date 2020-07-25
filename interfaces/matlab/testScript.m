function testScript()

% This is a long execution test script

timeOut = 120;

tic;

x = 0;

while toc <= timeOut
    x = x + 1;
    disp(x);
    y = str2double('0.555'); %#ok y is intentionaly not used
    pause(1);
    keyboard;
    try
        str2double();
    catch e
        if x > 1
            warning('some warning message')
            rethrow(e);
        end
    end
end
