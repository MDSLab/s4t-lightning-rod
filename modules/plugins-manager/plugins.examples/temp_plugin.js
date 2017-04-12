exports.main = function (arguments){
    
    /* {"m_authid" : "", "m_resourceid" : "", "pin" : "A0", "timer" : "5000", "autostart":"false"} */
    
    var pin = arguments.pin;
    var timer = arguments.timer;
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var api = require('../modules/plugins-manager/plugin-apis');
    var position = api.getPosition();
    
    var linino = require('ideino-linino-lib');
    board = new linino.Board();
    

    board.connect(function() {
    
	var ADCres = 1023.0;
	var Beta = 3950;		 
	var Kelvin = 273.15;	  
	var Rb = 10000;		       
	var Ginf = 120.6685;	   
	
	setInterval(function(){
	  
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
	
		console.log("PAYLOAD:\n" + payloadJSON);
		console.log("Temperature " + temp + " °C sent to CKAN\n\n");
	
	    });

	    
	    
	  },timer);
	
    });
    
}