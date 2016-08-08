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


/**
 * Base abstract class for devices
 *
 * @constructor
 * @abstract
 */
function BaseDevice() {
    if (this.constructor === BaseDevice) {
        throw new Error("Can't instantiate abstract class!");
    }

}

/**
 * Setmode modes of pins
 */
BaseDevice.prototype.PINMODES = {
    INPUT: "input",
    INPUT_PULLUP: "input_pullup",
    OUTPUT: "output"
};


/**
 * Perform board initialisation
 *
 * @abstract
 * @returns {Q.Promise}
 */
BaseDevice.prototype.init = function () {
    throw new Error("Abstract method!");
};


/**
 * Read data from a digital pin
 *
 * @abstract
 * @param pin
 * @returns {Q.Promise} function(int), where int is either 0 or 1.
 */
BaseDevice.prototype.readDigital = function (pin) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};


/**
 * Write data to a digital pin
 *
 * @abstract
 * @param pin
 * @param value int: either 0 or 1.
 * @returns {Q.Promise}
 */
BaseDevice.prototype.writeDigital = function (pin, value) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};


/**
 * Read data from an analog pin
 *
 * @abstract
 * @param pin
 * @returns {Q.Promise} function(int), where int is in range [0, 1023]
 */
BaseDevice.prototype.readAnalog = function (pin) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};


/**
 * Write data to an analog pin
 *
 * @abstract
 * @param pin
 * @param value, int, in range [0, 100]
 * @returns {Q.Promise}
 */
// todo consider using wider range, like [0, 255]
BaseDevice.prototype.writeAnalog = function (pin, value) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};


/**
 * Set the mode of a pin
 *
 * @abstract
 * @throws {Error} if mode is unknown
 * @param pin
 * @param mode one if PINMODE values
 * @returns {Q.Promise}
 */
BaseDevice.prototype.setMode = function (pin, mode) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};

/**
 * Returns a list of the processes running on a board
 *
 * @abstract
 * @return {Q.Promise} which resolves to the [Process]
 */
BaseDevice.prototype.getProcessesList = function() {
    throw new Error("Abstract method!");
};

module.exports = BaseDevice;
