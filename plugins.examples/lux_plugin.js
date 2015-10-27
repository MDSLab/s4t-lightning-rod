exports.main = function (arguments){
    
    var pin = arguments.pin;
    var timer = arguments.timer;

    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var http = require('http');

    nconf = require('nconf');
    nconf.file ({file: 'settings.json'});

    var altitude = nconf.get('config:board:position:altitude');
    var longitude = nconf.get('config:board:position:longitude');
    var latitude = nconf.get('config:board:position:latitude'); 
    
    var linino = require('ideino-linino-lib');
    var board = new linino.Board();

    
    board.connect(function() {
        
      setInterval(function(){
      
	var record = [];
	    
        var voltage = board.analogRead(pin);
        var ldr = (2500/(5-voltage*0.004887)-500)/3.3;
        
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
	
	record.push({
	    Date: new Date().toISOString(),
	    Brightness: ldr,
	    Altitude: altitude,
	    Latitude: latitude, 
	    Longitude: longitude  
	});

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
      
	console.log("PAYLOAD:\n" + payloadJSON);	
	console.log("Brightness: " + ldr + " (lux) sent to CKAN");

	
      },timer);
      
    });
    
}