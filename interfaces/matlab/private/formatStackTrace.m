function formatedStackTrace = formatStackTrace(stack, option)

    if strcmpi(option, 'json')
        response = '[';

        for index = 1:numel(stack)
            frame = stack(index);
            file = which([frame.name '.m']);
            if isempty(file)
                responseFrame = ['{"id": ', num2str(index - numel(stack) + 1), ',', ...
                                 ' "name": "', frame.name, '",', ...
                                 ' "line": 0, ', ...
                                 ' "column": 0}'];
            else
                responseFrame = ['{"id": ', num2str(index - numel(stack) + 1), ',', ...
                                 ' "name": "', frame.name, '",', ...
                                 ' "source": {"path": "', file, '"},', ...
                                 ' "line": ', num2str(frame.line), ',', ...
                                 ' "column": 0}'];
            end
            response = [response responseFrame ', ']; %#ok
        end

        commandWindowFrame = ['{"id": 0,', ...
                              ' "name": "command window",', ...
                              ' "line": 0,', ...
                              ' "column": 0}'];
    
        response = [response, commandWindowFrame];
    
        response = [response ']'];

        formatedStackTrace = response;
    end

    if strcmpi(option, 'flat')
        formatedStackTrace = '"not implemented"';
    end