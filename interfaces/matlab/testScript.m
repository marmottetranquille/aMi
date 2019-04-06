% This is a long execution test script

timeOut = 5;

tic;

x = 0;

while toc <= timeOut
    x = x + 1;
    disp(x);
    pause(1);
end
