//############################################################################################
//##
//# Copyright (C) 2014-2018 Dario Bruneo, Francesco Longo, Giovanni Merlino,
//# Nicola Peditto, Fabio Verboso
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################



//service logging configuration: "networksManager"   
var logger = log4js.getLogger('networksManager');
logger.setLevel(loglevel);

var Q = require("q");
var running = require('is-running');
var fs = require("fs");

var session_wamp;

var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;

var utility = require(LIGHTNINGROD_HOME + '/modules/board-manager/board-management');

var socat_pid = null;
var wstun_pid = null;


var spawn = require('child_process').spawn;



function update_net_conf(configFile, section) {
    //Updates the settings.json file
    fs.writeFile(SETTINGS, JSON.stringify(configFile, null, 4), function (err) {
        if (err) {
            logger.error('[VNET] --> Error writing settings.json file in ' + section + ' : ' + err);
        } else {
            logger.debug("[VNET] --> Section " + section + " in settings.json file updated.");
        }
    });
}



// This function starts the creation of the SOCAT tunnel
exports.setSocatOnBoard = function (args) {

    logger.info("[VNET] - Network Manager loaded!");


    if(args[5] != undefined){
        logger.warn(args[4] + " RESTORING...." +args[5])
        boardCode = args[4];
    }
    
    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    socatServer_ip = args[0];
    socatServer_port = args[1];
    socatBoard_ip = args[2];
    //var net_backend = args[3];
    net_backend = args[3];
    var socatRes = "Server:" + socatServer_ip + ":" + socatServer_port + " - Node: " + socatBoard_ip;

    response.result = "SUCCESS";
    response.message = boardCode + " ("+socatRes+")";

    logger.info("[VNET] --> Socat parameters received: " + socatRes);
    logger.info("[VNET] --> Network backend used: " + net_backend);

    exports.initNetwork(socatServer_ip, socatServer_port, socatBoard_ip, net_backend);

    d.resolve(response);

    return d.promise;

};


