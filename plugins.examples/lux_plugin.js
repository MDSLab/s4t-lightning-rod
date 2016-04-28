exports.main = function (arguments){
  
    /* {"m_authid" : "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae", "m_resourceid" : "edfa2d34-bbfd-4556-bbd8-e2a027bf1c01", "pin" : "A1", "timer" : "5000", "autostart":"false"} */
    
    var pin = arguments.pin;
    var timer = arguments.timer;
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var api = require('../plugin-apis');
    var position = api.getPosition();
    
    var linino = require('ideino-linino-lib');
    var board = new linino.Board();

    
    board.connect(function() {
        
      setInterval(function(){
      
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
    
	    console.log("PAYLOAD:\n" + payloadJSON);
	    console.log("Brightness: " + ldr + " (lux) sent to CKAN\n\n");
    
	});	
	
	
      },timer);
      
    });
    
    
}