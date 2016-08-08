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

var helpers = require('../../../utils/helpers');
var fspromised = require('../../../utils/fspromised');
var Process = require('./process');

/**
 * /proc pseudo-filesystem bindings
 */
var Proc = module.exports = {};


function processStatFile(pid) {
    return fspromised.readFile("/proc/" + pid + "/stat")
        .then(function (data) {

            // see man 5 proc
            var values = data.split(" ");

            return {
                pid: pid,
                data: {
                    ppid: values[3]
                }
            };
        });
}


function processCmdlineFile(pid) {
    return fspromised.readFile("/proc/" + pid + "/cmdline")
        .then(function (data) {
            var args = data.split("\x00");
            args.pop();  // remove trailing item

            var returnData;

            if (args[0] === undefined) {  // this is a system process
                returnData = {
                    rejected: true
                };
            } else {
                returnData = {
                    command: args[0],
                    args: args
                };
                args.splice(0, 1);
            }

            return {
                pid: pid,
                data: returnData
            };
        });
}

/**
 * Returns processes list
 *
 * @returns {Q.Promise}
 */
Proc.getProcessesList = function () {
    return fspromised.readdir('/proc')
        .then(function (files) {
            var processDataPromises = [];

            for (var i = 0; i < files.length; i++) {
                var pid = parseInt(files[i], 10);
                if (isNaN(pid)) {
                    continue;
                }

                processDataPromises.push(processStatFile(pid));
                processDataPromises.push(processCmdlineFile(pid));
            }

            return Q.all(processDataPromises);
        })
        .then(function (processData) {
            var combinedProcessData = {};
            for (var i = 0; i < processData.length; i++) {
                var cur = processData[i];
                if (combinedProcessData[cur.pid] === undefined) {
                    combinedProcessData[cur.pid] = {};
                }

                helpers.objectAssign(combinedProcessData[cur.pid], cur.data);
            }

            return combinedProcessData;
        })
        .then(function (combinedProcessData) {
            var result = [];
            var pids = helpers.objectKeys(combinedProcessData);

            for (var i = 0; i < pids.length; i++) {
                var pid = pids[i];
                var p = combinedProcessData[pid];

                if (!p.rejected) {
                    result.push(new Process(pid, p.command, p.args, p.ppid));
                }
            }

            return result;
        });
};
