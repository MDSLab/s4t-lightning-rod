exports.elaborate = function (raw_data){
    var ADCres = 1023.0;
    var Beta = 3950;		// Beta parameter
    var Kelvin = 273.15;	   	// 0°C = 273.15 K
    var Rb = 10000;		// 10 kOhm
    var Ginf = 120.6685;	   	// Ginf = 1/Rinf
    //var volt =  (sensor / 1024.0) * 4.54;
    //var cel = (volt - 0.5) * 100;  
    var  Rthermistor = Rb * (ADCres / raw_data - 1);
    var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
    return _temperatureC - Kelvin;
}