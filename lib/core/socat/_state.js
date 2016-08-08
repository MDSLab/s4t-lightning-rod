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

var ConfigError = require('../../utils/config-error');


var socatState = module.exports = new SocatState();  // eslint-disable-line no-unused-vars

/**
 * Socat subsystem state
 * Don't ever cache it's results, because they might be changed at any time.
 *
 * @constructor
 */
function SocatState() {
    this._socatPort = null;
}


/**
 * Returns false if SocatState is not loaded yet
 *
 * @returns {boolean}
 */
SocatState.prototype.isLoaded = function () {
    return this._socatPort !== null;
};


/**
 * Reloads Socat subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
SocatState.prototype.reload = function (nconf_) {
    nconf_ = nconf_ || nconf;

    var socatPort = nconf_.get('config:socat:client:port');
    if (!socatPort) {
        throw new ConfigError("config:socat:client:port can't be empty");
    }

    this._socatPort = socatPort;
};
