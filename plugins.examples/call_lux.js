exports.main = function (arguments, callback){

    /* {"m_authid" : "", "m_resourceid" : "", "pin" : "A1", "autostart":"false"} */
      
    var pin = arguments.pin;
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var api = require('../plugin-apis');
    var position = api.getPosition();
    
    var linino = require('ideino-linino-lib');
    var board = new linino.Board();

    
    board.connect(function() {

	var record = [];
        var voltage = board.analogRead(pin);
        var ldr = (2500/(5-voltage*0.004887)-500)/3.3;
        
	
	record.push({
	    Date: new Date().toISOString(),
	    Brightness: ldr,
	    Altitude: position.altitude,
	    Latitude: position.latitude, 
	    Longitude: position.longitude  
	});	

	api.sendToCKAN(m_authid, m_resourceid, record, function(payloadJSON){
    
	    results="Brightness: " + ldr + " (lux) sent to CKAN";
	    console.log("PAYLOAD:\n" + payloadJSON);	
	    console.log(results);
	    callback("OK", results);
	});	
	

      
    });
    
    
    
}