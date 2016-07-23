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

var assert = require('assert');

var helpers = require('../../../lib/utils/helpers');


describe('helpers isArray', function () {
    it('ensures that array is an array', function () {
        var l = [0];

        assert.ok(helpers.isArray(l));
        assert.ok(helpers.fallbackIsArray(l));
    });


    it('ensures that non-array is not an array', function () {
        var l = {};

        assert.ok(!helpers.isArray(l));
        assert.ok(!helpers.fallbackIsArray(l));
    });
});


describe('helpers objectKeys', function () {
    it('ensures that all own props are returned', function () {
        var o = {
            'a': 6,
            'hasOwnProperty': 3,
            'prototype': 56,
            'b': {
                'c': 1
            }
        };

        helpers.objectKeys(o).should.containDeep(['a', 'b', 'hasOwnProperty', 'prototype']);
        helpers.fallbackObjectKeys(o).should.containDeep(['a', 'b', 'hasOwnProperty', 'prototype']);
    });

});


describe('helpers clone', function () {

    it('clones an array', function () {
        var l = [1, 3, [2]];
        var c = helpers.clone(l);

        assert.notEqual(l, c);
        assert.deepEqual(l, c);

        c[0] = 10;
        assert.deepEqual(c, [10, 3, [2]]);
        assert.deepEqual(l, [1, 3, [2]]);

        c[2][0] = 15;
        assert.deepEqual(c, [10, 3, [15]]);
        assert.deepEqual(l, [1, 3, [15]]);
    });

    it('clones an object', function () {

        var o = {
            'a': 5,
            'b': {
                'c': 4
            }
        };
        var c = helpers.clone(o);

        assert.notEqual(o, c);
        assert.deepEqual(o, c);

        c['a'] = 10;
        assert.deepEqual(c, {
            'a': 10,
            'b': {
                'c': 4
            }
        });
        assert.deepEqual(o, {
            'a': 5,
            'b': {
                'c': 4
            }
        });

        c['b']['c'] = 15;
        assert.deepEqual(c, {
            'a': 10,
            'b': {
                'c': 15
            }
        });
        assert.deepEqual(o, {
            'a': 5,
            'b': {
                'c': 15
            }
        });
    });

    it('clones non-object', function () {
        var i = 6;
        var c = helpers.clone(i);

        assert.strictEqual(i, c);
    });
});
