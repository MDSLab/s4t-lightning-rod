exports.main = function (arguments){
    
    var pin = arguments.pin;
    var timer = arguments.timer;
    
    
    var linino = require('ideino-linino-lib');
    board = new linino.Board();

    
    board.connect(function() {
    
    
    var ADCres = 1023.0;
    var Beta = 3950;		  // Beta parameter
    var Kelvin = 273.15;	  // 0°C = 273.15 K
    var Rb = 10000;		       // 10 kOhm
    var Ginf = 120.6685;	   // Ginf = 1/Rinf
    setInterval(function(){
        var sensor = board.analogRead(pin);
        var  Rthermistor = Rb * (ADCres / sensor - 1);
        var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
        var cel = _temperatureC - Kelvin;
        console.log("Temperature: " + cel);
      },timer);
    });
}
