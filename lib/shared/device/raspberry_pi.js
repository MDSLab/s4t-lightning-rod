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

// var logger = require('../../utils/log4js-wrapper').getLogger("RaspberryPi");
var BaseDevice = require('./base');
var Proc = require('./util/proc');


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
    return Q();
};

/**
 * Returns a list of the processes running on a board
 *
 * @return {Q.Promise} which resolves to the [Process]
 */
RaspberryPiDevice.prototype.getProcessesList = function() {
    // todo test
    return Proc.getProcessesList();
};


// todo gpio


module.exports = RaspberryPiDevice;
