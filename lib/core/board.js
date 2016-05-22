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
var BaseDevice = require('./device/base');


var boardState = new BoardState();

/**
 * Board subsystem state
 *
 * @constructor
 */
function BoardState() {
    this._device = null;
    this._deviceInstance = null;

    this._boardCode = null;

}

/**
 * Returns false if BoardState is not loaded yet
 *
 * @returns {boolean}
 */
BoardState.prototype.isLoaded = function () {
    return this._device !== null;
};


/**
 * Reloads Board subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
BoardState.prototype.reload = function (nconf_) {
    var nconf = nconf_ || nconf;

    if (this.isLoaded()) {
        if (this._device !== nconf.get('config:device')) {
            throw new ConfigError("config:device cannot be changed during the runtime");
        }
    } else {
        this._device = nconf.get('config:device');
        if (!this._device) {
            throw new ConfigError("config:device can't be empty");
        }

        this._deviceInstance = _initDeviceClass.call(this)();
    }

    // todo save state !!!!!
    // todo validate state
    this._boardCode = nconf.get('config:board:code');
    var reg_status = nconf.get('config:board:status');
    var board_position = nconf.get('config:board:position');

};


/**
 * Returns BaseDevice instance
 *
 * @throws {Error} if state is not loaded yet
 * @returns {BaseDevice}
 */
BoardState.prototype.getDevice = function () {
    if (!this.isLoaded())
        throw new Error("Not loaded yet");

    return this._deviceInstance;
};


/**
 * Returns Board code (UUID)
 *
 * @throws {Error} if state is not loaded yet
 */
BoardState.prototype.getBoardCode = function () {
    if (!this.isLoaded())
        throw new Error("Not loaded yet");

    return this._boardCode;
};

/**
 * Returns BaseDevice class for current device string
 *
 * @returns {BaseDevice}
 */
function _initDeviceClass() {
    if (this._device == "base") {
        throw new ConfigError("Cannot use abstract '" + this._device + "' device");
    }

    // reject strings containing special path symbols - dot and sep
    if (/[./\\]/.test(this._device)) {
        throw new ConfigError("Cannot use malicious '" + this._device + "' device string");
    }

    try {
        return require('./lib/device/' + this._device);
    }
    catch (e) {
        throw new ConfigError("Failed to load device '" + this._device + "'" + '\n' + e.stack);
    }
}

/**
 * Board subsystem singleton
 */
var Board = module.exports = {};

/**
 * Returns BoardState
 *
 * @returns {BoardState}
 */
Board.getState = function () {
    return boardState;
};
