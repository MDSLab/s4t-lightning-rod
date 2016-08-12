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

var BaseWAMPRegistration = require('./base');


/**
 * WAMP registration holder for autobahn
 *
 * @param registration {autobahn.Registration}
 * @constructor
 */
function AutobahnRegistration(registration) {
    BaseWAMPRegistration.call(this);

    /**
     * @type {autobahn.Registration}
     */
    this.registration = registration;
}
util.inherits(AutobahnRegistration, BaseWAMPRegistration);


module.exports = AutobahnRegistration;
