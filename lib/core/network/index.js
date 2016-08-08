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


var spawn = require('child_process').spawn;
var Q = require('q');

var logger = require('../../utils/log4js-wrapper').getLogger("Network");


/**
 * Network subsystem singleton
 */
var Network = module.exports = {};


/**
 * Add board to VLAN
 *
 * @param vlanID
 * @param boardVlanIP
 * @param vlanMask
 * @param vlanName
 * @returns {Q.Promise}
 */
Network.addToVlan = function (  // eslint-disable-line max-params
    vlanID, boardVlanIP, vlanMask, vlanName) {
    var d = Q.defer();
    logger.info("ADDING BOARD TO VLAN " + vlanName + "...");

    //ip link add link gre-lr0 name gre-lr0.<vlan> type vlan id <vlan>
    var addVlanIfaceProcess = spawn('ip', ['link', 'add', 'link', 'gre-lr0', 'name',
        'gre-lr0.' + vlanID, 'type', 'vlan', 'id', vlanID]);
    logger.info('NETWORK COMMAND: ip link add link gre-lr0 name gre-lr0.'
        + vlanID + ' type vlan id ' + vlanID);

    addVlanIfaceProcess.stdout.on('data', function (data) {
        logger.info('--> stdout - add_vlan_iface: ' + data);
    });
    addVlanIfaceProcess.stderr.on('data', function (data) {
        logger.info('--> stderr - add_vlan_iface: ' + data);
    });

    addVlanIfaceProcess.on('close', function (code) {
        if (code !== 0) {
            logger.warn("addToVlan add_vlan_iface failed: exit code " + code);
            d.reject(new Error("add_vlan_iface failed"));
            return;
        }

        //ip addr add <ip/mask> dev gre-lr0.<vlan>
        var addVlanIpProcess = spawn('ip', ['addr', 'add', boardVlanIP + '/' + vlanMask,
            'dev', 'gre-lr0.' + vlanID]);
        logger.info('NETWORK COMMAND: ip addr add ' + boardVlanIP + '/' + vlanMask
            + ' dev gre-lr0.' + vlanID);

        addVlanIpProcess.stdout.on('data', function (data) {
            logger.info('--> stdout - add_vlan_ip: ' + data);
        });
        addVlanIpProcess.stderr.on('data', function (data) {
            logger.info('--> stderr - add_vlan_ip: ' + data);
        });
        addVlanIpProcess.on('close', function (code) {
            if (code !== 0) {
                logger.warn("addToVlan add_vlan_ip failed: exit code " + code);
                d.reject(new Error("add_vlan_ip failed"));
                // todo maybe delete iface here?
                return;
            }

            //ip link set gre-lr0.<vlan> up
            var greVlanUpProcess = spawn('ip', ['link', 'set', 'gre-lr0.' + vlanID, 'up']);
            logger.info('GRE IFACE UP: ip link set gre-lr0.' + vlanID + ' up');

            greVlanUpProcess.stdout.on('data', function (data) {
                logger.info('--> stdout - greVlan_up: ' + data);
            });
            greVlanUpProcess.stderr.on('data', function (data) {
                logger.info('--> stderr - greVlan_up: ' + data);
            });
            greVlanUpProcess.on('close', function (code) {
                if (code !== 0) {
                    logger.warn("addToVlan greVlan_up failed: exit code " + code);
                    d.reject(new Error("greVlan_up failed"));
                    // todo maybe delete iface here?
                    return;
                }

                logger.info("--> VLAN IFACE UP!");
                logger.info("BOARD SUCCESSFULLY ADDED TO VLAN: " + boardVlanIP + '/' + vlanMask);

                d.resolve();
            });
        });
    });

    return d.promise;
};


/**
 * Remove board from VLAN
 *
 * @param vlanID
 * @param vlanName
 * @returns {Q.Promise}
 */
Network.removeFromVlan = function (vlanID, vlanName) {
    var d = Q.defer();

    logger.info("REMOVING BOARD FROM VLAN " + vlanName + "...");

    //NEW-net
    //ip link del gre-lr0.<vlan>
    var delGreVlanProcess = spawn('ip', ['link', 'del', 'gre-lr0.' + vlanID]);
    logger.info('DEL GRE IFACE: ip link del gre-lr0.' + vlanID);

    delGreVlanProcess.stdout.on('data', function (data) {
        logger.info('--> stdout - del_greVlan: ' + data);
    });
    delGreVlanProcess.stderr.on('data', function (data) {
        logger.info('--> stderr - del_greVlan: ' + data);
    });
    delGreVlanProcess.on('close', function (code) {
        if (code !== 0) {
            logger.warn("addToVlan del_greVlan failed: exit code " + code);
            d.reject(new Error("del_greVlan failed"));
            return;
        }

        logger.info("--> VLAN IFACE DELETED!");

        logger.info("BOARD SUCCESSFULLY REMOVED FROM VLAN " + vlanName);

        d.resolve();
    });

    return d.promise;
};
