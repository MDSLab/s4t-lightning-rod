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
var Q = require('q');

var ConfigError = require('../../utils/config-error');
var logger = require('../../utils/log4js-wrapper').getLogger("WAMP");

var AutobahnConntestTcpkillWAMPConnection = require('../wamp/connection/autobahn-conntest-tcpkill');
var Manage = require('../manage');
var Board = require('../board');


var wampState = module.exports = new WAMPState();  // eslint-disable-line no-unused-vars

/**
 * WAMP subsystem state.
 * Don't ever cache it's results, because they might be changed at any time.
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
    nconf_ = nconf_ || nconf;

    var urlWamp = getUrlWamp(nconf_);

    var realm = nconf_.get('config:wamp:realm');
    if (!realm) {
        throw new ConfigError("config:wamp:realm can't be empty");
    }

    if (this._realm !== realm || this._url !== urlWamp) {
        this._realm = realm;
        this._url = urlWamp;

        if (this._wampConnection) {
            // reconnect using new url and realm
            this.connect();
        }
    }
};

function getUrlWamp(nconf_) {

    // todo put correct URL in settings instead of just scheme + host,
    // i.e. include port and path as well
    var urlWamp = nconf_.get('config:wamp:url_wamp');
    if (!urlWamp) {
        throw new ConfigError("config:wamp:url_wamp can't be empty");
    }

    // todo get rid of this - port should be a part of url
    var portWamp = nconf_.get('config:wamp:port_wamp');
    if (portWamp) {
        urlWamp += ":" + portWamp;
        logger.warn("config:wamp:port_wamp should be a part of config:wamp:url_wamp");
    }

    var url = urlparse(urlWamp);

    if (url.protocol === null || url.host === null) {
        throw new ConfigError("config:wamp:url_wamp is not a valid URL");
    }

    // todo get rid of this - path should be a part of url
    if (url.path === null) {
        urlWamp += "/ws";
        logger.warn("url_wamp should include a path. Falling back to /ws.");
    }

    return urlWamp;
}

/**
 * Returns WAMP session object
 *
 * @throws {Error} if state is not loaded yet
 * @throws {Error} if session is not established right now
 * @returns {BaseWAMPSession}
 */
WAMPState.prototype.getSession = function() {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    if (!this._wampConnection || !this._wampConnection.isOpen()) {
        throw new Error("Session is not established");
    }

    return this._wampConnection.getSession();
};

/**
 * Opens WAMP connection
 *
 * @throws {Error} if state is not loaded yet
 */
WAMPState.prototype.connect = function () {
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

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
    logger.info('[WAMP-STATUS] - Connection to WAMP server ' + this._url
        + ' created successfully:');
    logger.info('--> Realm: ' + this._realm);
    logger.info('--> Session ID: ' + this._wampConnection.getSession().getId());
    //logger.debug('--> Connection details:\n' + JSON.stringify(details));

    Manage.exportAll(this._wampConnection.getSession());

    var boardStatus = Board.getState().getRegistrationStatus();
    var boardCode = Board.getState().getBoardCode();

    var provisioningChain;
    if (boardStatus === Board.getState().REGISTRATION_STATUSES.NEW) {
        logger.info('[CONFIGURATION] - NEW BOARD CONFIGURATION STARTED... ');

        provisioningChain = this._wampConnection.getSession().call("s4t.board.provisioning",
            [boardCode])
            .then(function(result) {
                logger.info("\n\nPROVISIONING "+boardCode+" RECEIVED: "
                    + JSON.stringify(result) + "\n\n");

                var boardPosition = result[0];

                return Board.getState().setBoardPosition(boardPosition);
            })
            .then(function() {
                return Board.getState()
                    .setRegistrationStatus(Board.getState().REGISTRATION_STATUSES.REGISTERED);
            });
    } else if (boardStatus === Board.getState().REGISTRATION_STATUSES.REGISTERED) {
        logger.info('[CONFIGURATION] - REGISTERED BOARD CONFIGURATION STARTING...');

        provisioningChain = Q();
    }

    provisioningChain
        .then(function() {
            var connectionTopic = 'board.connection';
            //Registering the board to the Cloud by sending a message to the connection topic
            logger.info('[WAMP] - Sending board ID ' + boardCode + ' to topic '
                + connectionTopic + ' to register the board');
            this._wampConnection.getSession().publish(connectionTopic,
                [boardCode, 'connection', this._wampConnection.getSession().getId()]);
        }.bind(this))
        .done();


    // todo drivers
    // If I'm connected to the WAMP server I can receive RPC command requests to manage drivers
    //var driversManager = require("./manage-drivers");
    //driversManager.exportDriverCommands(session);
    //driversManager.restartDrivers();

}
