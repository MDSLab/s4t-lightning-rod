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

var BaseWAMPSession = require('./base');


/**
 * WAMP session holder for autobahn session
 *
 * @param session
 * @constructor
 */
function AutobahnSession(session) {
    BaseWAMPSession.call(this);

    /**
     * @type {autobahn.Session}
     */
    this._session = session;
}
util.inherits(AutobahnSession, BaseWAMPSession);


/**
 * Returns current session's id
 */
AutobahnSession.prototype.getId = function () {
    return this._session.id;
};

/**
 * Tells whether this session is open
 */
AutobahnSession.prototype.isOpen = function () {
    return this._session.isOpen;
};

/**
 * Registers `procedure` with `endpoint` callback `function (args)`
 * @param procedure
 * @param endpoint
 * @param options
 */
AutobahnSession.prototype.register = function (procedure, endpoint, options) {
    return this._session.register(procedure, endpoint, options);
};

/**
 * Calls `procedure` with `args` and `kwargs`
 * @param procedure
 * @param args
 * @param kwargs
 * @param options
 * @returns {Q.Promise}
 */
AutobahnSession.prototype.call = function (  // eslint-disable-line max-params
    procedure, args, kwargs, options) {
    return this._session.call(procedure, args, kwargs, options);
};

/**
 * Publishes `topic` with `args` and `kwargs`
 * @param topic
 * @param args
 * @param kwargs
 * @param options
 * @returns {Q.Promise}
 */
AutobahnSession.prototype.publish = function (  // eslint-disable-line max-params
    topic, args, kwargs, options) {
    return this._session.publish(topic, args, kwargs, options);
};

/**
 * Subscribes to `topic` with `handler` callback `function (args)`
 * @param topic
 * @param handler
 * @param options
 */
AutobahnSession.prototype.subscribe = function (topic, handler, options) {
    return this._session.subscribe(topic, handler, options);
};


module.exports = AutobahnSession;
