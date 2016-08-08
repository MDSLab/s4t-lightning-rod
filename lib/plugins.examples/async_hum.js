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

var Q = require('q');

var util = require('util');
var BaseAsyncPlugin = require('s4t-lightning-rod/lib/pluginapi/baseasync');
var PluginAPI = require('s4t-lightning-rod/lib/pluginapi/api');

var logger = PluginAPI.getLogger("hum");


function HumPlugin(args) {
    BaseAsyncPlugin.call(this, args);

    this._pinTemp = args.pin_temp;
    this._pinHum = args.pin_hum;
    this._mAuthid = args.m_authid;
    this._mResourceid = args.m_resourceid;

    this._timer = args.timer;  // plugin
    this._intervalId = null;
}
util.inherits(HumPlugin, BaseAsyncPlugin);


HumPlugin.prototype._compute = function () {
    /*
    {
        "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
        "m_resourceid": "364c14d3-03a4-441d-a7f1-49ff264c8815",
        "pin_temp": "A0",
        "pin_hum": "A2",
        "timer": "5000",
        "autostart": "false"
    }
    */

    var board = PluginAPI.getDevice();

    return Q.spread([board.readAnalog(this._pinTemp), board.readAnalog(this._pinHum)],
        function (tempVolt, HIH4030Value) {

            var record = [];

            // FOR TEMP SENSOR
            var ADCres = 1023.0;
            var Beta = 3950;
            var Kelvin = 273.15;
            var Rb = 10000;
            var Ginf = 120.6685;
            var Rthermistor = Rb * (ADCres / tempVolt - 1);
            var _temperatureC = Beta / Math.log(Rthermistor * Ginf);
            var temp = _temperatureC - Kelvin;


            // FOR HUM SENSOR
            var degreesCelsius = temp;
            var supplyVolt = 4.64;
            var voltage = HIH4030Value / 1023. * supplyVolt;
            var sensorRH = 161.0 * voltage / supplyVolt - 25.8;
            var relativeHumidity = sensorRH / (1.0546 - 0.0026 * degreesCelsius);


            var position = PluginAPI.getPosition();

            record.push({
                Date: PluginAPI.getUTCDateTimeInISO(),
                Humidity: relativeHumidity,
                Altitude: position.altitude,
                Latitude: position.latitude,
                Longitude: position.longitude
            });


            return [PluginAPI.sendToCKAN(this._mAuthid, this._mResourceid, record),
                relativeHumidity, temp];

        }.bind(this))
        .spread(function (payloadJSON, relativeHumidity, temp) {
            var results = "Humidity " + relativeHumidity
                + " percent (with " + temp + " °C) sent to CKAN";
            logger.debug("PAYLOAD:\n" + payloadJSON);
            logger.info(results);

            return results;
        });
};

HumPlugin.prototype.start = function () {
    /*
    {
        "m_authid": "22c5cfa7-9dea-4dd9-9f9d-eedf296852ae",
        "m_resourceid": "364c14d3-03a4-441d-a7f1-49ff264c8815",
        "pin_temp": "A0",
        "pin_hum": "A2",
        "timer": "5000",
        "autostart": "false"
    }
    */

    this._intervalId = setInterval(function () {
        this._compute()
            .done();
    }.bind(this), this._timer);
};


HumPlugin.prototype.stop = function () {
    clearInterval(this._intervalId);
    this._intervalId = null;
};

module.exports = HumPlugin;
