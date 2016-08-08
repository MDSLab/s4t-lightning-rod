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


var wampState = require('./_state');


/**
 * WAMP subsystem singleton
 */
var WAMP = module.exports = {};

/**
 * Returns WAMPState
 *
 * @returns {WAMPState}
 */
WAMP.getState = function () {
    return wampState;
};
