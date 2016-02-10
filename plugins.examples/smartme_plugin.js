exports.main = function (arguments){
    
    /*ARGUMENTS---------------------------------------*/

      /*
	  {
	    "m_authid" : "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae", 
	    "autostart": "false",
	    "timer" : "60000",
	    "temp_sensor": 
		      {
			"m_resourceid" : "a24e8093-694c-4b8d-bf7d-2ac03156fbc8", 
			"pin" : "A0", 
			"enabled":"true"
		      },
	    "lux_sensor":
		      {
			"m_resourceid" : "bf3760ad-bfb8-4cc8-a2a0-5a40f786e2ea", 
			"pin" : "A1", 
			"enabled":"true"	    
		      },
	    "hum_sensor":
		      {
			"m_resourceid" : "30564293-932c-475e-a24e-3ed275e0f05a", 
			"pin" : "A2", 
			"enabled":"true"	    
		      },	    
	    "gas_sensor":
		      {
			"m_resourceid" : "70acace7-92c8-4956-b83e-5e76952cc682", 
			"pin" : "A3", 
			"enabled":"true"	    
		      },	    
	    "bar_sensor":
		      {
			"m_resourceid" : "ad879180-033b-427b-926e-97d6b51235ed", 
			"enabled":"true"	    
		      }		 
	  }
      */
  


  
    var timer = arguments.timer;
    
    var pin_temp = arguments.temp_sensor.pin;
    var pin_lux = arguments.lux_sensor.pin;
    var pin_hum = arguments.hum_sensor.pin;
    var pin_gas = arguments.gas_sensor.pin;

    var m_authid = arguments.m_authid;
    
    var temp_resourceid = arguments.temp_sensor.m_resourceid;
    var lux_resourceid = arguments.lux_sensor.m_resourceid;
    var hum_resourceid = arguments.hum_sensor.m_resourceid;
    var gas_resourceid = arguments.gas_sensor.m_resourceid;
    var bar_resourceid = arguments.bar_sensor.m_resourceid;
    
    /*------------------------------------------------*/


    
    var api = require('../plugin-apis');
    var position = api.getPosition();
    
    
    var linino = require('ideino-linino-lib');
    var board = new linino.Board();
	
    /*FOR BAR SENSOR*/
    board.addI2c('BAR', 'mpl3115', '0x60', 0);
    
    var sensor_list = ['temp', 'lux', 'hum', 'gas', 'bar'];
    
    board.connect(function() {
        
      setInterval(function(){
	
	
	/*FOR LUX SENSOR*/
        var lux_temp = board.analogRead(pin_lux);
        var ldr = (2500/(5-lux_temp*0.004887)-500)/3.3;
	
	/*FOR TEMP SENSOR*/
	var ADCres = 1023.0;
	var Beta = 3950;		 
	var Kelvin = 273.15;	  
	var Rb = 10000;		       
	var Ginf = 120.6685;
	var temp_volt = board.analogRead(pin_temp);
	var Rthermistor = Rb * (ADCres / temp_volt - 1);
	var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
	var temp = _temperatureC - Kelvin;
	
	
	
	/*FOR HUM SENSOR*/
	var degreesCelsius = temp; 
	var supplyVolt = 4.64;
	var HIH4030_Value = board.analogRead(pin_hum);
	var voltage = HIH4030_Value/1023. * supplyVolt; 
	var sensorRH = 161.0 * voltage / supplyVolt - 25.8;
	var relativeHumidity = sensorRH / (1.0546 - 0.0026 * degreesCelsius);  
	
	
	/*FOR GAS SENSOR*/
	var sensor_volt;
	var RS_air; /* Get the value of RS via in a clear air */
	var R0;  /* Get the value of R0 via in LPG */
	var sensorValue = 0;
	var supplyVolt = 4.64;
	/*GET R0-----------------------------------------------------*/
	//R0 = 98.4078884078884
	 for(var x = 0 ; x < 100 ; x++){
	    sensorValue = sensorValue + board.analogRead(pin_gas);
	 }

	sensorValue = sensorValue/100.0;

	sensor_volt = sensorValue/1024*supplyVolt;
	RS_air = (supplyVolt-sensor_volt)/sensor_volt;
	R0 = RS_air/9.9;
	/*-----------------------------------------------------------*/
	
	sensorValue = board.analogRead(pin_gas);
	sensor_volt = sensorValue/1024*supplyVolt;
	RS_gas = (supplyVolt-sensor_volt)/sensor_volt;
	ratio = RS_gas/R0;



	/*FOR BAR SENSOR*/
	var in_pressure_raw = board.i2cRead('BAR', 'in_pressure_raw');
	var pressure = in_pressure_raw*0.00025*10;
	
	
	for(var i = 0; i < sensor_list.length; i++) {
	  
	    (function(i) {
	      
		
		if (sensor_list[i] == "temp"){
		  
		      var record = [];
		      
		      record.push({
			  Date: new Date().toISOString(),
			  Temperature: temp,
			  Altitude: position.altitude,
			  Latitude: position.latitude, 
			  Longitude: position.longitude  
		      });	
			      
		      api.sendToCKAN(m_authid, temp_resourceid, record, function(payloadJSON){
		  
			  //console.log("PAYLOAD:\n" + payloadJSON);
			  console.log("\n\nTemperature " + temp + " °C");
		  
		      });
		    
		}
		else if (sensor_list[i] == "lux"){
		
		      var record = [];
		  
		      record.push({
			  Date: new Date().toISOString(),
			  Brightness: ldr,
			  Altitude: position.altitude,
			  Latitude: position.latitude, 
			  Longitude: position.longitude  
		      });
		      
		      api.sendToCKAN(m_authid, lux_resourceid, record, function(payloadJSON){
		  
			  //console.log("PAYLOAD:\n" + payloadJSON);
			  console.log("Brightness: " + ldr + " (lux)");
		  
		      });	
		  
		}
		else if (sensor_list[i] == "hum"){
		  
		    var record = [];
		    
		    record.push({
			Date: new Date().toISOString(),
			Humidity: relativeHumidity,
			Altitude: position.altitude,
			Latitude: position.latitude, 
			Longitude: position.longitude  
		    });	

		    
		    api.sendToCKAN(m_authid, hum_resourceid, record, function(payloadJSON){
		
			//console.log("PAYLOAD:\n" + payloadJSON);
			console.log("Humidity " + relativeHumidity + " percent (with "+temp+" °C)");
		
		    });
		    
		}
		else if (sensor_list[i] == "gas"){
		  
		    var record = [];
		    
		    record.push({
			Date: new Date().toISOString(),
			Gas: ratio,
			Altitude: position.altitude,
			Latitude: position.latitude, 
			Longitude: position.longitude  
		    });	

		    
		    api.sendToCKAN(m_authid, gas_resourceid, record, function(payloadJSON){
		
			//console.log("PAYLOAD:\n" + payloadJSON);
			console.log("GAS concentration: " + ratio + " ppm");
		
		    });
		    
		}
		else if (sensor_list[i] == "bar"){
		  
		    var record = [];
		    
		    
		    record.push({
			Date: new Date().toISOString(),
			Pressure: pressure,
			Altitude: position.altitude,
			Latitude: position.latitude, 
			Longitude: position.longitude  
		    });

		    
		    api.sendToCKAN(m_authid, gas_resourceid, record, function(payloadJSON){
		
			//console.log("PAYLOAD:\n" + payloadJSON);
			console.log("Pressure: " + pressure + " hPa");
		
		    });
		    
		    
		}
		else{
		  console.log("NO SENSORS!\n\n");

		}
	      
	      
		

		
		
	      
	    })(i);  
	} 
	      

		
	

	
      },timer);
      
    });
    
}
