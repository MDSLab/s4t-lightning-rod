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

var log4js = require('log4js');

var DEFAULT_LOG4JS_SETTINGS_FILEPATH = './log4js.json';
var LOG4JS_FILEPATH_ENV_NAME = 'LOG4JS_CONFIG';  // this is the default of log4js

var exports = module.exports = {};


/**
 * Expose log4js
 */
exports.log4js = log4js;

/**
 * Reload log4js config
 *
 * The following configuration sources are tried (in specified order):
 *  - filename from env variable LOG4JS_CONFIG
 *  - nconf configuration section under 'config:log'
 *  - './log4js.json'
 *
 * @param nconf
 */
exports.reload = function (nconf) {

    var envFilepath = process.env[LOG4JS_FILEPATH_ENV_NAME];

    if (envFilepath) {
        log4js.configure(envFilepath, {});
        return;
    }

    if (nconf) {
        var nconfLog = nconf.get('config:log');

        if (nconfLog) {
            log4js.configure({
                "appenders": [
                    {
                        "type": "logLevelFilter",
                        "level": nconfLog.loglevel || "INFO",
                        "appender": {
                            "type": "file",
                            "filename": nconfLog.logfile
                        }
                    }
                ]
            });
            return;
        }
    }

    log4js.configure(DEFAULT_LOG4JS_SETTINGS_FILEPATH, {});
};


/**
 * Returns log4js logger
 * @param name
 */
exports.getLogger = function (name) {
    return log4js.getLogger(name);
};
