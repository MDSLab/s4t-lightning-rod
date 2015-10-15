exports.main = function (arguments){
    
    var pin = arguments.pin;
    var timer = arguments.timer;
    
    
    var linino = require('ideino-linino-lib');
    var board = new linino.Board();

    
    board.connect(function() {
        
    setInterval(function(){
        var voltage = m_board.analogRead(pin);
        var ldr = (2500/(5-voltage*0.004887)-500)/3.3;
        console.log("Luminosity: " + ldr);
      },timer);

}