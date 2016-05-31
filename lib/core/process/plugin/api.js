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


var http = require('http');
var Q = require("q");

var log4jsWrapper = require('../../../utils/log4js-wrapper');
var logger = log4jsWrapper.getLogger("plugin-apis");

var Board = require('../../board');

var pluginAPIState = new PluginAPIState();


/**
 * PluginAPI state.
 * Don't ever cache it's results, because they might be changed at any time.
 *
 * @constructor
 */
function PluginAPIState() {
    this._ckanHost = null;

}


/**
 * Returns false if PluginAPIState is not loaded yet
 *
 * @returns {boolean}
 */
PluginAPIState.prototype.isLoaded = function () {
    return this._ckanHost !== null;
};


/**
 * Reloads PluginAPI state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
PluginAPIState.prototype.reload = function (nconf_) {
    var nconf = nconf_ || nconf;

    // todo
    this._ckanHost = 'http://' + 'smartme-data.unime.it';

};


/**
 * Returns CKAN host
 *
 * @throws {Error} if state is not loaded yet
 * @returns {string}
 */
PluginAPIState.prototype.getCKANHost = function () {
    if (!this.isLoaded())
        throw new Error("Not loaded yet");

    return this._ckanHost;
};


/**
 * PluginAPI singleton
 */
var PluginAPI = module.exports = {};


/**
 * Returns PluginAPIState
 *
 * @returns {PluginAPIState}
 */
PluginAPI.getState = function () {
    return pluginAPIState;
};


/**
 * Returns logger with the specified name.
 *
 * @param name
 */
PluginAPI.getLogger = function (name) {
    name = name || "";
    if (name)
        name = ": " + name;

    return log4jsWrapper.getLogger("plugin-apis" + name);
};


/**
 * Returns naive current local time in ISO 8601 format like "2016-05-31T11:23:28.404Z'"
 *
 * @returns {string}
 */
PluginAPI.getLocalDateTimeInISO = function () {
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;  //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
    return localISOTime;
};


/**
 * Returns naive current UTC time in ISO 8601 format like "2016-05-31T11:23:28.404Z'"
 *
 * @returns {string}
 */
PluginAPI.getUTCDateTimeInISO = function () {
    return new Date().toISOString();
};


/**
 * Returns board code
 *
 * @returns {string}
 */
PluginAPI.getBoardId = function () {
    return Board.getState().getBoardCode();
};


/**
 * Returns board position
 *
 * @returns {BoardPosition}
 */
PluginAPI.getPosition = function () {
    return Board.getState().getBoardPosition();
};


/**
 * Returns BaseDevice
 *
 * @returns {BaseDevice}
 */
PluginAPI.getDevice = function () {
    return Board.getState().getDevice();
};


/**
 * Query CKAN Host for data
 *
 * @param id
 * @returns {Q.Promise} resolves to the function(responseString)
 */
PluginAPI.getCKANDataset = function (id) {
    var d = Q.defer();

    var options = {
        host: pluginAPIState.getCKANHost(),
        path: '/api/rest/dataset/' + id,
        method: 'GET'
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf-8');

        var response = '';

        res.on('data', function (chunk) {
            response += chunk;
        });

        res.on('end', function () {
            d.resolve(response);
        });
    });

    req.on('error', function (e) {
        logger.warn("getCKANdataset on error: " + e);
        d.reject(e);
    });

    req.end();

    return d.promise;
};

/**
 * Send data to the CKAN Host
 *
 * @param m_authid
 * @param m_resourceid
 * @param record
 * @returns {Q.Promise} resolves to the function(payloadJSON)
 */
PluginAPI.sendToCKAN = function (m_authid, m_resourceid, record) {
    var d = Q.defer();

    var payload = {
        resource_id: m_resourceid,
        method: 'insert',
        records: record
    };

    var payloadJSON = JSON.stringify(payload);

    var options = {
        host: pluginAPIState.getCKANHost(),
        path: '/api/3/action/datastore_upsert',
        method: 'POST',
        headers: {
            'Content-Type': "application/json",
            'Authorization': m_authid,
            'Content-Length': Buffer.byteLength(payloadJSON)
        }
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf-8');

        res.on('data', function (chunk) {
            logger.info("sendToCKAN on data: " + chunk);
        });

        res.on('end', function () {
            d.resolve(payloadJSON);
        });
    });

    req.on('error', function (e) {
        logger.warn("sendToCKAN on error: " + e);
        d.reject(e);
    });

    req.write(payloadJSON);
    req.end();

    // callback(payloadJSON);

    return d.promise;
};
