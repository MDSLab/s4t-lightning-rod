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
var fs = require('fs');

var helpers = require('../../../utils/helpers');
var Process = require('./process');

/**
 * /proc pseudo-filesystem bindings
 */
var Proc = module.exports = {};


/**
 * Returns processes list
 *
 * @returns {Q.Promise}
 */
Proc.getProcessesList = function () {
    var d = Q.defer();

    fs.readdir("/proc", function (err, files) {
        if (err) {
            d.reject(err);
            return;
        }

        var result = [];
        var pendingProcesses = {};
        var dispatched = false;

        var resolve = function () {  // final callback, fulfilling the promise
            if (dispatched && helpers.objectKeys(pendingProcesses).length <= 0) {
                d.resolve(result);
            }
        };

        var done = function (pid) {  // file read callback
            if (pendingProcesses[pid].pending > 0)
                return;

            var p = pendingProcesses[pid];

            if (!p.rejected)
                result.push(new Process(pid, p.command, p.args, p.ppid));

            delete pendingProcesses[pid];

            resolve();
        };

        for (var i = 0; i < files.length; i++) {
            var pid = parseInt(files[i], 10);
            if (isNaN(pid))
                continue;

            pendingProcesses[pid] = {
                pending: 2,  // files left to read
                rejected: false  // we reject system processes
            };

            (function (pid) {

                fs.readFile("/proc/" + pid + "/stat", 'utf8', function (err, data) {
                    if (err) {
                        d.reject(err);
                        return;
                    }

                    pendingProcesses[pid].pending--;

                    // see man 5 proc
                    var values = data.split(" ");

                    pendingProcesses[pid].ppid = values[3];

                    done(pid);
                });

                fs.readFile("/proc/" + pid + "/cmdline", 'utf8', function (err, data) {
                    if (err) {
                        d.reject(err);
                        return;
                    }

                    pendingProcesses[pid].pending--;

                    var args = data.split("\x00");
                    args.pop();  // remove trailing item

                    if (args[0] === undefined) {  // this is a system process
                        pendingProcesses[pid].rejected = true;
                    } else {
                        pendingProcesses[pid].command = args[0];
                        args.splice(0, 1);
                        pendingProcesses[pid].args = args;
                    }

                    done(pid);
                });
            })(pid);
        }

        dispatched = true;

        resolve();
    });

    return d.promise;
};
