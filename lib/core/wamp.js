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
var urlparse = require('url').parse;

var ConfigError = require('./../utils/config-error');
var logger = require('./../utils/log4js-wrapper').getLogger("WAMP");

var AutobahnConntestTcpkillWAMPConnection = require('./wamp/connection/autobahn-conntest-tcpkill');


var wampState = new WAMPState();

/**
 * WAMP subsystem state.
 *
 * @constructor
 */
function WAMPState() {
    this._url = null;
    this._realm = null;

    /**
     * @type {BaseWAMPConnection}
     */
    this._wampConnection = null;

    /**
     * @type {BaseWAMPConnection}
     */
    this.connectionClass = AutobahnConntestTcpkillWAMPConnection;
}

/**
 * Returns false if WAMPState is not loaded yet
 *
 * @returns {boolean}
 */
WAMPState.prototype.isLoaded = function () {
    return this._url !== null;
};

/**
 * Reloads WAMP subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
WAMPState.prototype.reload = function (nconf_) {
    var nconf = nconf_ || nconf;


    // todo put correct URL in settings instead of just scheme + host, i.e. include port and path as well
    var url_wamp = nconf.get('config:wamp:url_wamp');
    if (!url_wamp) {
        throw new ConfigError("config:wamp:url_wamp can't be empty");
    }

    // todo get rid of this - port should be a part of url
    var port_wamp = nconf.get('config:wamp:port_wamp');
    if (port_wamp) {
        url_wamp += ":" + port_wamp;
        logger.warn("port_wamp should be a part of url_wamp");
    }

    var url = urlparse(url_wamp);

    if (url.protocol === null || url.host === null) {
        throw new ConfigError("config:wamp:url_wamp is not a valid URL");
    }

    // todo get rid of this - path should be a part of url
    if (url.path === null) {
        url_wamp += "/ws";
        logger.warn("url_wamp should include a path. Falling back to /ws.");
    }


    var realm = nconf.get('config:wamp:realm');
    if (!realm) {
        throw new ConfigError("config:wamp:realm can't be empty");
    }

    if (this._realm !== realm || this._url !== url_wamp) {
        this._realm = realm;
        this._url = url_wamp;

        if (this._wampConnection) {
            // reconnect using new url and realm
            this.connect();
        }
    }
};


/**
 * Opens WAMP connection
 */
WAMPState.prototype.connect = function () {
    if (!this.isLoaded())
        throw new Error("Not loaded yet");

    if (this._wampConnection && this._wampConnection.isOpen()) {
        logger.info("Closed connection to WAMP server, because new connection was requested");
        this._wampConnection.close();
    }

    this._wampConnection = new this.connectionClass(this._url, this._realm);

    logger.debug("[SYSTEM] - WAMP server URL: " + this._url);

    this._wampConnection.onopen = _wampStateConnectionOnOpen.bind(this);
    this._wampConnection.onclose = _wampStateConnectionOnClose.bind(this);

    this._wampConnection.open();
};


function _wampStateConnectionOnClose(reason) {

    logger.error('[WAMP-STATUS] - Error in connecting to WAMP server!');
    logger.error('- Reason: ' + reason);
    //logger.error('- Reconnection Details: ');
    //logger.error("  - retry_delay:", details.retry_delay);
    //logger.error("  - retry_count:", details.retry_count);
    //logger.error("  - will_retry:", details.will_retry);

    if (this._wampConnection.isOpen) {
        logger.info("[WAMP-STATUS] - connection is open!");
    } else {
        logger.warn("[WAMP-STATUS] - connection is closed!");
    }
}


function _wampStateConnectionOnOpen() {
    logger.info('[WAMP-STATUS] - Connection to WAMP server ' + this._url + ' created successfully:');
    logger.info('--> Realm: ' + this._realm);
    logger.info('--> Session ID: ' + this._wampConnection.getSession().getId());
    //logger.debug('--> Connection details:\n' + JSON.stringify(details));

    // todo register commands
    // manageBoard.exportManagementCommands(session);

    // todo board status (new/registered)
    // manageBoard.manage_WAMP_connection(session, details);

}


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
