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

var helpers = require('../../../lib/utils/helpers');
var nconfWrapper = require('../../../lib/utils/nconf-wrapper');


// automatically cleanup after process exit
temp.track();

describe('nconf reload', function () {

    var nconf = nconfWrapper.nconf;

    var originalEnv;
    var originalCwd;
    beforeEach(function () {
        originalEnv = helpers.clone(process.env);
        originalCwd = process.cwd();
    });

    afterEach(function () {
        process.env = originalEnv;
        process.chdir(originalCwd);
    });


    it('ensures that loading settings from nothing must not cause an exception', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);

            nconfWrapper.reload();

            done();
        });
    });


    it('loads nconf settings from the env', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);
            nconfWrapper.reload();  // reset settings stored from other tests

            var filename = "./blahblah.conf";

            process.env.S4T_LR_SETTINGS_FILE = filename;
            fs.writeFile(filename, JSON.stringify({
                'foo': {
                    'bar': 345
                }
            }), function (err) {
                if (err) throw err;

                assert.equal(nconf.get('foo:bar'), undefined);
                nconfWrapper.reload();
                assert.equal(nconf.get('foo:bar'), 345);

                done();
            })
        });

    });


    it('loads nconf settings from the default file', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);
            nconfWrapper.reload();  // reset settings stored from other tests

            var filename = "./settings.json";

            fs.writeFile(filename, JSON.stringify({
                'foo': {
                    'bar': 3450
                }
            }), function (err) {
                if (err) throw err;

                assert.equal(nconf.get('foo:bar'), undefined);
                nconfWrapper.reload();
                assert.equal(nconf.get('foo:bar'), 3450);

                done();
            })
        });

    });


    it('reloads nconf settings on runtime', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);
            nconfWrapper.reload();  // reset settings stored from other tests

            var filename = "./settings.json";

            fs.writeFile(filename, JSON.stringify({
                'foo': {
                    'bar': 34502
                }
            }), function (err) {
                if (err) throw err;


                assert.equal(nconf.get('foo:bar'), undefined);
                nconfWrapper.reload();
                assert.equal(nconf.get('foo:bar'), 34502);

                fs.writeFile(filename, JSON.stringify({
                    'foo': {
                        'bar': 123
                    }
                }), function (err) {
                    if (err) throw err;

                    nconfWrapper.reload();
                    assert.equal(nconf.get('foo:bar'), 123);

                    done();
                });

            })
        });

    });


    it('reloads nconf settings on runtime with non-existing file', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);
            nconfWrapper.reload();  // reset settings stored from other tests

            var filename = "./settings.json";

            fs.writeFile(filename, JSON.stringify({
                'foo': {
                    'bar': 5432
                }
            }), function (err) {
                if (err) throw err;


                assert.equal(nconf.get('foo:bar'), undefined);
                nconfWrapper.reload();
                assert.equal(nconf.get('foo:bar'), 5432);

                fs.unlink(filename, function (err) {
                    if (err) throw err;

                    nconfWrapper.reload();
                    assert.equal(nconf.get('foo:bar'), undefined);

                    done();
                });

            })
        });

    });
});


describe('nconf save', function () {

    var nconf = nconfWrapper.nconf;

    var originalEnv;
    var originalCwd;
    beforeEach(function () {
        originalEnv = helpers.clone(process.env);
        originalCwd = process.cwd();
    });

    afterEach(function () {
        process.env = originalEnv;
        process.chdir(originalCwd);
    });


    it('loads nconf settings from the env and saves it back', function (done) {

        temp.mkdir("test", function (err, dirPath) {
            if (err) throw err;
            process.chdir(dirPath);
            nconfWrapper.reload();  // reset settings stored from other tests

            var filename = "./blahblah.conf";

            process.env.S4T_LR_SETTINGS_FILE = filename;
            fs.writeFile(filename, JSON.stringify({
                'foo': {
                    'bar': 345
                }
            }), function (err) {
                if (err) throw err;

                assert.equal(nconf.get('foo:bar'), undefined);
                nconfWrapper.reload();
                assert.equal(nconf.get('foo:bar'), 345);

                nconf.set('foo:bar', 1323);

                nconfWrapper.save()
                    .then(function() {

                        assert.equal(nconf.get('foo:bar'), 1323);
                        nconf.set('foo:bar', 4738384);
                        assert.equal(nconf.get('foo:bar'), 4738384);
                        nconfWrapper.reload();
                        assert.equal(nconf.get('foo:bar'), 1323);

                        done();
                    })
                    .done();
            })
        });

    });

});