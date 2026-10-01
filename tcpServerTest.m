% TCPSERVERTEST  Receive live samples from the logger (TCP_FORMAT=json).
% Start this first, then run the logger with TCP_HOST pointing at this machine.
% Requires MATLAB R2021a+ (tcpserver). jsondecode replaces parse_json.m.
%
% Each message is one JSON object per line:
%   {"timestamp":1759320000000,"HR":72,"RR":820,"RRs":[820,840]}
% RR/RRs are raw 1/1024 s units; RR is -1 when the strap sent none.

port = 9000;
server = tcpserver("0.0.0.0", port);
configureTerminator(server, "LF");
fprintf('Listening on port %d (Ctrl+C to stop)\n', port);

wasConnected = false;
while true
    if server.Connected ~= wasConnected
        wasConnected = server.Connected;
        if wasConnected, disp('Logger connected'); else, disp('Logger disconnected'); end
    end

    if server.NumBytesAvailable > 0
        line = readline(server);
        if strlength(line) == 0, continue; end
        msg = jsondecode(char(line));

        t = datetime(msg.timestamp / 1000, 'ConvertFrom', 'posixtime', 'TimeZone', 'local');
        rrMs = msg.RRs(:)' / 1024 * 1000;   % empty if no RR in this sample

        fprintf('%s  HR %3d bpm  RR %s ms\n', ...
            char(string(t, 'HH:mm:ss.SSS')), msg.HR, mat2str(round(rrMs)));
    else
        pause(0.02);
    end
end
