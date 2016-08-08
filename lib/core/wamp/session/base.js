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
 * Base abstract class for WAMP session holder
 *
 * @abstract
 * @constructor
 */
function BaseWAMPSession() {
    if (this.constructor === BaseWAMPSession) {
        throw new Error("Can't instantiate abstract class!");
    }
}

/**
 * Returns current session's id
 * @abstract
 */
BaseWAMPSession.prototype.getId = function () {
    throw new Error("Abstract method!");
};

/**
 * Tells whether this session is open
 * @abstract
 */
BaseWAMPSession.prototype.isOpen = function () {
    throw new Error("Abstract method!");
};

/**
 * Registers `procedure` with `endpoint` callback `function (args)`
 * @param procedure
 * @param endpoint
 * @param options
 * @abstract
 */
BaseWAMPSession.prototype.register = function (
    procedure, endpoint, options) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};

/**
 * Calls `procedure` with `args` and `kwargs`
 * @param procedure
 * @param args
 * @param kwargs
 * @param options
 * @returns {Q.Promise}
 * @abstract
 */
BaseWAMPSession.prototype.call = function ( // eslint-disable-line max-params
    procedure, args, kwargs, options) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};

/**
 * Publishes `topic` with `args` and `kwargs`
 * @param topic
 * @param args
 * @param kwargs
 * @param options
 * @returns {Q.Promise}
 * @abstract
 */
BaseWAMPSession.prototype.publish = function (  // eslint-disable-line max-params
    topic, args, kwargs, options) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};

/**
 * Subscribes to `topic` with `handler` callback `function (args)`
 * @param topic
 * @param handler
 * @param options
 * @abstract
 */
BaseWAMPSession.prototype.subscribe = function (
    topic, handler, options) {  // eslint-disable-line no-unused-vars
    throw new Error("Abstract method!");
};

module.exports = BaseWAMPSession;
