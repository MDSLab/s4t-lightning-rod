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
var Proc = require('./util/proc');


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
    return Q.Promise(function (resolve, reject) {

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
            resolve();
        });

    }.bind(this));
};


/**
 * Read data from a digital pin
 *
 * @param pin
 * @returns {Q.Promise} function(int), where int is either 0 or 1.
 */
ArduinoYunLinioDevice.prototype.readDigital = function (pin) {
    return Q.Promise(function (resolve, reject) {
        resolve(this._board.digitalRead(pin));
    }.bind(this));
};


/**
 * Write data to a digital pin
 *
 * @param pin
 * @param value int: either 0 or 1.
 * @returns {Q.Promise}
 */
ArduinoYunLinioDevice.prototype.writeDigital = function (pin, value) {
    return Q.Promise(function (resolve, reject) {
        this._board.digitalWrite(pin, value);
        resolve();
    }.bind(this));
};


/**
 * Read data from an analog pin
 *
 * @param pin
 * @returns {Q.Promise} function(int), where int is in range [0, 1023]
 */
ArduinoYunLinioDevice.prototype.readAnalog = function (pin) {
    return Q.Promise(function (resolve, reject) {
        resolve(this._board.analogRead(pin));
    }.bind(this));
};


/**
 * Write data to an analog pin
 *
 * @param pin
 * @param value, int, in range [0, 100]
 * @returns {Q.Promise}
 */
// todo suggest using wider range, like [0, 255]
ArduinoYunLinioDevice.prototype.writeAnalog = function (pin, value) {
    return Q.Promise(function (resolve, reject) {
        this._board.analogWrite(pin, value);
        resolve();
    }.bind(this));
};


/**
 * Set the mode of a pin
 *
 * @throws {Error} if mode is unknown
 * @param pin
 * @param mode one if PINMODE values
 * @returns {Q.Promise}
 */
ArduinoYunLinioDevice.prototype.setMode = function (pin, mode) {
    var modeMap = {};  // -> [mode, pullup]
    modeMap[this.PINMODES.INPUT] = [this._board.MODES.INPUT, false];
    modeMap[this.PINMODES.INPUT_PULLUP] = [this._board.MODES.INPUT, true];
    modeMap[this.PINMODES.OUTPUT] = [this._board.MODES.OUTPUT, false];

    return Q.Promise(function (resolve, reject) {

        if (modeMap[mode] === undefined) {
            throw new Error("Unknown mode: " + mode);
        }

        this._board.pinMode(pin, modeMap[mode][0], modeMap[mode][1]);
        resolve();
    }.bind(this));
};


/**
 * Returns a list of the processes running on a board
 *
 * @return {Q.Promise} which resolves to the [Process]
 */
ArduinoYunLinioDevice.prototype.getProcessesList = function () {
    return Proc.getProcessesList();
};


module.exports = ArduinoYunLinioDevice;
