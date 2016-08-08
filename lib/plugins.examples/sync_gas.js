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

var logger = PluginAPI.getLogger("gas");


function GasPlugin(args) {
    BaseSyncPlugin.call(this, args);

    this._pin = args.pin;
    this._mAuthid = args.m_authid;
    this._mResourceid = args.m_resourceid;

}
util.inherits(GasPlugin, BaseSyncPlugin);


GasPlugin.prototype.call = function () {
    /*
    {
        "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
        "m_resourceid": "70acace7-92c8-4956-b83e-5e76952cc682",
        "pin": "A3",
        "autostart": "false"
    }
    */

    var board = PluginAPI.getDevice();

    return board.readAnalog(this._pin)
        .then(function (sensor) {

            var record = [];

            var sensorVolt;
            // var RS_air;
            /* Get the value of RS via in a clear air */
            var R0;
            /* Get the value of R0 via in LPG */
            var sensorValue = 0;
            var supplyVolt = 4.64;


            /* NOTE: uncomment this part only to get an average of R0 among 100 samples */
            /*--------------------------------------------------------------------*/
            /*
             for(var x = 0 ; x < 100 ; x++)
             sensorValue = sensorValue + sensor;

             sensorValue = sensorValue/100.0;

             sensorVolt = sensorValue/1024*supplyVolt;
             RS_air = (supplyVolt-sensorVolt)/sensorVolt;
             R0 = RS_air/9.9;

             results="R0: " + R0 + " ohm";
             console.log("R0: " + R0 + " ohm");
             */
            /*--------------------------------------------------------------------*/


            /* NOTE: uncomment this part ONLY AFTER got the averaged R0 */
            /*--------------------------------------------------------------------*/
            R0 = 98.4078884078884;

            sensorValue = sensorValue + sensor;
            sensorVolt = sensorValue / 1024 * supplyVolt;
            var RSgas = (supplyVolt - sensorVolt) / sensorVolt;
            var ratio = RSgas / R0;
            /*--------------------------------------------------------------------*/


            var position = PluginAPI.getPosition();

            record.push({
                Date: PluginAPI.getUTCDateTimeInISO(),
                Gas: ratio,
                Altitude: position.altitude,
                Latitude: position.latitude,
                Longitude: position.longitude
            });

            return [PluginAPI.sendToCKAN(this._mAuthid, this._mResourceid, record), ratio];

        }.bind(this))
        .spread(function (payloadJSON, ratio) {
            var results = "Concentration: " + ratio + " ppm";
            logger.debug("PAYLOAD:\n" + payloadJSON);
            logger.info(results);

            return results;
        });
};


module.exports = GasPlugin;
