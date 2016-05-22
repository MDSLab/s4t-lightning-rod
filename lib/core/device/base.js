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


module.exports = BaseDevice;
