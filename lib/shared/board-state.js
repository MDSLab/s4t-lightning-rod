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
// var logger = require('./../utils/log4js-wrapper').getLogger("Board");
var nconfWrapper = require('./../utils/nconf-wrapper');


/**
 * Represents Border geoposition
 * @param position
 * @constructor
 */
function BoardPosition(position) {
    if (position === undefined
        || position === null
        || position === "") {

        position = {
            altitude: null,
            longitude: null,
            latitude: null
        };
    }

    if (position.altitude === undefined
        || position.longitude === undefined
        || position.latitude === undefined) {

        throw new ConfigError("Unable to load the board position");
    }

    this.altitude = position.altitude;
    this.longitude = position.longitude;
    this.latitude = position.latitude;
}

BoardPosition.prototype.getRawObject = function () {
    return {
        altitude: this.altitude,
        longitude: this.longitude,
        latitude: this.latitude
    };
};


/**
 * Board subsystem state.
 * Don't ever cache it's results, because they might be changed at any time.
 *
 * @constructor
 */
function BoardState() {
    this._device = null;
    this._deviceInstance = null;
    this._localServices = null;
    this._position = null;

    this._boardCode = null;

}

BoardState.prototype.REGISTRATION_STATUSES = {
    NEW: "new",
    REGISTERED: "registered"
};

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
    nconf_ = nconf_ || nconf;

    if (this.isLoaded()) {
        if (this._device !== nconf_.get('config:device')) {
            throw new ConfigError("config:device cannot be changed during the runtime");
        }
    } else {
        this._device = nconf_.get('config:device');
        if (!this._device) {
            throw new ConfigError("config:device can't be empty");
        }

        this._deviceInstance = new (_initDeviceClass.call(this))();
    }

    var localServices = nconf_.get('config:board:services') || {};

    var boardCode = nconf_.get('config:board:code');
    if (!boardCode) {
        // todo is this a UUID? why can't we generate it here?
        throw new ConfigError("config:board:code can't be empty");
    }

    // all settings below are settable

    this._positionNconfPath = 'config:board:position';
    var position = new BoardPosition(nconf_.get(this._positionNconfPath));

    this._registrationStatusNconfPath = 'config:board:status';
    var registrationStatus = _validateRegistrationStatus.call(this,
        nconf_.get(this._registrationStatusNconfPath));

    this._localServices = localServices;
    this._position = position;
    this._boardCode = boardCode;
    this._registrationStatus = registrationStatus;
};


function _validateRegistrationStatus(registrationStatus) {
    if (registrationStatus !== this.REGISTRATION_STATUSES.NEW
        && registrationStatus !== this.REGISTRATION_STATUSES.REGISTERED) {
        // todo why can't we just fallback to 'registered' in this case?
        throw new ConfigError("config:board:status must be either '"
            + this.REGISTRATION_STATUSES.NEW + "' or '"
            + this.REGISTRATION_STATUSES.REGISTERED + "'");
    }

    return registrationStatus;
}

function _saveState() {
    nconf.set(this._positionNconfPath, this._position.getRawObject());
    nconf.set(this._registrationStatusNconfPath, this._registrationStatus);

    return nconfWrapper.save();
}


/**
 * Returns local port for the specified service
 *
 * @throws {Error} if state is not loaded yet
 * @throws {Error} if there is no port for that service in settings
 * @param service
 * @returns {int}
 */
BoardState.prototype.getLocalPortForService = function (service) {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    var r = this._localServices[service];
    if (!r || !r.port) {
        throw new Error("No local port for service " + service + " found");
    }

    return r.port;
};

/**
 * Returns BaseDevice instance
 *
 * @throws {Error} if state is not loaded yet
 * @returns {BaseDevice}
 */
BoardState.prototype.getDevice = function () {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return this._deviceInstance;
};

/**
 * Returns Board code (UUID)
 *
 * @throws {Error} if state is not loaded yet
 */
BoardState.prototype.getBoardCode = function () {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return this._boardCode;
};

/**
 * Returns Board location
 *
 * @throws {Error} if state is not loaded yet
 * @returns {BoardPosition}
 */
BoardState.prototype.getBoardPosition = function () {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return this._position;
};


/**
 * Sets board position.
 *
 * @param boardPosition {BoardPosition} or {altitude, longitude, latitude}
 * @throws {Error} if state is not loaded yet
 * @throws {ConfigError} if boardPosition is corrupted
 * @returns {Q.Promise}
 */
BoardState.prototype.setBoardPosition = function (boardPosition) {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    if (!(boardPosition instanceof BoardPosition)) {
        boardPosition = new BoardPosition(boardPosition);
    }

    this._position = boardPosition;

    return _saveState.call(this);
};


/**
 * Returns Board registration status (new/registered)
 *
 * @throws {Error} if state is not loaded yet
 * @returns {string} one of the REGISTRATION_STATUSES values
 */
BoardState.prototype.getRegistrationStatus = function () {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return this._registrationStatus;
};


/**
 * Sets registration status
 *
 * @param registrationStatus one of the REGISTRATION_STATUSES values
 * @throws {Error} if state is not loaded yet
 * @throws {ConfigError} if registrationStatus is corrupted
 * @returns {Q.Promise}
 */
BoardState.prototype.setRegistrationStatus = function (registrationStatus) {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    this._registrationStatus = _validateRegistrationStatus.call(this, registrationStatus);

    return _saveState.call(this);
};

/**
 * Returns BaseDevice class for current device string
 *
 * @returns {BaseDevice}
 */
function _initDeviceClass() {
    if (this._device === "base") {
        throw new ConfigError("Cannot use abstract '" + this._device + "' device");
    }

    // reject strings containing special path symbols - dot and sep
    if (/[./\\]/.test(this._device)) {
        throw new ConfigError("Cannot use malicious '" + this._device + "' device string");
    }

    try {
        return require('./device/' + this._device);  // eslint-disable-line global-require
    }
    catch (e) {
        throw new ConfigError("Failed to load device '" + this._device + "'" + '\n' + e.stack);
    }
}


module.exports = BoardState;
