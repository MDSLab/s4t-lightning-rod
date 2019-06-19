//############################################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.stderr of process
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################


//service logging configuration: "manageCommands"   
var logger = log4js.getLogger('servicesManager');
logger.setLevel(loglevel);

//Services list: it is used to store the services process data that are started in the current LR session
servicesProcess = [];

var Q = require("q");
var running = require('is-running');  	//In order to verify if a tunnel-process is alive or not.



// This function expose a service
exports.enableService = function(args){

    // Parsing the input arguments
    var serviceName = String(args[0]);
    var localPort = String(args[1]);
    var publicPort = String(args[2]);
    var restore = String(args[3]);
    var db_tunnel_pid = String(args[4]);

    var response = {
        message: '',
        result: ''
    };

    var d = Q.defer();

    logger.debug("[SERVICE] - RPC enableService called: " + args);

    var i = findValue(servicesProcess, serviceName, 'key');

    if(running(db_tunnel_pid)){

        // Call when Restore tunnel API is called and after injection LR conf is called

        //kill tunnel process
        process.kill(db_tunnel_pid);

        logger.warn("[SERVICE] --> Tunnel process of service '"+ serviceName +"' still active: killed!");

        //clean data structure
        var i = findValue(servicesProcess, serviceName, 'key');
        servicesProcess.splice(i,1);

        createTunnel(serviceName, localPort, publicPort, function (newTunnel) {

            response.result = "SUCCESS";
            response.pid = newTunnel.process.pid;
            response.message = "Service '"+ serviceName +"' successfully restored on port " + publicPort;
            logger.info('[SERVICE] --> ' + response.message);
            d.resolve(response);

        });


    }else{

        //Looking for the process in the array
        var i = findValue(servicesProcess, serviceName, 'key');

        if ( i != -1) {

            // if service is active and stored in servicesProcess array

            if(restore == "true"){

                // Call when self-Restore tunnel procedure is called: when connection is recovered!
                logger.info("[SERVICE] - Restoring tunnel for '"+ serviceName + "' service...");

                //Killing the process
                logger.debug('[SERVICE] --> killing '+serviceName+' process [ PID ' + servicesProcess[i].process.pid + " ]");
                servicesProcess[i].process.kill('SIGINT');


                servicesProcess.splice(i,1);

                createTunnel(serviceName, localPort, publicPort, function (newTunnel) {

                    response.result = "SUCCESS";
                    response.pid = newTunnel.process.pid;
                    response.message = "Service '"+ serviceName +"' successfully restored (new wstun process) on port " + publicPort;
                    logger.info('[SERVICE] --> ' + response.message);
                    d.resolve(response);

                });

            }else{

                response.result = "WARNING";
                response.message = "Service '"+ serviceName +"' already active!";
                logger.info('[SERVICE] - ' + response.message);
                d.resolve(response);

            }

        }
        else{

            // Call when LR restore tunnels at boot time and when enable-service API is called

            logger.info("[SERVICE] - Exposing new tunnel for '"+ serviceName + "' service...");
            createTunnel(serviceName, localPort, publicPort, function (newTunnel) {

                response.result = "SUCCESS";
                response.pid = newTunnel.process.pid;
                response.message = "Service '"+ serviceName +"' successfully exposed on port " + publicPort;// + " - [PID "+newTunnel.process.pid+"]";
                logger.info('[SERVICE] --> ' + response.message);
                d.resolve(response);

            });

        }


    }
    
    return d.promise;

};


// This function expose a service
exports.disableService = function(args){

    var serviceName = args[0];

    var response = {
        message: '',
        result: ''
    };
    
    var service = {
        status: "",
        pid: "",
        name: "",
        message:""
    };

    logger.info("[SERVICE] - Disabling '" + serviceName + "' service...");

    var d = Q.defer();

    //Looking for the process in the array
    var i = findValue(servicesProcess, serviceName, 'key');
    
    if(i != -1){

        //Killing the process
        logger.debug('[SERVICE] --> killing '+serviceName+' process [ PID ' + servicesProcess[i].process.pid + " ]");
        servicesProcess[i].process.kill('SIGINT');

        response.result = "SUCCESS";
        response.message = "Tunnel for '"+ serviceName +"' service successfully removed from public port " + servicesProcess[i].port;
        logger.info('[SERVICE] --> ' + response.message);

        servicesProcess.splice(i,1);

        d.resolve(response);

    }else{
        response.result = "WARNING";
        service.message = serviceName +" service is inactive!";
        service.status = "INACTIVE";
        service.pid = null;
        service.name = serviceName;
        response.message = service;
        logger.warn('[SERVICE] --> ' + JSON.stringify(response.message));
        d.resolve(response);
    }



    return d.promise;

};


