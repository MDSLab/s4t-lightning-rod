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
var autobahn = require('autobahn');

var BaseWAMPConnection = require('./base');
var AutobahnSession = require('../session/autobahn');

/**
 * Simple autobahn wrapper providing the WAMP connection
 *
 * @param url
 * @param realm
 * @constructor
 */
function AutobahnSimpleWAMPConnection(url, realm) {
    BaseWAMPConnection.call(this, url, realm);

    this.sessionClass = AutobahnSession;

    this._url = url;
    this._realm = realm;
    this._connection = null;
    this._session = null;
    this._connect();
}
util.inherits(AutobahnSimpleWAMPConnection, BaseWAMPConnection);


/**
 * Creates autobahn connection
 *
 * @private
 */
AutobahnSimpleWAMPConnection.prototype._connect = function () {

    // API reference:
    // https://github.com/crossbario/autobahn-js/blob/master/doc/reference.md
    this._connection = new autobahn.Connection({
        url: this._url,
        realm: this._realm,
        max_retries: -1  // eslint-disable-line camelcase
    });

    this._connection.onopen = this._onopen.bind(this);
    this._connection.onclose = this._onclose.bind(this);
};

/**
 * Autobahn's connection onopen callback
 *
 * @param session
 * @param details
 * @private
 */
AutobahnSimpleWAMPConnection.prototype._onopen = function (
    session, details) {  // eslint-disable-line no-unused-vars

    this._session = new this.sessionClass(session);
    return this.onopen();
};

/**
 * Autobahn's connection onclose callback
 *
 * @param reason
 * @param details
 * @private
 */
AutobahnSimpleWAMPConnection.prototype._onclose = function (
    reason, details) {  // eslint-disable-line no-unused-vars

    try {
        return this.onclose(reason);
    }
    finally {
        this._session = null;
    }
};

/**
 * Close connection. It is safe to call `open()` right afterwards.
 */
AutobahnSimpleWAMPConnection.prototype.close = function () {
    // todo test: can autobahn connection be opened after being closed?
    return this._connection.close();
};

/**
 * Open connection. It must be in closed state.
 */
AutobahnSimpleWAMPConnection.prototype.open = function () {
    return this._connection.open();
};

/**
 * Tells whether session is open right now
 */
AutobahnSimpleWAMPConnection.prototype.isOpen = function () {
    return this._connection.isOpen;
};

/**
 * Tells whether connection is active right now
 */
AutobahnSimpleWAMPConnection.prototype.isConnected = function () {
    return this._connection.isConnected;
};

/**
 * Returns session
 * @returns {AutobahnSession}
 */
AutobahnSimpleWAMPConnection.prototype.getSession = function () {
    return this._session;
};

module.exports = AutobahnSimpleWAMPConnection;
