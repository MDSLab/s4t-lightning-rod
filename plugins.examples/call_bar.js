exports.main = function (arguments, callback){

    /* {"m_authid" : "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae", "m_resourceid" : "7ea0103b-6805-4d6f-ab08-a0281cf41a47", "autostart":"false"} */
      
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var api = require('../plugin-apis');
    var position = api.getPosition();
    
    var linino = require('ideino-linino-lib');
    var board = new linino.Board();
    
    board.addI2c('BAR', 'mpl3115', '0x60', 0);

    
    board.connect(function() {

	var record = [];
	
	var in_pressure_raw = board.i2cRead('BAR', 'in_pressure_raw');
	//var in_pressure_scale = board.i2cRead('BAR', 'in_pressure_scale');
	var pressure = in_pressure_raw*0.00025*10;
        
	
	record.push({
	    Date: new Date().toISOString(),
	    Pressure: pressure,
	    Altitude: position.altitude,
	    Latitude: position.latitude, 
	    Longitude: position.longitude  
	});	

	api.sendToCKAN(m_authid, m_resourceid, record, function(payloadJSON){
    
	    results="Pressure: " + pressure + " hPa";
	    console.log("PAYLOAD:\n" + payloadJSON);	
	    console.log(results);
	    callback("OK", results);
	});	
	

      
    });
    
    
    
    
    
}