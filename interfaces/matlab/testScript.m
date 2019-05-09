% This is a long execution test script

timeOut = 120;

tic;

x = 0;

while toc <= timeOut
    x = x + 1;
    disp(x);
    y = str2double('0.555');
    pause(1);
    try
        str2double();
    catch e
        if x > 1
            error(e);
        end
    end
    % warning('some warning message')
end