// This function check service status
exports.checkService = function(args){

    var serviceName = args[0];
    var serviceDbPID = args[1];

    var response = {
        message: '',
        result: ''
    };

    var service = {
        status: "",
        pid: "",
        name: "",
        message:""
    };

    logger.info("[SERVICE] - Checking '" + serviceName + "' service...");

    var d = Q.defer();
    
    if(running(serviceDbPID)){

        response.result = "WARNING";
        service.message = serviceName +" service is still active!";
        service.status = "ACTIVE";
        service.pid = serviceDbPID;
        service.name = serviceName;
        response.message = service;
        logger.info('[SERVICE] --> ' + JSON.stringify(response.message));
        d.resolve(response);

    }else{

        //Looking for the process in the array
        var i = findValue(servicesProcess, serviceName, 'key');

        if(i == -1){

            response.result = "SUCCESS";
            service.message = serviceName +" service is inactive!";
            service.status = "INACTIVE";
            service.pid = null;
            service.name = serviceName;
            response.message = service;
            logger.warn('[SERVICE] --> ' + JSON.stringify(response.message));
            d.resolve(response);

        }else{

            response.result = "WARNING";
            service.message = serviceName +" service is active!";
            service.status = "ACTIVE";
            service.pid = servicesProcess[i].process.pid;
            service.name = serviceName;
            response.message = service;
            logger.info('[SERVICE] --> ' + JSON.stringify(response.message));
            d.resolve(response);

        }

    }



    return d.promise;
    
};



function createTunnel(serviceName, localPort, publicPort, callback) {

    reverseTunnellingServer = wstun_url+":"+wstun_port;
    
    logger.info('[SERVICE] --> exposing local port ' + localPort + ' on public port ' + publicPort + ' contacting remote server ' + reverseTunnellingServer);

    //Getting the path of the wstun.js module from the configuration file
    var reverseTunnellingClient = wstun_lib;

    //I spawn a process executing the reverse tunnel client with appropriate parameters
    var spawn = require('child_process').spawn;

    logger.debug('[SERVICE] --> executing command: ' + reverseTunnellingClient + ' -r '+publicPort+':'+'127.0.0.1'+':'+localPort + ' ' + reverseTunnellingServer);

    //I insert the new service in the array so that I can find it later when I have to stop the service
    var newTunnel = {
        key: serviceName,
        port: publicPort,
        //restore: false,
        process: spawn(reverseTunnellingClient, ['-r '+publicPort+':'+'127.0.0.1'+':'+localPort, reverseTunnellingServer])
    };

    //console.log(newTunnel)
    servicesProcess.push(newTunnel);

    newTunnel.process.stdout.on('data', function(data){
        logger.debug('[SERVICE] - onData - '+newTunnel.key+' stdout of process ' + newTunnel.process.pid + ': '+data.toString().replace(/\n$/, ''));
    });
    newTunnel.process.stderr.on('data', function(data){
        logger.error('[SERVICE] - onError - '+newTunnel.key+' stderr of process ' + newTunnel.process.pid + ': '+ data);
    });
    newTunnel.process.on('close', function(code){
        logger.debug('[SERVICE] - onClose - '+newTunnel.key+' child process ' + newTunnel.process.pid + ' exited with code '+ code);
    });

    callback(newTunnel);

}

//Function that search a process in the array
function findValue(myArray, value, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === value) {
            return i;
        }
    }
    return -1;
}




//This function exports all the functions in the module as WAMP remote procedure calls
exports.Init = function (session){

    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+boardCode+'.service.enable', exports.enableService);
    session.register('s4t.'+boardCode+'.service.disable', exports.disableService);
    session.register('s4t.'+boardCode+'.service.checkService', exports.checkService);
    
    logger.info('[WAMP-EXPORTS] Services commands exported to the cloud!');

    logger.info('[SERVICE] - Service restoring started...');
    session.call('s4t.iotronic.service.restore', [boardCode]).then(
        function (response) {
            logger.info('[SERVICE] --> Response from IoTronic: ' + response.message);
            logger.info('[SERVICE] --> Services restoring completed!');
        }
    );
    

};




//This function executes procedures at boot time (no Iotronic dependent)
exports.Boot = function (){

    logger.info('[BOOT] - Services Manager booting procedures not defined.');

};

