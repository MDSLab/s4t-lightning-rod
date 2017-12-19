//############################################################################################
//##
//# Copyright (C) 2014-2017 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################


SETTINGS = process.env.IOTRONIC_HOME+'/settings.json';
nconf = require('nconf');
nconf.file ({file: SETTINGS});

log4js = require('log4js');
log4js.loadAppender('file');


logfile = nconf.get('config:log:logfile');
loglevel = nconf.get('config:log:loglevel');
log4js.addAppender(log4js.appenders.file(logfile));    
var logger = log4js.getLogger('plugin-apis');
logger.setLevel(loglevel);

var Q = require("q");


exports.getLogger = function (){
    return logger;
};
    
exports.getPosition = function (){
	
    var altitude = nconf.get('config:board:position:altitude');
    var longitude = nconf.get('config:board:position:longitude');
    var latitude = nconf.get('config:board:position:latitude'); 
    
    var position = {altitude: altitude, longitude: longitude, latitude: latitude};
    
    return position;
	
};

exports.getBoardId = function (){
    var boardID = nconf.get('config:board:code');
    
    return boardID;
	
};

exports.getLocalTime = function (){

	var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
	var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	
	return localISOTime

};

exports.getUtcTime = function (){

	return new Date().toISOString()

};
