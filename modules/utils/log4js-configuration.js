/*
 *				                  Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2017 Kostya Esmukov
 *
 */

"use strict";

var nconf = require('nconf');
var log4js = require('log4js');

// tell noderify to bundle these modules
require('log4js/lib/appenders/stdout');
require('log4js/lib/appenders/file');


module.exports = function () {
    // assumes that nconf is already initialized

    var logfile = nconf.get('config:log:logfile');
    var loglevel = nconf.get('config:log:loglevel') || 'INFO';
    log4js.configure({
        appenders: [ { type: 'stdout', level: loglevel } ],
        replaceConsole: true
    });

    if (logfile !== "/dev/stdout") {
        try {
            log4js.configure({
                appenders: [{type: 'file', filename: logfile, level: loglevel}],
                replaceConsole: true
            });
        } catch (err) {
            console.error('[SYSTEM] - Logger configuration error: ' + err);
            throw err;
        }
    }
};