// This function:
// 1. creates the SOCAT tunnel using the parameter received from Iotronic.
// 2. On SOCAT tunnel completion it will create the WSTUN tunnel.
// 3. On tunnels completion it will advise Iotronic; later Iotronic will add this device to its VLANs.
exports.initNetwork = function (socatServer_ip, socatServer_port, socatBoard_ip, net_backend) {

    //logger.info("[VNET] --> Network initialization...");

    var spawn = require('child_process').spawn;

    var basePort = nconf.get('config:board:modules:vnets_manager:socat:client:port');
    var rtpath = nconf.get('auth:wstun:bin');
    var reverseS_url = nconf.get('auth:wstun:ws_url') + ":" + nconf.get('auth:wstun:ws_port');

    var configFile = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    var socat_config = configFile.config.board.modules.vnets_manager["socat"];
    var wstun_config = configFile.config.board.modules.vnets_manager["wstun"];


    logger.info("[VNET] --> Network Boot status:");

    // Kill Socat and WSTUN processes to clean network status after a network failure
    logger.info("[VNET] ----> Boot Socat PID: " + socat_pid);

    if (socat_pid != null) {

        logger.warn("[VNET] ... Socat cleaning PID [" + socat_pid + "]");

        try{

            process.kill(socat_pid);

        }catch (e) {

            logger.error('[VNET] ... Socat cleaning error: ', e);

        }

    } else {

        var socat_pid_conf = nconf.get('config:board:modules:vnets_manager:socat:pid');

        if (socat_pid_conf != "") {

            if (running(socat_pid_conf)) {
                logger.warn("[VNET] ... Socat first cleaning PID [" + socat_pid_conf + "]");
                process.kill(socat_pid_conf);
            }else{
                logger.debug("[VNET] ... Socat no cleaning needed!");
            }

        }
    }

    logger.info("[VNET] ----> Boot WSTUN PID: " + wstun_pid);

    if (wstun_pid != null) {

        logger.warn("[VNET] ... WSTUN cleaning PID [" + wstun_pid + "]");
        try{

            process.kill(wstun_pid)

        }catch (e) {

            logger.error('[VNET] ... WSTUN cleaning error: ', e);

        }

    } else {
        
        var wstun_pid_conf = nconf.get('config:reverse:pid');

        if (wstun_pid_conf != "") {

            if (running(wstun_pid_conf)) {
                logger.warn("[VNET] ... WSTUN first cleaning PID [" + wstun_pid_conf + "]");
                process.kill(wstun_pid_conf)
            }else{
                logger.debug("[VNET] ... WSTUN no cleaning needed!");
            }

        }

    }

    var cp = require('child_process');
    var socat = cp.fork(LIGHTNINGROD_HOME + '/modules/vnets-manager/network-wrapper');

    var input_message = {
        "socatBoard_ip": socatBoard_ip,
        "basePort": basePort,
        "socatServer_ip": socatServer_ip,
        "net_backend": net_backend
        //"socatServer_port":socatServer_port, //TO RESTORE
        //"boardCode": boardCode //TO RESTORE
    };

    socat.send(input_message);

    socat.on('message', function (msg) {

        if (msg.name != undefined) {

            if (msg.status === "alive") {

                // START WSTUN ------------------------------------------------------------------------------------------------
                logger.info("[VNET] - WSTUN activating...");

                logger.debug("[VNET] - WSTUN - " + rtpath + ' -r ' + socatServer_port + ':localhost:' + basePort, reverseS_url);
                var wstun_proc = spawn(rtpath, ['-r ' + socatServer_port + ':localhost:' + basePort, reverseS_url]);

                // Save WSTUN PID to clean network status after a network failure
                wstun_pid = wstun_proc.pid;
                wstun_config["pid"] = wstun_pid;
                update_net_conf(configFile, "WSTUN");

                wstun_proc.stdout.on('data', function (data) {
                    logger.debug('[VNET] - WSTUN - stdout: ' + data);
                });
                wstun_proc.stderr.on('data', function (data) {
                    logger.debug('[VNET] - WSTUN - stderr: ' + data);
                });
                wstun_proc.on('close', function (code) {
                    logger.warn('[VNET] - WSTUN - process exited with code ' + code);
                });
                //------------------------------------------------------------------------------------------------------------

            } else if (msg.status === "complete") {

                logger.info('[VNET] - Sending notification to IOTRONIC: ' + msg.status + ' - ' + msg.logmsg + ' - PID: ' + msg.pid + ' - wstun pid: ' + wstun_pid);

                // Save Socat PID to clean network status after a network failure
                socat_pid = msg.pid;
                socat_config["pid"] = socat_pid;
                update_net_conf(configFile, "Socat");

                try{
                    session_wamp.call('s4t.iotronic.vnet.result_network_board', [msg.logmsg, boardCode]).then(
                        function (response) {
                            logger.info('[VNET] --> response from IOTRONIC: \n' + response.message);
                            logger.info('[VNET] - TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
                        }
                    );
                }catch (e) {

                    logger.error('[VNET] --> Error calling IoTronic (RPC: s4t.iotronic.vnet.result_network_board): ', e);

                }

            }

        }


    });


};


// This function adds a board to a VNET
exports.addToNetwork = function (args) {

    logger.info("[VNET] - Add board to VNET...");

    if (net_backend == 'iotronic') {
        //INPUT PARAMETERS: args[0]: boardID - args[1]:vlanID - args[2]:boardVlanIP - args[3]:vlanMask - args[4]:vlanName

        var nodeID = args[0];
        var vlanID = args[1];
        var boardVlanIP = args[2];
        var vlanMask = args[3];
        var vlanName = args[4];

        logger.info("[VNET] - ADDING BOARD TO VLAN " + vlanName + "...");

        //ip link add link gre-lr0 name gre-lr0.<vlan> type vlan id <vlan>
        var add_vlan_iface = spawn('ip', ['link', 'add', 'link', 'gre-lr0', 'name', 'gre-lr0.' + vlanID, 'type', 'vlan', 'id', vlanID]);
        logger.debug('[VNET] --> NETWORK COMMAND: ip link add link gre-lr0 name gre-lr0.' + vlanID + ' type vlan id ' + vlanID);

        add_vlan_iface.stdout.on('data', function (data) {
            logger.debug('[VNET] ----> stdout - add_vlan_iface: ' + data);
        });
        add_vlan_iface.stderr.on('data', function (data) {
            logger.debug('[VNET] ----> stderr - add_vlan_iface: ' + data);
        });

        add_vlan_iface.on('close', function (code) {

            //ip addr add <ip/mask> dev gre-lr0.<vlan>
            var add_vlan_ip = spawn('ip', ['addr', 'add', boardVlanIP + '/' + vlanMask, 'dev', 'gre-lr0.' + vlanID]);
            logger.debug('[VNET] --> NETWORK COMMAND: ip addr add ' + boardVlanIP + '/' + vlanMask + ' dev gre-lr0.' + vlanID);

            add_vlan_ip.stdout.on('data', function (data) {
                logger.debug('[VNET] ----> stdout - add_vlan_ip: ' + data);
            });
            add_vlan_ip.stderr.on('data', function (data) {
                logger.debug('[VNET] ----> stderr - add_vlan_ip: ' + data);
            });

            add_vlan_ip.on('close', function (code) {

                //ip link set gre-lr0.<vlan> up
                var greVlan_up = spawn('ip', ['link', 'set', 'gre-lr0.' + vlanID, 'up']);
                logger.debug('[VNET] --> GRE IFACE UP: ip link set gre-lr0.' + vlanID + ' up');

                greVlan_up.stdout.on('data', function (data) {
                    logger.debug('[VNET] ----> stdout - greVlan_up: ' + data);
                });
                greVlan_up.stderr.on('data', function (data) {
                    logger.debug('[VNET] ----> stderr - greVlan_up: ' + data);
                });
                greVlan_up.on('close', function (code) {
                    logger.debug('[VNET] --> VLAN IFACE gre-lr0.' + vlanID + ' is UP!');
                    logger.info("[VNET] --> BOARD SUCCESSFULLY ADDED TO VLAN " + vlanName + " with IP " + boardVlanIP);
                });

            });

        });
        
    } else {

        //INPUT PARAMETERS: args[0]: boardID - args[1]:vlanID - args[2]:port
        var vlanID = args[1];
        var port = args[2];
        var cidr = args[3];

        logger.info("ADDING BOARD TO VLAN " + port.networkId + "...");

        iface = 'socat0.' + vlanID;

        mac = port.macAddress;
        var add_vlan_iface = utility.execute('ip link add link socat0 address ' + mac + ' name ' + iface + ' type vlan id ' + vlanID, ' --> NETWORK');

        add_vlan_iface.on('close', function (code) {
            
            logger.info('--> CREATED ' + iface);

            var ip = port.fixedIps[0].ip_address;
            var add_vlan_ip = utility.execute('ip addr add ' + ip + '/' + cidr + ' dev ' + iface, ' --> NETWORK');

            add_vlan_ip.on('close', function (code) {

                logger.info("--> VLAN IFACE configured with ip " + ip + "/" + cidr);
                var iface_up = utility.execute('ip link set ' + iface + ' up', ' --> NETWORK');
                iface_up.on('close', function (code) {
                    logger.info("--> VLAN IFACE UP!");
                    logger.info("BOARD SUCCESSFULLY ADDED TO VLAN: " + port.networkId);

                });

            });

        });
        
    }
    

};


// This function adds a board to a VNET
exports.removeFromNetwork = function (args) {

    logger.info("[VNET] - Remove board from VNET...");

    if (net_backend == 'iotronic') {

        //INPUT PARAMETERS: args[0]: boardID - args[1]:vlanID - args[2]:vlanName
        var nodeID = args[0];
        var vlanID = args[1];
        var vlanName = args[2];

        logger.info("[VNET] - REMOVING BOARD FROM VLAN " + vlanName + "...");

        //ip link del gre-lr0.<vlan>
        var del_greVlan = spawn('ip', ['link', 'del', 'gre-lr0.' + vlanID]);
        logger.debug('[VNET] --> DEL GRE IFACE: ip link del gre-lr0.' + vlanID);

        del_greVlan.stdout.on('data', function (data) {
            logger.info('[VNET] ----> stdout - del_greVlan: ' + data);
        });
        del_greVlan.stderr.on('data', function (data) {
            logger.info('[VNET] ----> stderr - del_greVlan: ' + data);
        });
        del_greVlan.on('close', function (code) {
            logger.info("[VNET] --> VLAN IFACE gre-lr0." + vlanID + " DELETED!");
            logger.info("[VNET] --> BOARD SUCCESSFULLY REMOVED FROM VLAN " + vlanName);
        });
        

    } else {

        //INPUT PARAMETERS: args[0]: - args[1]:vlanID - args[2]:net_uuid
        var vlanID = args[1];
        var net_uuid = args[2];

        logger.info("REMOVING BOARD FROM LAN " + net_uuid + "...");

        iface = 'socat0.' + vlanID;

        var add_vlan_iface = utility.execute('ip link del ' + iface, ' --> NETWORK');

        add_vlan_iface.on('close', function () {
            logger.info('--> DELETED ' + iface);
        });

    }    


};


// This function exports all the functions in the module as WAMP remote procedure calls
exports.Init = function (session) {

    session_wamp = session;
    
    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+ boardCode + '.vnet.setSocatOnBoard', exports.setSocatOnBoard);
    session.register('s4t.'+ boardCode + '.vnet.addToNetwork', exports.addToNetwork);
    session.register('s4t.'+ boardCode + '.vnet.removeFromNetwork', exports.removeFromNetwork);

    logger.info('[WAMP-EXPORTS] Network commands exported to the cloud!');

};


//This function executes procedures at boot time (no Iotronic dependent)
exports.Boot = function (){

    logger.info('[BOOT] - VNET Manager booting procedures not defined.');

};