function aMiGetScopes()

stack = dbstack(1);

message = '[';

if numel(stack) >= 1
    message = [message, ...
               '{"name": "local"}, '];
end

if numel(stack) > 1
    message = [message, ...
               '{"name": "caller"}, '];
end

message = [message, ...
           '{"name": "global"}]'];

disp(message);