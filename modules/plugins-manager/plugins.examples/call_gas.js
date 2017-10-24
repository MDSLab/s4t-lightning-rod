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

exports.main = function (arguments, callback){
    
    /* {"m_authid" : "", "m_resourceid" : "", "pin" : "A3", "autostart":"false"} */
    
    var pin = arguments.pin;
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    
    var api = require('../modules/plugins-manager/plugin-apis');
    var position = api.getPosition();
    
    var linino = require('ideino-linino-lib');
    board = new linino.Board();
    

    board.connect(function() {	   
	  
	    var record = [];


	    var sensor_volt;
	    var RS_air; /* Get the value of RS via in a clear air */
	    var R0;  /* Get the value of R0 via in LPG */
	    var sensorValue = 0;
	    var supplyVolt = 4.64;


	    /* NOTE: uncomment this part only to get an average of R0 among 100 samples */
	    /*--------------------------------------------------------------------*/
	    /*
	    for(var x = 0 ; x < 100 ; x++)
		    sensorValue = sensorValue + board.analogRead(pin);

	    sensorValue = sensorValue/100.0;

	    sensor_volt = sensorValue/1024*supplyVolt;
	    RS_air = (supplyVolt-sensor_volt)/sensor_volt;
	    R0 = RS_air/9.9;

	    results="R0: " + R0 + " ohm";
	    console.log("R0: " + R0 + " ohm");
	    */
	    /*--------------------------------------------------------------------*/


	    /* NOTE: uncomment this part ONLY AFTER got the averaged R0 */
	    /*--------------------------------------------------------------------*/
	    R0 = 98.4078884078884;

	    sensorValue = sensorValue + board.analogRead(pin);
	    sensor_volt = sensorValue/1024*supplyVolt;
	    RS_gas = (supplyVolt-sensor_volt)/sensor_volt;
	    ratio = RS_gas/R0;
	    /*--------------------------------------------------------------------*/

		
		
	    
	    record.push({
		Date: new Date().toISOString(),
		Gas: ratio,
		Altitude: position.altitude,
		Latitude: position.latitude, 
		Longitude: position.longitude  
	    });	
		    
	    api.sendToCKAN(m_authid, m_resourceid, record, function(payloadJSON){
	
		results="Concentration: " + ratio + " ppm";
		console.log("PAYLOAD:\n" + payloadJSON);
		console.log(results);
		callback("OK", results);
	
	    });

	
    });
    
}