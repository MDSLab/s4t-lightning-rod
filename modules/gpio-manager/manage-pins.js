/*
 *				                  Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
 * 
 */

//service logging configuration: "managePins"
var log4js = require('log4js');
var logger = log4js.getLogger('managePins');

var response = {
    message: '',
    result: ''
};

//Function to read data from a digital pin
function readDigital(args) {
    try {
        var pin = args[2];
        var value = board.digitalRead(pin);
        response.message = value;
        response.result = "SUCCESS";
        logger.info("[GPIO] - readDigital: " + response.message);
        return response;
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - readDigital: " + response.message);
        return response;
    }
}

//Function to write data to a digital pin
function writeDigital(args) {
    try {
        board.digitalWrite(args[2], parseInt(args[3]));
        response.message = "Set digital PIN " + args[2] + " to " + parseInt(args[3]);
        response.result = "SUCCESS";
        logger.info("[GPIO] - writeDigital: " + response.message);
        return response;
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - writeDigital: " + response.message);
        return response;
    }
}

//Function to read data from an analog pin
function readAnalog(args) {
    try {
        var value = board.analogRead(args[2]);
        response.message = value;
        response.result = "SUCCESS";
        logger.info("[GPIO] - readAnalog: " + response.message);
        return response;


    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - readAnalog: " + response.message);
        return response;
    }
}

//Function to write data to an analog pin
function writeAnalog(args) {
    try {
        board.analogWrite(args[2], parseInt(args[3]));
        response.message = "Set analog PIN " + args[2] + " to " + parseInt(args[3]);;
        response.result = "SUCCESS";
        logger.info("[GPIO] - writeAnalog: " + response.message);
        return response;
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - writeAnalog: " + response.message);
        return response;
    }
}

//Function to set the mode of a pin
function setMode(args) {
    try {
        board.pinMode(args[0], args[1]);
        response.message = "PIN " + args[0] + " in " + args[1] + " mode.";
        response.result = "SUCCESS";
        logger.info("[GPIO] - SetMode: " + response.message);
        return response;
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - SetMode: " + response.message);
        return response;
    }
}

//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPins = function (session) {

    //Register all the module functions as WAMP RPCs
    session.register(boardCode + '.command.rpc.setmode', setMode);
    session.register(boardCode + '.command.rpc.read.digital', readDigital);
    session.register(boardCode + '.command.rpc.write.digital', writeDigital);
    session.register(boardCode + '.command.rpc.read.analog', readAnalog);
    session.register(boardCode + '.command.rpc.write.analog', writeAnalog);

    logger.info('[WAMP-EXPORTS] Pins exported to the cloud!');

};