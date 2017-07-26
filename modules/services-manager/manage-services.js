/*
*				                  Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/

//service logging configuration: "manageCommands"   
var logger = log4js.getLogger('manageServices');
logger.setLevel(loglevel);

//Services list: it is used to store the services process data that are started in the current LR session
servicesProcess = [];

var Q = require("q");


// This function expose a service
exports.enableService = function(args){

    // Parsing the input arguments
    var serviceName = String(args[0]);
    var localPort = String(args[1]);
    var publicPort = String(args[2]);
    var restore = String(args[3]);

    var response = {
        message: '',
        result: ''
    };

    var d = Q.defer();


    logger.debug("[SERVICE] - RPC enableService called: " + args)

    //Looking for the process in the array
    var i = findValue(servicesProcess, serviceName, 'key');

    if ( i != -1) {

        if(restore == "true"){

            logger.info('[SERVICE] - Restoring tunnel for '+ serviceName + 'service...');

            //Killing the process
            logger.debug('[SERVICE] --> killing '+serviceName+' process [ PID ' + servicesProcess[i].process.pid + " ]");
            servicesProcess[i].process.kill('SIGINT');
            servicesProcess.splice(i,1);

            createTunnel(serviceName, localPort, publicPort, function (newTunnel) {

                response.result = "SUCCESS";
                response.message = "Service "+ serviceName +" successfully restored on port " + publicPort + " - [PID "+newTunnel.process.pid+"]";
                logger.info('[SERVICE] --> ' + response.message);
                d.resolve(response);

            });


        }else{

            logger.warn("Service already active!");
            response.result = "WARNING";
            response.message = "Service "+ serviceName +" already active!";
            logger.info('[SERVICE] - ' + response.message);
            d.resolve(response);

        }
        


    }else{


        logger.info('[SERVICE] - Exposing new tunnel for '+ serviceName + ' service...');
        createTunnel(serviceName, localPort, publicPort, function (newTunnel) {

            response.result = "SUCCESS";
            response.message = "Service "+ serviceName +" successfully exposed on port " + publicPort + " - [PID "+newTunnel.process.pid+"]";
            logger.info('[SERVICE] --> ' + response.message);
            d.resolve(response);

        });

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

    logger.info('[SERVICE] - Disabling ' + serviceName + " service...");

    var d = Q.defer();

    //Looking for the process in the array
    var i = findValue(servicesProcess, serviceName, 'key');
    
    if(i != -1){

        //Killing the process
        logger.debug('[SERVICE] --> killing '+serviceName+' process [ PID ' + servicesProcess[i].process.pid + " ]");
        servicesProcess[i].process.kill('SIGINT');

        response.result = "SUCCESS";
        response.message = "Tunnel for "+ serviceName +" service successfully removed from public port " + servicesProcess[i].port;
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

    logger.info('[SERVICE] - Checking ' + serviceName + " service...");

    var d = Q.defer();

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

    return d.promise;
    
};



function createTunnel(serviceName, localPort, publicPort, callback) {

    reverseTunnellingServer = nconf.get('config:reverse:server:url_reverse')+":"+nconf.get('config:reverse:server:port_reverse');

    logger.info('[SERVICE] --> exposing local port ' + localPort + ' on public port ' + publicPort + ' contacting remote server ' + reverseTunnellingServer);

    //Getting the path of the wstt.js module from the configuration file
    var reverseTunnellingClient = nconf.get('config:reverse:lib:bin');

    //I spawn a process executing the reverse tunnel client with appropriate parameters
    var spawn = require('child_process').spawn;

    logger.debug('[SERVICE] --> executing command: ' + reverseTunnellingClient + ' -r '+publicPort+':'+'127.0.0.1'+':'+localPort + ' ' + reverseTunnellingServer);

    //I insert the new service in the array so that I can find it later when I have to stop the service
    var newTunnel = {
        key: serviceName,
        port: publicPort,
        process: spawn(reverseTunnellingClient, ['-r '+publicPort+':'+'127.0.0.1'+':'+localPort, reverseTunnellingServer])
    };

    servicesProcess.push(newTunnel);

    newTunnel.process.stdout.on('data', function(data){
        logger.debug('[SERVICE] - onData - '+newTunnel.key+' stdout of process ' + newTunnel.process.pid + ': '+data);
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




/*
exports.exportService = function(args){
    
    //Parsing arguments
    serviceName = args[1];
    remotePort = args[2];
    operation = args[3];
    
    //Getting information from the configuration file
    localPort = nconf.get('config:board:services:'+serviceName+':port');
    reverseTunnellingServer = nconf.get('config:reverse:server:url_reverse')+":"+nconf.get('config:reverse:server:port_reverse');

    logger.info('[SERVICE] - '+ operation + ' service ' + serviceName + ' on local port ' + localPort +  ' with remote port ' + remotePort + ' contacting remote server ' + reverseTunnellingServer);

    //Getting the path of the wstt.js module from the configuration file
    var reverseTunnellingClient = nconf.get('config:reverse:lib:bin');
    
    //If the operation is start
    if(operation === "start"){
        
        //I spawn a process executing the reverse tunnel client with appropriate parameters
        var spawn = require('child_process').spawn;

        logger.debug('[SERVICE] - Executing command: ' + reverseTunnellingClient + ' -r '+remotePort+':'+'127.0.0.1'+':'+localPort + ' ' + reverseTunnellingServer);

        //I insert the new service in the array so that I can find it later when I have to stop the service
        var newService = {
            key: serviceName,
            process: spawn(reverseTunnellingClient, ['-r '+remotePort+':'+'127.0.0.1'+':'+localPort, reverseTunnellingServer])
        };

        servicesProcess.push(newService);

        newService.process.stdout.on('data', function(data){
            logger.debug('[SERVICE] - '+newService.key+' stdout of process ' + newService.process.pid + ': '+data);
        });
        newService.process.stderr.on('data', function(data){
            logger.debug('[SERVICE] - '+newService.key+' stderr of process ' + newService.process.pid + ': '+ data);
        });
        newService.process.on('close', function(code){
            logger.debug('[SERVICE] - '+newService.key+' child process ' + newService.process.pid + ' exited with code '+ code);
        });

   }
    
   if(operation === "stop"){
       
        //Looking for the process in the array
        var i = findValue(servicesProcess, serviceName, 'key');
        //Killing the process
        logger.info('[SERVICE] - Killing '+serviceName+' process: ' + servicesProcess[i].process.pid);
        servicesProcess[i].process.kill('SIGINT');
        servicesProcess.splice(i,1);
       
   }
    
};
*/







//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportServiceCommands = function (session){

    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+boardCode+'.service.enable', exports.enableService);
    session.register('s4t.'+boardCode+'.service.disable', exports.disableService);
    session.register('s4t.'+boardCode+'.service.checkService', exports.checkService);
    
    logger.info('[WAMP-EXPORTS] Services commands exported to the cloud!');

};



