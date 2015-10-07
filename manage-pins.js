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
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    console.log('Exporting pins to the Cloud');
    
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.setmode', setMode);
    session.register(boardCode+'.command.rpc.read.digital', readDigital);
    session.register(boardCode+'.command.rpc.write.digital', writeDigital);
    session.register(boardCode+'.command.rpc.read.analog', readAnalog);
    session.register(boardCode+'.command.rpc.write.analog', writeAnalog);
}