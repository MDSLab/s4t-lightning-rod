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
var BaseAsyncPlugin = require('s4t-lightning-rod/lib/pluginapi/baseasync');
var PluginAPI = require('s4t-lightning-rod/lib/pluginapi/api');

var logger = PluginAPI.getLogger("temp");


function TempPlugin(args) {
    BaseAsyncPlugin.call(this, args);

    this._pin = args.pin;
    this._mAuthid = args.m_authid;
    this._mResourceid = args.m_resourceid;

    this._timer = args.timer;  // plugin
    this._intervalId = null;
}
util.inherits(TempPlugin, BaseAsyncPlugin);


TempPlugin.prototype._compute = function () {
    /*
    {
        "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
        "m_resourceid": "a1d59ee7-8098-41ce-bd3a-ddafd8046104",
        "pin": "A0",
        "autostart": "false"
    }
    */

    var board = PluginAPI.getDevice();

    var ADCres = 1023.0;
    var Beta = 3950;
    var Kelvin = 273.15;
    var Rb = 10000;
    var Ginf = 120.6685;

    return board.readAnalog(this._pin)
        .then(function (sensor) {

            var record = [];
            var Rthermistor = Rb * (ADCres / sensor - 1);
            var _temperatureC = Beta / Math.log(Rthermistor * Ginf);
            var temp = _temperatureC - Kelvin;

            var position = PluginAPI.getPosition();

            record.push({
                Date: PluginAPI.getUTCDateTimeInISO(),
                Temperature: temp,
                Altitude: position.altitude,
                Latitude: position.latitude,
                Longitude: position.longitude
            });

            return [PluginAPI.sendToCKAN(this._mAuthid, this._mResourceid, record), temp];

        }.bind(this))
        .spread(function (payloadJSON, temp) {

            var results = "Temperature " + temp + " °C sent to CKAN\n\n";
            logger.debug("PAYLOAD:\n" + payloadJSON);
            logger.info(results);

            return results;
        });
};


TempPlugin.prototype.start = function () {

    /*
    {
        "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
        "m_resourceid": "a1d59ee7-8098-41ce-bd3a-ddafd8046104",
        "pin": "A0",
        "timer": "5000",
        "autostart": "false"
    }
    */

    this._intervalId = setInterval(function () {
        this._compute()
            .done();
    }.bind(this), this._timer);
};

TempPlugin.prototype.stop = function () {
    clearInterval(this._intervalId);
    this._intervalId = null;
};

module.exports = TempPlugin;
