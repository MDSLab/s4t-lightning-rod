//############################################################################################
//##
//# Copyright (C) 2015-2016 Nicola Peditto
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