function [timestamp, HR, RR, T] = readPolarHRF(filename, startRow, endRow)
%READPOLARHRF Read a Polar H7 log written by the logger (new .csv or old .txt).
%   [TIMESTAMP, HR, RR] = READPOLARHRF(FILENAME) returns column vectors:
%       TIMESTAMP  ms since Unix epoch (as written by the logger)
%       HR         heart rate, bpm
%       RR         RR interval in ms (NaN where the strap sent none)
%
%   [...] = READPOLARHRF(FILENAME, STARTROW, ENDROW) reads file lines
%   STARTROW..ENDROW (line 1 is the header, so data starts at 2), same as before.
%
%   [..., T] = READPOLARHRF(...) also returns a table with a UTC datetime column
%   "time" plus "contact" and "energy_kJ" when present.
%
%   Works with both formats:
%     new: timestamp,HR,RR,RR_ms,iso_time,contact,energy_kJ  (LF line endings)
%     old: timestamp,HR,RR,                                  (CRLF, RR=-1 if missing)
%
%   Note: the new logger writes one row per RR interval, so a timestamp can appear
%   on more than one row. For an HR-only time series use:
%       [ts, idx] = unique(timestamp); hr = HR(idx);
%
%   Example:
%       [ts, HR, RR, T] = readPolarHRF('data/polar_0022d0b98acb_20261001T120000.csv');
%       plot(T.time, T.HR)

if nargin < 2 || isempty(startRow), startRow = 2; end
if nargin < 3 || isempty(endRow),   endRow = inf; end

opts = detectImportOptions(filename, 'FileType', 'text', 'Delimiter', ',');
opts.VariableNamesLine = 1;
opts.DataLines = [startRow, endRow];

% Only numeric columns we know about; ignores iso_time and the old trailing empty column
keep = intersect({'timestamp', 'HR', 'RR', 'contact', 'energy_kJ'}, opts.VariableNames, 'stable');
opts.SelectedVariableNames = keep;
opts = setvartype(opts, keep, 'double');

T = readtable(filename, opts);

% RR is raw 1/1024 s in both formats; old files used -1 for "no RR"
raw = T.RR;
raw(raw < 0) = NaN;
RR = raw / 1024 * 1000;

timestamp = T.timestamp;
HR = T.HR;

T.RR_ms = RR;
T.time = datetime(timestamp / 1000, 'ConvertFrom', 'posixtime', 'TimeZone', 'UTC');
T = movevars(T, 'time', 'Before', 1);
end
