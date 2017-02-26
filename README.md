[![DOI](https://zenodo.org/badge/80522752.svg)](https://zenodo.org/badge/latestdoi/80522752)
# Polar H7 data-logger
Logger for polar H7 and the driver logging system made by Erwin Lopez.

You can use different files to achieve different things:

* Standalone operation (i.e. no tcp connection) data-logger [standalone.js](https://github.com/erwinkendo/polaruob/standalone.js).
* TCP connection to server using protobuffer data-logger [tcpWithProtobuffer.js](https://github.com/erwinkendo/polaruob/tcpWithProtobuffer.js).
* TCP connection not using protobuffer data-logger [tcpNoProtobuffer.js](https://github.com/erwinkendo/polaruob/tcpNoProtobuffer.js).
* A test tcp server in MATLAB [tcpServerTest.m](https://github.com/erwinkendo/polaruob/tcpServerTest.m).
* MATLAB based parser for the generated logged file [readPolarHRF.m](https://github.com/erwinkendo/polaruob/readPolarHRF.m).

## Dependencies
Install [nodejs](https://nodejs.org/). and all the dependencies of [noble](https://github.com/sandeepmistry/noble) depending on your OS.

When ready, just run on your cmd.

```
npm install
```

## Citation
Use the Zenodo-enabled service to generate a citation using your favourite style [![DOI](https://zenodo.org/badge/80522752.svg)](https://zenodo.org/badge/latestdoi/80522752)


## License

Please feel free to share and modify it as you please, but remember to acknowledge our hard work :). Happy coding!

Copyright 2017 Erwin Lopez

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
