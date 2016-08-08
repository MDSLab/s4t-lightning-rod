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

var exec = require('child_process').exec;
var util = require('util');

var gpsd = require('node-gpsd');
var modem = require('modem');

var BaseAsyncPlugin = require('s4t-lightning-rod/lib/pluginapi/baseasync');
var PluginAPI = require('s4t-lightning-rod/lib/pluginapi/api');

var logger = PluginAPI.getLogger("gps");


function GpsPlugin(args) {
    BaseAsyncPlugin.call(this, args);

    this._gpsDeviceCommand = args.gps_device_command;
    this._gpsDeviceData = args.gps_device_data;
    this._mAuthid = args.m_authid;
    this._mResourceid = args.m_resourceid;

    //var ckan_host = args.ckan_host;
    //var ckan_port = args.ckan_port;
    //var ckan_path = args.ckan_path;

    this._modem = null;
}
util.inherits(GpsPlugin, BaseAsyncPlugin);


function reboot() {
    exec('reboot', function (error, stdout) {
        logger.warn('Rebooting now: ' + stdout);
    });
}

GpsPlugin.prototype._cleanupModem = function () {
    if (this._modem) {
        this._modem.close();
        this._modem = null;
    }
};

GpsPlugin.prototype._setupReciever = function () {

    logger.info('It is working');
    this._cleanupModem();

    exec('/root/dialup.sh', function (error, stdout) {
        logger.info('Starting PPP connection: ' + stdout);
    });

    var daemon = new gpsd.Daemon({
        program: 'gpsd',
        device: this._gpsDeviceData,
        port: 2947,
        pid: '/tmp/gpsd.pid'
    });

    // todo cleanup ???
    daemon.start(function (err, result) {  // eslint-disable-line no-unused-vars
        logger.info('Deamon started');

        // todo cleanup ???
        var listener = new gpsd.Listener({
            parse: true,
            parsejson: true
        });

        listener.connect(function () {
            logger.info('Connected');

            listener.watch();

            listener.on('TPV', function (data) {
                if (data.tag !== 'RMC') {
                    return;
                }

                delete data.class;
                delete data.tag;
                delete data.device;
                delete data.mode;

                var record = [];
                record.push(data);

                PluginAPI.sendToCKAN(this._mAuthid, this._mResourceid, record)
                    .then(function (payloadJSON) {
                        logger.debug("sent to CKAN, JSON: %j", payloadJSON);
                    });
            }.bind(this));
        }.bind(this));
    }.bind(this));
};


GpsPlugin.prototype.start = function () {
//JSON to send
// {
//     'm_authid': '',
//     'm_resourceid': '',
//     'gps_device_command': '',
//     'gps_device_data': '',
//     'ckan_host': '',
//     'ckan_port': '',
//     'ckan_path': ''
// }


    this._modem = modem.Modem();

    this._modem.open(this._gpsDeviceCommand, function () {
        logger.info('Connected to ' + this._gpsDeviceCommand);

        // todo cleanup ???
        var job = modem.execute('AT+CGPS?', function (escapeChar, response) {
            if (response === 'OK') {
                this._setupReciever();
            } else {
                logger.warn('I need to reboot');
                this._cleanupModem();
                reboot();
            }
        }.bind(this), true, 4000);

        job.on('timeout', function (data) {  // eslint-disable-line no-unused-vars
            logger.warn('Timed out on test command');
            this._cleanupModem();
            reboot();
        }.bind(this));

    }.bind(this));
};


GpsPlugin.prototype.stop = function () {
    this._cleanupModem();
};


module.exports = GpsPlugin;
