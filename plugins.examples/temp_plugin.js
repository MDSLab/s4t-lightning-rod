//TO USE THIS PLUGIN DELETE ALL COMMENTs

exports.main = function (arguments){
    
    var pin = arguments.pin;
    var timer = arguments.timer;
    
    //CKAN data----------------------------------------------------------------
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var http = require('http');
    
    //Loading configuration file
    nconf = require('nconf');
    nconf.file ({file: 'settings.json'});
    
    //Get position
    var altitude = nconf.get('config:board:position:altitude');
    var longitude = nconf.get('config:board:position:longitude');
    var latitude = nconf.get('config:board:position:latitude'); 
    //-------------------------------------------------------------------------
    
    var linino = require('ideino-linino-lib');
    board = new linino.Board();

    
    board.connect(function() {
    
    
	var ADCres = 1023.0;
	var Beta = 3950;		  // Beta parameter
	var Kelvin = 273.15;	  // 0°C = 273.15 K
	var Rb = 10000;		       // 10 kOhm
	var Ginf = 120.6685;	   // Ginf = 1/Rinf
	
	setInterval(function(){
	  
	    //Drop records each time
	    var record = [];
	    
	    var sensor = board.analogRead(pin);
	    var  Rthermistor = Rb * (ADCres / sensor - 1);
	    var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
	    var cel = _temperatureC - Kelvin;
	    
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
		Temperature: cel,
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
		  //responseString += data;
		  //console.log('On Data: '+ responseString);
		});

		res.on('end', function() {
		  //var resultObject = JSON.parse(responseString);
		  //console.log('On End: ');
		  //console.dir(resultObject);
		});
	    });
	    

	    req.on('error', function(e) {
		console.log('On Error:'+e);
      
	    });

	    req.write(payloadJSON);

	    req.end();
	 

	    console.log("Temperature " + cel + " °C sent to CKAN");
	    
	    
	  },timer);
	
    });
    
}

