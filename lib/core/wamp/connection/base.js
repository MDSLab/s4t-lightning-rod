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

/**
 * Base abstract class for WAMP connection
 *
 * @param url
 * @param realm
 * @constructor
 * @abstract
 */
function BaseWAMPConnection(url, realm) {
    if (this.constructor === BaseWAMPConnection) {
        throw new Error("Can't instantiate abstract class!");
    }

    this.onopen = function () {
    };
    this.onclose = function (reason) {
    };
}

/**
 * Close connection. It is safe to call `open()` right afterwards.
 * @abstract
 */
BaseWAMPConnection.prototype.close = function () {
    throw new Error("Abstract method!");
};

/**
 * Open connection. It must be in closed state.
 * @abstract
 */
BaseWAMPConnection.prototype.open = function () {
    throw new Error("Abstract method!");
};

/**
 * Tells whether session is open right now
 * @abstract
 */
BaseWAMPConnection.prototype.isOpen = function () {
    throw new Error("Abstract method!");
};

/**
 * Tells whether connection is active right now
 * @abstract
 */
BaseWAMPConnection.prototype.isConnected = function () {
    throw new Error("Abstract method!");
};

/**
 * Returns session
 * @returns {BaseWAMPSession}
 * @abstract
 */
BaseWAMPConnection.prototype.getSession = function () {
    throw new Error("Abstract method!");
};

module.exports = BaseWAMPConnection;