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
loglevel = nconf.get('config:log:loglevel');
log4js.addAppender(log4js.appenders.file(logfile));    
var logger = log4js.getLogger('plugin-apis');
logger.setLevel(loglevel);


var requestify = require('requestify');
var Q = require("q");


var ckan_addr = 'smartme-data.unime.it';
var ckan_host = 'http://'+ckan_addr;


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
	
        var payload = {                
              resource_id : m_resourceid,
              method: 'insert',
              records : record
        };
        
	var payloadJSON = JSON.stringify(payload);                                                    	
	
	var header = {
	  'Content-Type': "application/json", 
	  'Authorization' : m_authid,
	  'Content-Length': Buffer.byteLength(payloadJSON)
	};	
	
	var options = {
	    host: ckan_addr,
	    port: 80,
	    path: '/api/3/action/datastore_upsert',
	    method: 'POST',
	    headers: header
	};	


	var req = http.request(options, function(res) {
	  
	    res.setEncoding('utf-8');

	    var responseString = '';

	    res.on('data', function(data) {

		console.log('On data:' + data);
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