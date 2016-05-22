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
var Q = require('q');

var logger = require('../../utils/log4js-wrapper').getLogger("Laptop");
var BaseDevice = require('./base');


/**
 * Device without GPIO support. Intended to be used for
 * debugging purposes.
 *
 * @constructor
 */
function LaptopDevice() {
    BaseDevice.call(this);

}
util.inherits(LaptopDevice, BaseDevice);


/**
 * Perform board initialisation.
 *
 * @returns {Q.Promise}
 */
LaptopDevice.prototype.init = function () {
    var r = Q.defer();
    r.resolve();
    return r.promise;
};

module.exports = LaptopDevice;
