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

    this._board = null;
}
util.inherits(ArduinoYunLinioDevice, BaseDevice);


/**
 * Perform board initialisation
 *
 * @returns {Q.Promise}
 */
ArduinoYunLinioDevice.prototype.init = function () {
    var d = Q.defer();

    /*
     //Writing to the watchdog file to signal I am alive
     require('shelljs/global');
     setInterval(function(){
     echo('1').to(‘/dev/watchdog’);
     },5000);
     */

    logger.info('[SYSTEM] - Board initialization...');

    this._board = new linino.Board();

    // Given the way linino lib is designed we first need to connect to
    // the board and only then we can do anything else
    this._board.connect(function () {  // this function explicitly calls process.exit(1) on failure
        d.resolve();
    });

    return d.promise;
};


/**
 * Read data from a digital pin
 *
 * @param pin
 * @returns {int}
 */
ArduinoYunLinioDevice.prototype.readDigital = function (pin) {
    return this._board.digitalRead(pin);
};


/**
 * Write data to a digital pin
 *
 * @param pin
 * @param value
 */
ArduinoYunLinioDevice.prototype.writeDigital = function (pin, value) {
    this._board.digitalWrite(pin, value);
};


/**
 * Read data from an analog pin
 *
 * @param pin
 * @returns {*}
 */
ArduinoYunLinioDevice.prototype.readAnalog = function (pin) {
    return this._board.analogRead(pin);
};


/**
 * Write data to an analog pin
 *
 * @param pin
 * @param value
 */
ArduinoYunLinioDevice.prototype.writeAnalog = function (pin, value) {
    this._board.analogWrite(pin, value);
};


/**
 * Set the mode of a pin
 *
 * @param pin
 * @param mode
 */
// todo mode values ???
ArduinoYunLinioDevice.prototype.setMode = function (pin, mode) {
    this._board.pinMode(pin, mode);
};


/**
 * Returns a list of the processes running on a board
 *
 * @return {Q.Promise} which resolves to the [Process]
 */
ArduinoYunLinioDevice.prototype.getProcessesList = function() {
    throw new Error("Abstract method!");
    // todo use ps-node (as in laptop) or carefully obtain it by ourselves?
};



module.exports = ArduinoYunLinioDevice;
