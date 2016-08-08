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
var BaseSyncPlugin = require('s4t-lightning-rod/lib/pluginapi/basesync');
var PluginAPI = require('s4t-lightning-rod/lib/pluginapi/api');

var logger = PluginAPI.getLogger("lux");


function LuxPlugin(args) {
    BaseSyncPlugin.call(this, args);

    this._pin = args.pin;
    this._mAuthid = args.m_authid;
    this._mResourceid = args.m_resourceid;

    this._timer = args.timer;  // plugin
    this._intervalId = null;
}
util.inherits(LuxPlugin, BaseSyncPlugin);


LuxPlugin.prototype.call = function () {
    /*
    {
        "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
        "m_resourceid": "edfa2d34-bbfd-4556-bbd8-e2a027bf1c01",
        "pin": "A1",
        "autostart": "false"
    }
    */

    var board = PluginAPI.getDevice();

    return board.readAnalog(this._pin)
        .then(function (voltage) {

            var record = [];
            var ldr = (2500 / (5 - voltage * 0.004887) - 500) / 3.3;

            var position = PluginAPI.getPosition();

            record.push({
                Date: PluginAPI.getUTCDateTimeInISO(),
                Brightness: ldr,
                Altitude: position.altitude,
                Latitude: position.latitude,
                Longitude: position.longitude
            });

            return [PluginAPI.sendToCKAN(this._mAuthid, this._mResourceid, record), ldr];

        }.bind(this))
        .spread(function (payloadJSON, ldr) {
            var results = "Brightness: " + ldr + " (lux) sent to CKAN";
            logger.debug("PAYLOAD:\n" + payloadJSON);
            logger.info(results);

            return results;
        });
};

/*
{
    "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
    "m_resourceid": "edfa2d34-bbfd-4556-bbd8-e2a027bf1c01",
    "pin": "A1",
    "timer": "5000",
    "autostart": "false"
}
*/

module.exports = LuxPlugin;
