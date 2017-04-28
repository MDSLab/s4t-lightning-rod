/*
*				                  Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/

//service logging configuration: "manageCommands"   
var log4js = require('log4js');
var logger = log4js.getLogger('manageServices');

//Services list: it is used to store the services process data that are started in the current LR session
servicesProcess = [];

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

//Function that search a process in the array
function findValue(myArray, value, property) {
   for(var i = 0, len = myArray.length; i < len; i++) {
      if (myArray[i][property] === value) {
         return i;
      }
   }
   return -1;
}