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

var Process = require('./util/process');
var logger = require('../../utils/log4js-wrapper').getLogger("RaspberryPi");
var BaseDevice = require('./base');


/**
 * Raspberry Pi board.
 *
 * @constructor
 */
function RaspberryPiDevice() {
    BaseDevice.call(this);

}
util.inherits(RaspberryPiDevice, BaseDevice);


/**
 * Perform board initialisation.
 *
 * @returns {Q.Promise}
 */
RaspberryPiDevice.prototype.init = function () {
    var d = Q.defer();
    d.resolve();
    return d.promise;
};

// todo gpio
// todo processesList

module.exports = RaspberryPiDevice;
