% Create connection
t = tcpip('0.0.0.0', 9000, 'NetworkRole', 'server');
% Open connection
fopen(t);

while true

    while t.BytesAvailable == 0
        pause(1)
    end

    data=fread(t, t.BytesAvailable, 'double');

    disp(data);
    
end

