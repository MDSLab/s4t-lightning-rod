//############################################################################################
//##
//# Copyright (C) 2014-2018 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
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


try{

    nconf = require('nconf');
    nconf.file ({file: SETTINGS});

}
catch (err) {

    console.log("[SYSTEM] - Error parsing settings file: "+JSON.stringify(err));
}



try{

    AUTH_CONF = '/etc/iotronic/authentication.json';
    nconf.file ('auth', {file: AUTH_CONF});

}
catch (err) {

    console.log("[SYSTEM] - Error parsing authentication file: "+JSON.stringify(err));
}


var Q = require("q");


exports.getLogger = function (plugin_name, loglevel){

    log4js = require('log4js');
    log4js.loadAppender('file');

    //logfile = nconf.get('config:log:logfile');
    //loglevel = nconf.get('config:log:loglevel');

    logfile = '/var/log/iotronic/plugins/'+plugin_name+'.log';

    log4js.addAppender(log4js.appenders.file(logfile));
    var logger = log4js.getLogger(plugin_name);
    logger.setLevel(loglevel);
    
    return logger;
    
};
    
exports.getPosition = function (){
	
    var altitude = nconf.get('config:board:position:altitude');
    var longitude = nconf.get('config:board:position:longitude');
    var latitude = nconf.get('config:board:position:latitude'); 
    
    var position = {altitude: altitude, longitude: longitude, latitude: latitude};
    
    return position;
	
};

exports.getExtraInfo = function (){

    try{

        if(nconf.get('config:extra') != undefined || nconf.get('config:extra') != null)
            var extra = nconf.get('config:extra');
        else
            var extra = "NA"

    }
    catch (err) {

        console.log("[SYSTEM] - parsing extra-info error: "+JSON.stringify(err));

        var extra = "NA"
    }

    return extra;

};

exports.getBoardId = function (){
    var boardID = nconf.get('auth:board:code');

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
