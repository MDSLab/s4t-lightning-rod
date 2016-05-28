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
var ps = require('ps-node');

var Process = require('./util/process');
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
    var d = Q.defer();
    d.resolve();
    return d.promise;
};


/**
 * Returns a list of the processes running on a board
 *
 * @return {Q.Promise} which resolves to the [Process]
 */
LaptopDevice.prototype.getProcessesList = function () {
    var d = Q.defer();

    ps.lookup({}, function (error, result) {
        if (err) {
            d.reject(error);
            return;
        }

        var l = [];

        for (var i = 0; i < result.length; i++) {
            var p = result[i];
            l.append(new Process(p.pid, p.command, p.arguments, p.ppid));
        }
        d.resolve(l);
    });
    return d.promise;
};

module.exports = LaptopDevice;
