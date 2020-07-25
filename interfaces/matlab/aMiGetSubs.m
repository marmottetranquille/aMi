function aMiGetSubs(variable, base_items)

    size_name = size(variable);

    subs = {};
    names = {};
    subs_front = '';
    subs_tail = '';

    for index = 1:numel(size_name)
        if size_name(index) == 1
            subs_front = [subs_front '1,']; %#ok
        else
            break
        end
    end

    for jndex = (index + 1):numel(size_name)
        subs_tail = [subs_tail ''':'',']; %#ok
    end


    if size_name(index) > 1
        array_res = base_items^floor(log(size_name(index))/log(double(base_items)));
        if array_res == size_name(index) && array_res > 1
            array_res = array_res / base_items;
        end
        if array_res > 1
            if mod(size_name(index), array_res) == 0
                floor_fix = - 1;
            else
                floor_fix = 0;
            end
            for jndex = 0:floor(size_name(index)/array_res) + floor_fix
                front_index = num2str(jndex*array_res + 1);
                if jndex == floor(size_name(index)/array_res)
                    tail_index = num2str(size_name(index));
                else
                    tail_index = num2str((jndex + 1)*array_res);
                end
                names{jndex+1} = [front_index ':' tail_index ',' subs_tail]; %#ok
                subs{jndex+1} = [subs_front names{jndex + 1}]; %#ok
            end
        else
            for jndex = 1:(size_name(index))
                names{jndex} = [num2str(jndex) ',' subs_tail]; %#ok
                subs{jndex} = [subs_front names{jndex}]; %#ok
            end
        end
    end

    subs_out = '[';
    names_out = '[';
    for index = 1:numel(subs)
        subs_out = [subs_out '"' subs{index}(1:end-1) '",']; %#ok
        names_out = [names_out '"' names{index}(1:end-1) '",']; %#ok
    end

    disp(['{"subs": ' subs_out(1:end-1) '], "names": ' names_out(1:end-1) ']}']);