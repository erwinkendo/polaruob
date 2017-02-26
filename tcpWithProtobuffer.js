var moment = require('moment');
var fs = require("fs");
var NobleDevice = require('noble-device');
var protobuf = require('protocol-buffers')
var socket = require('net').Socket();


var messages = protobuf(fs.readFileSync('polarH7.proto'))

var tempName = [];
tempName[0] = moment().format('X');
tempName[1] = ".txt";

var tempHeader = [];
tempHeader[0] = "timestamp";
tempHeader[1] = "HR";
tempHeader[2] = "RR";
tempHeader[3] = "\n";

var tempFsBuffer = [];
tempFsBuffer[0] = "0";
tempFsBuffer[1] = "0";
tempFsBuffer[2] = "0";
tempFsBuffer[3] = "\n";

var headerName = tempHeader.toString();
var fileName = tempName.toString();
var fsContent = tempFsBuffer.toString();

socket.on('connect', function() {
	console.log('Socket connected!');
	// Start logging file
	fs.appendFile(fileName, headerName, (err) => {
	if (err) throw err;
		console.log('The "data to append" was appended to file!');
	});
});

socket.on('close', function() {
    console.log('Connection closed');
	connectionTry();
});

socket.on('disconnect', function() {
    console.log('Connection disconnect');
});

socket.on('error', function() {
    console.log('Connection error, reconnect');
});

var connectionTry = function() {
	setTimeout(function() {
		socket.connect(9000, '127.0.0.1');
	}, 1000);
};

// Try connection
connectionTry();

var polarH7 = function(device) {
  NobleDevice.call(this, device);
};

var idPolar = '0022d0b98acb';

polarH7.is = function(device) {
  var localName = device.advertisement.localName;
  return (device.id === idPolar);
};

NobleDevice.Util.inherits(polarH7, NobleDevice);
NobleDevice.Util.mixin(polarH7, NobleDevice.DeviceInformationService);
NobleDevice.Util.mixin(polarH7, NobleDevice.HeartRateMeasumentService);

// override HeartRateMeasumentService.prototype.convertMeasument
polarH7.prototype.convertMeasument = function(data, callback) {
  var flags = data.readUInt8(0);
  // Proto-object to store parsed data
  var obj = { HR: -1, RR: -1 };
  // If RR is enabled
  if(flags & 0x10) {
	obj.RR = data.readUInt16LE(2);
  }

  if (flags & 0x01) {
    // uint16
    obj.HR = data.readUInt16LE(1);
	callback(obj);
  } else {
    // uint8
	obj.HR = data.readUInt8(1);
	callback(obj);
  }
};

polarH7.discoverAll(function(device) {
  console.log('discovered: ' + device);

  device.on('disconnect', function() {
    console.log('disconnected!');
	console.log(polarH7.state);
	
	//polarH7.startScanning();
    //process.exit(0);
  });

  device.on('measumentChange', function(data) {
    console.log("update measument: " + data.HR + " - " + data.RR);
	
	var timeBuff = Date.now();
	
	var buf = messages.Test.encode({
		HR: data.HR,
		RR: data.RR,
		timestamp: timeBuff,
	})

    socket.write(buf);
	
	// Log to file
	tempHeader[0] = timeBuff;
	tempHeader[1] = data.HR;
	tempHeader[2] = data.RR;
	tempFsBuffer[3] = "\n";
	
	fsContent = tempHeader.toString();

	// Start logging file
	fs.appendFile(fileName, fsContent, (err) => {
	  if (err) throw err;
	});

  });

  device.connectAndSetUp(function(callback) {
    console.log('connectAndSetUp');
	polarH7.stopScanning();
    device.notifyMeasument(function(counter) {
      console.log('notifyMeasument');
    });
  });
});


