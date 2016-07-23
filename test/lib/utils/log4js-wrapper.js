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

var fs = require('fs');
var assert = require('assert');
var temp = require('temp');
var sinon = require('sinon');
var nconf = require('nconf');

var helpers = require('../../../lib/utils/helpers');
var log4jsWrapper = require('../../../lib/utils/log4js-wrapper');


// automatically cleanup after process exit
temp.track();

describe("log4js getLogger", function () {

    it('ensures that getLogger respects the name', function () {
        var name = "ASLHJjkfDSAKGFdS";
        var logger = log4jsWrapper.getLogger(name);

        assert.equal(logger.category, name);
    });

});


describe("log4js reload", function () {

    var originalEnv;
    var originalCwd;
    beforeEach(function () {
        originalEnv = helpers.clone(process.env);
        originalCwd = process.cwd();
    });

    afterEach(function () {
        process.env = originalEnv;
        process.chdir(originalCwd);

        // reset to default configuration
        log4jsWrapper.log4js.appenders = {};
        log4jsWrapper.log4js.configure();
    });


    it('ensures that absent logger settings causes an exception during loading', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);

            assert.throws(function () {
                log4jsWrapper.reload();
            }, Error);

            done();
        });

    });


    it('loads logger settings from env file', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);

            var filename = "./fdskjgfsdjkhg.json";
            process.env.LOG4JS_CONFIG = filename;

            fs.writeFile(filename, JSON.stringify({
                "appenders": [
                    {
                        "type": "logLevelFilter",
                        "level": "INFO",
                        "appender": {
                            "type": "file",
                            "filename": "log.txt"
                        }
                    }
                ]
            }), function (err) {
                if (err) throw err;

                assert.ok(!log4jsWrapper.log4js.appenders.logLevelFilter);
                log4jsWrapper.reload();
                assert.ok(log4jsWrapper.log4js.appenders.logLevelFilter);

                done();
            });
        });

    });


    it('loads logger settings from default file', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);

            var filename = "./log4js.json";

            fs.writeFile(filename, JSON.stringify({
                "appenders": [
                    {
                        "type": "logLevelFilter",
                        "level": "INFO",
                        "appender": {
                            "type": "file",
                            "filename": "log.txt"
                        }
                    }
                ]
            }), function (err) {
                if (err) throw err;

                assert.ok(!log4jsWrapper.log4js.appenders.logLevelFilter);
                log4jsWrapper.reload();
                assert.ok(log4jsWrapper.log4js.appenders.logLevelFilter);

                done();
            });
        });

    });


    it('ensures that reload actually reloads configuration', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);

            var filename = "./log4js.json";

            fs.writeFile(filename, JSON.stringify({
                appenders: [
                    {
                        "type": "file",
                        "filename": "log.txt"
                    }
                ]
            }), function (err) {
                if (err) throw err;

                assert.ok(!log4jsWrapper.log4js.appenders.file);
                log4jsWrapper.reload();
                assert.ok(log4jsWrapper.log4js.appenders.file);

                fs.writeFile(filename, JSON.stringify({
                    "appenders": [
                        {
                            "type": "logLevelFilter",
                            "level": "INFO",
                            "appender": {
                                "type": "file",
                                "filename": "log.txt"
                            }
                        }
                    ]
                }), function (err) {
                    if (err) throw err;

                    assert.ok(!log4jsWrapper.log4js.appenders.logLevelFilter);
                    log4jsWrapper.reload();
                    assert.ok(log4jsWrapper.log4js.appenders.logLevelFilter);

                    done();
                });
            });
        });

    });
});


describe("log4js reload with nconf", function () {

    var originalCwd;
    var mockedNconf;
    beforeEach(function () {
        originalCwd = process.cwd();
        mockedNconf = sinon.stub(nconf, "get");
    });

    afterEach(function () {
        process.chdir(originalCwd);

        // reset to default configuration
        log4jsWrapper.log4js.appenders = {};
        log4jsWrapper.log4js.configure();

        mockedNconf.restore();
    });


    it('loads logger settings from nconf', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);

            mockedNconf.withArgs("config:log").returns({
                'loglevel': 'DEBUG',
                'logfile': 'log.txt'
            });

            assert.ok(!log4jsWrapper.log4js.appenders.logLevelFilter);
            log4jsWrapper.reload(nconf);
            assert.ok(log4jsWrapper.log4js.appenders.logLevelFilter);

            done();

        });

    });
});
