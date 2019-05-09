function message = replace10(message)

    expr = '[\n]';
    message = regexprep(message, expr, '\\n');

end