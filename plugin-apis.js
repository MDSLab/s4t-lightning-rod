/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
* 
*/

nconf = require('nconf');
nconf.file ({file: 'settings.json'});

log4js = require('log4js');
log4js.loadAppender('file');


logfile = nconf.get('config:log:logfile');
log4js.addAppender(log4js.appenders.file(logfile));    
var logger = log4js.getLogger('plugin-apis');
try{
  
    loglevel = nconf.get('config:log:loglevel');
    if (loglevel === undefined){
      logger.setLevel('INFO');
      //logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO'); 
    }else{
      logger.setLevel(loglevel);
      //logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel); 
    }
}
catch(err){
    //logger.error('[SYSTEM] - Error in parsing loglevel parameter from settings.json: '+ err);
    logger.setLevel('INFO');
    //logger.warn('[SYSTEM] - Log level applied: INFO');

}


var requestify = require('requestify');
var Q = require("q");



var ckan_host = 'http://smartme-data.unime.it';

exports.getLogger = function (){
    
    return logger;
    
}


    
exports.getPosition = function (){
    var altitude = nconf.get('config:board:position:altitude');
    var longitude = nconf.get('config:board:position:longitude');
    var latitude = nconf.get('config:board:position:latitude'); 
    
    var position = {altitude: altitude, longitude: longitude, latitude: latitude}
    
    return position;
}

exports.getBoardId = function (){
    var boardID = nconf.get('config:board:code');
    
    return boardID;
}


exports.getLocalTime = function (){

	var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
	var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	
	return localISOTime

}

exports.getUtcTime = function (){

	return new Date().toISOString()

}

exports.sendToCKAN = function (m_authid, m_resourceid, record, callback){
  
	var http = require('http');
	
	
	var header = {
	  'Content-Type': "application/json", 
	  'Authorization' : m_authid
	};	
	
	var options = {
	    host: 'smartme-data.unime.it',
	    port: 80,
	    path: '/api/3/action/datastore_upsert',
	    method: 'POST',
	    headers: header
	};	


	var payload = {
	    resource_id : m_resourceid, 
	    method: 'insert', 
	    records : record
	};	
	
	
	var payloadJSON = JSON.stringify(payload);
	
	
	var req = http.request(options, function(res) {
	  
	    res.setEncoding('utf-8');

	    var responseString = '';

	    res.on('data', function(data) {

	    });

	    res.on('end', function() {

	    });
	    
	});	
	
	req.on('error', function(e) {
	    console.log('On Error:' + e);
	});

	req.write(payloadJSON);

	req.end();	
	
	callback(payloadJSON);
	
}


exports.getCKANdataset = function(id, callback){  

	requestify.get(ckan_host + '/api/rest/dataset/'+id).then( function(response) {

	  var dataCKAN = response.getBody();

	  callback(dataCKAN);
	  
	});
 
} 