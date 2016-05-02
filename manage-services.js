/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/

exports.exportService = function(args){
    
    //Parsing arguments
    serviceName = args[1];
    remotePort = args[2];
    operation = args[3];
    
    //Getting information from the configuration file
    localPort = nconf.get('config:board:services:'+serviceName+':port');
    reverseTunnellingServer = nconf.get('config:reverse:server:url_reverse')+":"+nconf.get('config:reverse:server:port_reverse');
    
    console.log('Activating operation ' + operation + ' to service ' + serviceName + ' with remote port ' + remotePort + ' on local port ' + localPort + ' contacting remote server ' + reverseTunnellingServer);

    //Getting the path of the wstt.js module from the configuration file
    var reverseTunnellingClient = nconf.get('config:reverse:lib:bin');
    
    //If the operation is start
    if(operation === "start"){
      //I spawn a process executing the reverse tunnel client with appropriate parameters
      var spawn = require('child_process').spawn;
      
      console.log('Executing command: ' + reverseTunnellingClient + '-r '+remotePort+':'+'127.0.0.1'+':'+localPort + ' ' + reverseTunnellingServer);
      
      //I insert the new service in the array so that I can find it later when I have to stop the service
      var newService = {
         key: serviceName,
         process: spawn(reverseTunnellingClient, ['-r '+remotePort+':'+'127.0.0.1'+':'+localPort, reverseTunnellingServer])
      };
      servicesProcess.push(newService);

      
      newService.process.stdout.on('data', function(data){
         console.log('stdout of process ' + newService.process.pid + ': '+data);
      });
      newService.process.stderr.on('data', function(data){
         console.log('stderr of process ' + newService.process.pid + ': '+ data);
      });
      newService.process.on('close', function(code){
         console.log('child process ' + newService.process.pid + ' exited with code '+ code);
      });

   }
   if(operation === "stop"){
      //Looking for the process in the array
      var i = findValue(servicesProcess, serviceName, 'key');
      //Killing the process
      console.log('Killing process: ' + servicesProcess[i].process.pid);
      servicesProcess[i].process.kill('SIGINT');
      servicesProcess.splice(i,1);
   }
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