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


var nconf = require('nconf');

var ConfigError = require('./../utils/config-error');


var reverseState = new ReverseState();

/**
 * Reverse subsystem state
 *
 * @constructor
 */
function ReverseState() {
}

/**
 * Returns false if ReverseState is not loaded yet
 *
 * @returns {boolean}
 */
ReverseState.prototype.isLoaded = function () {
    // todo
    return true;
};

/**
 * Reloads Reverse subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
ReverseState.prototype.reload = function (nconf_) {
    var nconf = nconf_ || nconf;

    // todo validate
    var url_reverse = nconf.get('config:reverse:server:url_reverse');
    var port_reverse = nconf.get('config:reverse:server:port_reverse');
    var wstt_lib = nconf.get('config:reverse:lib:bin');

};

/**
 * Reverse subsystem singleton
 */
var Reverse = module.exports = {};

/**
 * Returns ReverseState
 *
 * @returns {ReverseState}
 */
Reverse.getState = function () {
    return reverseState;
};

