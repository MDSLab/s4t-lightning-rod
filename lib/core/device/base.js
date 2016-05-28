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

var Q = require('q');


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
 * @returns {int}
 */
BaseDevice.prototype.readDigital = function (pin) {
    throw new Error("Abstract method!");
};


/**
 * Write data to a digital pin
 *
 * @abstract
 * @param pin
 * @param value
 */
BaseDevice.prototype.writeDigital = function (pin, value) {
    throw new Error("Abstract method!");
};


/**
 * Read data from an analog pin
 *
 * @abstract
 * @param pin
 * @returns {*}
 */
BaseDevice.prototype.readAnalog = function (pin) {
    throw new Error("Abstract method!");
};


/**
 * Write data to an analog pin
 *
 * @abstract
 * @param pin
 * @param value
 */
BaseDevice.prototype.writeAnalog = function (pin, value) {
    throw new Error("Abstract method!");
};


/**
 * Set the mode of a pin
 *
 * @abstract
 * @param pin
 * @param mode
 */
// todo mode values ???
BaseDevice.prototype.setMode = function (pin, mode) {
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
