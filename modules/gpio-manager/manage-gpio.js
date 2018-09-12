//############################################################################################
//##
//# Copyright (C) 2014-2018 Dario Bruneo, Francesco Longo, Andrea Rocco Lotronto, 
//# Giovanni Merlino, Nicola Peditto
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

//service logging configuration: "gpioManager"
var logger = log4js.getLogger('gpioManager');
logger.setLevel(loglevel);

var lyt_device = null;

var Q = require("q");

//Function to read data from a digital pin
function readDigital(args) {

    var d = Q.defer();
    
    lyt_device.readDigital(args, function (response) {

        d.resolve(response);
        
    });

    return d.promise;
    
}

//Wrapper function to set a digital pin
function writeDigital(args) {
    var d = Q.defer();

    lyt_device.writeDigital(args, function (response) {

        d.resolve(response);

    });

    return d.promise;
}

//Wrapper function to read the value from an analog pin
function readAnalog(args) {
    var d = Q.defer();

    lyt_device.readAnalog(args, function (response) {

        d.resolve(response);

    });

    return d.promise;
}

//Wrapper function to set an analog pin
function writeAnalog(args) {
    var d = Q.defer();

    lyt_device.writeAnalog(args, function (response) {

        d.resolve(response);

    });

    return d.promise;
}

//Wrapper function to set the mode of a pin
function setMode(args) {
    var d = Q.defer();

    lyt_device.setMode(args, function (response) {

        d.resolve(response);

    });

    return d.promise;
}

//This function exports all the functions in the module as WAMP remote procedure calls
exports.Init = function (session, device) {
    
    lyt_device = device;

    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+ boardCode + '.gpio.setmode', setMode);
    session.register('s4t.'+ boardCode + '.gpio.read.digital', readDigital);
    session.register('s4t.'+ boardCode + '.gpio.write.digital', writeDigital);
    session.register('s4t.'+ boardCode + '.gpio.read.analog', readAnalog);
    session.register('s4t.'+ boardCode + '.gpio.write.analog', writeAnalog);

    logger.info('[WAMP-EXPORTS] Pins exported to the cloud!');

};


//This function executes procedures at boot time (no Iotronic dependent)
exports.Boot = function (){

    logger.info('[BOOT] - GPIO Manager booting procedures not defined.');

};