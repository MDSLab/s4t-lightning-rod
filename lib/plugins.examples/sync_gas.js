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
var BaseSyncPlugin = require('../core/process/plugin/basesync');
var PluginAPI = require('../core/process/plugin/api');

var logger = PluginAPI.getLogger("gas");


function GasPlugin(args) {
    BaseSyncPlugin.call(this, args);

    this._pin = args.pin;
    this._mAuthid = args.m_authid;
    this._mResourceid = args.m_resourceid;

}
util.inherits(GasPlugin, BaseSyncPlugin);


GasPlugin.prototype.call = function () {
    /* {"m_authid" : "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae", "m_resourceid" : "70acace7-92c8-4956-b83e-5e76952cc682", "pin" : "A3", "autostart":"false"} */


    var board = PluginAPI.getDevice();

    var record = [];

    var sensor_volt;
    var RS_air;
    /* Get the value of RS via in a clear air */
    var R0;
    /* Get the value of R0 via in LPG */
    var sensorValue = 0;
    var supplyVolt = 4.64;


    /* NOTE: uncomment this part only to get an average of R0 among 100 samples */
    /*--------------------------------------------------------------------*/
    /*
     for(var x = 0 ; x < 100 ; x++)
     sensorValue = sensorValue + board.readAnalog(pin);

     sensorValue = sensorValue/100.0;

     sensor_volt = sensorValue/1024*supplyVolt;
     RS_air = (supplyVolt-sensor_volt)/sensor_volt;
     R0 = RS_air/9.9;

     results="R0: " + R0 + " ohm";
     console.log("R0: " + R0 + " ohm");
     */
    /*--------------------------------------------------------------------*/


    /* NOTE: uncomment this part ONLY AFTER got the averaged R0 */
    /*--------------------------------------------------------------------*/
    R0 = 98.4078884078884;

    sensorValue = sensorValue + board.readAnalog(this._pin);
    sensor_volt = sensorValue / 1024 * supplyVolt;
    var RS_gas = (supplyVolt - sensor_volt) / sensor_volt;
    var ratio = RS_gas / R0;
    /*--------------------------------------------------------------------*/


    var position = PluginAPI.getPosition();

    record.push({
        Date: PluginAPI.getUTCDateTimeInISO(),
        Gas: ratio,
        Altitude: position.altitude,
        Latitude: position.latitude,
        Longitude: position.longitude
    });

    return PluginAPI.sendToCKAN(this._mAuthid, this._mResourceid, record)
        .then(function (payloadJSON) {
            var results = "Concentration: " + ratio + " ppm";
            logger.debug("PAYLOAD:\n" + payloadJSON);
            logger.info(results);

            return results;
        });
};


module.exports = GasPlugin;