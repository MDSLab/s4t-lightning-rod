/*
*				                  Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/

//service logging configuration: "managePins"
var logger = log4js.getLogger('managePins');
logger.setLevel(loglevel);

//Function to read data from a digital pin
function readDigital(args){
    try{
        var pin = args[2];
        value = board.digitalRead(pin);
        return value;
    }catch(ex){
        return ex.message;
    }
}

//Function to write data to a digital pin
function writeDigital(args){
    try{
        board.digitalWrite(args[2],parseInt(args[3]));
	logger.info("[GPIO] - Set PIN "+args[2]+" to "+parseInt(args[3]))
        return 0;
    }catch(ex){
        return ex.message;
    }
}

//Function to read data from an analog pin
function readAnalog(args){
    try{
        value = board.analogRead(args[2]);
        return value;
    }catch(ex){
        return ex.message;
    }
}

//Function to write data to an analog pin
function writeAnalog(args){
    try{
        board.analogWrite(args[2],parseInt(args[3]));
        return 0;   
    }catch(ex){
        return ex.message;
    }     
}

//Function to set the mode of a pin
function setMode(args){
    try{
        board.pinMode(args[0],args[1]);
        return 0;   
    }catch(ex){
        return ex.message;
    }
}

//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPins = function (session){
    
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.setmode', setMode);
    session.register(boardCode+'.command.rpc.read.digital', readDigital);
    session.register(boardCode+'.command.rpc.write.digital', writeDigital);
    session.register(boardCode+'.command.rpc.read.analog', readAnalog);
    session.register(boardCode+'.command.rpc.write.analog', writeAnalog);
    
    logger.info('[WAMP-EXPORTS] Pins exported to the cloud!');
    
};