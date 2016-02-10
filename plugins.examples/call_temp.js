exports.main = function (arguments, callback){
    
    /* {"m_authid" : "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae", "m_resourceid" : "a1d59ee7-8098-41ce-bd3a-ddafd8046104", "pin" : "A0", "autostart":"false"} */
    
    var pin = arguments.pin;
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var api = require('../plugin-apis');
    var position = api.getPosition();
    
    var linino = require('ideino-linino-lib');
    board = new linino.Board();
    

    board.connect(function() {
    
	    var ADCres = 1023.0;
	    var Beta = 3950;		 
	    var Kelvin = 273.15;	  
	    var Rb = 10000;		       
	    var Ginf = 120.6685;	   
	  
	    var record = [];
	    var sensor = board.analogRead(pin);
	    var  Rthermistor = Rb * (ADCres / sensor - 1);
	    var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
	    var temp = _temperatureC - Kelvin;
	    
	    
	    record.push({
		Date: new Date().toISOString(),
		Temperature: temp,
		Altitude: position.altitude,
		Latitude: position.latitude, 
		Longitude: position.longitude  
	    });	
		    
	    api.sendToCKAN(m_authid, m_resourceid, record, function(payloadJSON){
	
		results="Temperature " + temp + " °C sent to CKAN\n\n";
		console.log("PAYLOAD:\n" + payloadJSON);
		console.log(results);
		callback("OK", results);
	
	    });

	
    });
    
}