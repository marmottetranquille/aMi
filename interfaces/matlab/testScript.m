% This is a long execution test script

timeOut = 20;

tic;

x = 0;

while toc <= timeOut
    x = x + 1;
    disp(x);
    y = str2double('0.555');
    pause(1);
end
