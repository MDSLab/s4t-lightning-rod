//############################################################################################
//##
//# Copyright (C) 2017 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
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


var util = require('util');

var Device = require('./Device');

function ArduinoYunDevice(name) {

    Device.call(this);

    this.name = name;

    /*
     Digital PIN mapping on lininoIO

     -------------------------
     GPIO n.     PIN
     104	        D8
     105	        D9
     106	        D10
     107	        D11
     114	        D5
     115	        D13
     116	        D3
     117	        D2
     120	        D4
     122	        D12
     123	        D6

     */

}

util.inherits(ArduinoYunDevice, Device);

var response = {
    message: '',
    result: ''
};

ArduinoYunDevice.prototype.Main = function (wampConnection, logger){

    //Connecting to the board
    var linino = require('ideino-linino-lib');
    board = new linino.Board();
    logger.info('[SYSTEM] - Arduino YUN board initialization...');

    //Given the way linino lib is designed we first need to connect to the board and only then we can do anything else
    board.connect(function() {

        // CONNECTION TO WAMP SERVER --------------------------------------------------------------------------
        logger.info('[WAMP] - Opening connection to WAMP server...');
        
        // connectionTester: library used to check the reachability of Iotronic-Server/WAMP-Server
        var connectionTester = require('connection-tester');

        var checkIotronicWampConnection = setInterval(function(){

            connectionTester.test(wampIP, port_wamp, 10000, function (err, output) {

                var reachable = output.success;
                var error_test = output.error;

                if (!reachable) {
                    //CONNECTION STATUS: FALSE
                    logger.warn("[SYSTEM] - INTERNET BOOT STATUS: " + reachable + " - ERROR: " + error_test);
                }
                else {

                    clearInterval( checkIotronicWampConnection );

                    wampConnection.open();

                }

            });

        }, 30000);


        connectionTester.test(wampIP, port_wamp, 10000, function (err, output) {

            var reachable = output.success;
            var error_test = output.error;

            if (!reachable) {
                //CONNECTION STATUS: FALSE
                logger.warn("[SYSTEM] - INTERNET BOOT STATUS: " + reachable + " - ERROR: " + error_test);
            }
            else {

                clearInterval( checkIotronicWampConnection );

                wampConnection.open();

            }

        });


        //-----------------------------------------------------------------------------------------------------

    });


};


//Function to read data from a digital pin
ArduinoYunDevice.prototype.readDigital = function(args, callback) {
    try {
        var pin = args[2];
        var value = board.digitalRead(pin);
        response.message = value;
        response.result = "SUCCESS";
        logger.info("[GPIO] - readDigital: " + response.message);
        callback(response);
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - readDigital: " + response.message);
        callback(response);
    }

};


//Function to read data from an analog pin
ArduinoYunDevice.prototype.readAnalog = function(args, callback) {
    try {
        var value = board.analogRead(args[2]);
        response.message = value;
        response.result = "SUCCESS";
        logger.info("[GPIO] - readAnalog: " + response.message);
        callback(response);


    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - readAnalog: " + response.message);
        callback(response);
    }

};


//Function to write data to an analog pin
ArduinoYunDevice.prototype.writeAnalog = function(args, callback) {
    try {
        board.analogWrite(args[2], parseInt(args[3]));
        response.message = "Set analog PIN " + args[2] + " to " + parseInt(args[3]);;
        response.result = "SUCCESS";
        logger.info("[GPIO] - writeAnalog: " + response.message);
        callback(response);
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - writeAnalog: " + response.message);
        callback(response);
    }

};


//Function to write data to a digital pin
ArduinoYunDevice.prototype.writeDigital = function(args, callback) {
    try {
        board.digitalWrite(args[2], parseInt(args[3]));
        response.message = "Set digital PIN " + args[2] + " to " + parseInt(args[3]);
        response.result = "SUCCESS";
        logger.info("[GPIO] - writeDigital: " + response.message);
        callback(response);
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - writeDigital: " + response.message);
        callback(response);
    }

};


//Function to set the mode of a pin
ArduinoYunDevice.prototype.setMode = function(args, callback) {
    try {
        board.pinMode(args[0], args[1]);
        response.message = "PIN " + args[0] + " in " + args[1] + " mode.";
        response.result = "SUCCESS";
        logger.info("[GPIO] - SetMode: " + response.message);
        callback(response);
    } catch (ex) {
        response.message = ex.message;
        response.result = "ERROR";
        logger.error("[GPIO] - SetMode: " + response.message);
        callback(response);
    }

};


module.exports = ArduinoYunDevice;