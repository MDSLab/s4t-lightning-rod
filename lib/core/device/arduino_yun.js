/*
 *				 Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino,
 *      Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto, Kostya Esmukov
 *
 */
"use strict";

var util = require('util');
var linino = require('ideino-linino-lib');
var Q = require('q');

var logger = require('../../utils/log4js-wrapper').getLogger("ArduinoYunLinioDevice");
var BaseDevice = require('./base');


/**
 * Arduino Yun device. Only Linio (arduino.org) OS is supported.
 *
 * @constructor
 */
function ArduinoYunLinioDevice() {
    BaseDevice.call(this);

}
util.inherits(ArduinoYunLinioDevice, BaseDevice);


/**
 * Perform board initialisation
 *
 * @returns {Q.Promise}
 */
ArduinoYunLinioDevice.prototype.init = function () {
    var r = Q.defer();

    /*
     //Writing to the watchdog file to signal I am alive
     require('shelljs/global');
     setInterval(function(){
     echo('1').to(‘/dev/watchdog’);
     },5000);
     */

    logger.info('[SYSTEM] - Board initialization...');

    var board = new linino.Board();

    // Given the way linino lib is designed we first need to connect to
    // the board and only then we can do anything else
    board.connect(function () {  // this function explicitly calls process.exit(1) on failure
        r.resolve();
    });

    return r.promise;
};


module.exports = ArduinoYunLinioDevice;
