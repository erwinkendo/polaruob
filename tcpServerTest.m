% Create connection
t = tcpip('0.0.0.0', 9000, 'NetworkRole', 'server');
disp('Setup Connection');
% Open connection
fopen(t);
disp('Open Connection');
while true

    while t.BytesAvailable == 0
        pause(1)
    end

    disp('size')
    disp(t.BytesAvailable)
    
    data =( fread(t, t.BytesAvailable) );
    
    parsedData = parse_json(char(data)');
    
    disp('HR');
    disp(parsedData.HR);
    
    disp('RR');
    disp(parsedData.RR);
    
    disp('timestamp');
    disp(datetime( parsedData.timestamp / 1000, 'ConvertFrom', 'posixtime' ));
    
end

fclose(t)
delete(t)
clear t
