function aMiGetArraySize(name)

    str_out = '[';

    inhibit_comma = true;

    for dim_size = evalin('caller', ['size(', name, ');']);
        if inhibit_comma
            inhibit_comma = false;
        else
            str_out = [str_out, ', '];
        end

        str_out = [str_out, num2str(dim_size)];
    end

    str_out = [str_out, ']'];

    disp(str_out);