/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Arthur Warnier, Fabio Verboso, Nicola Peditto
* 
*/


//service logging configuration: "manageNetworks"   
var logger = log4js.getLogger('manageNetworks');

var Q = require("q");

var session_wamp;

//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportNetworkCommands = function (session){
    
  var boardCode = nconf.get('config:board:code');
  
  //Register all the module functions as WAMP RPCs    
  session.register(boardCode+'.command.rpc.network.setSocatOnBoard', exports.setSocatOnBoard);
  session_wamp = session;
  logger.info('[WAMP-EXPORTS] Network commands exported to the cloud!')

}







exports.setSocatOnBoard = function (args, details){
  
  logger.info("[NETWORK-MANAGER] - Network manager loaded!");
  
  var d = Q.defer();
  
  //logger.info("Active flag status: " + active);
  
  //if(active){
  if(true){
    
    //logger.warn("FIRST NETWORK INITIALIZATION:");
    //active = false;
    
    //NEW-net
    var socatServer_ip = args[0];
    var socatServer_port = args[1];
    var socatBoard_ip = args[2];
    var socatRes = boardCode + " - Server:" + socatServer_ip +":"+ socatServer_port + " - Board: " + socatBoard_ip
    
    logger.info("[NETWORK-MANAGER] - SOCAT PARAMETERS INJECTED: " + socatRes);
    

    //NEW-net
    exports.initNetwork(socatServer_ip, socatServer_port, socatBoard_ip);
    
    //logger.debug("[NETWORK-MANAGER] - Network initialization called!");
  
    d.resolve(socatRes);
  
  
  }else{
    var socatRes = "Network of board " +boardCode + " already configured!"
    d.resolve(socatRes);
    logger.warn("[NETWORK-MANAGER] - NETWORK RECOVERY --- NO NEED NETWORK INITIALIZATION!");
  }


  return d.promise;

  
}	    

	    
	    
//NEW-net
exports.initNetwork = function(socatServer_ip, socatServer_port, socatBoard_ip){
  
	logger.info("[NETWORK-MANAGER] - Network initialization...");

	var spawn = require('child_process').spawn;
	
	var boardCode = nconf.get('config:board:code');
	var basePort = nconf.get('config:socat:client:port');
	var rtpath = nconf.get('config:reverse:lib:bin');			//DEBUG - rtpath = "/opt/demo/node-lighthing-rod-develop/node_modules/node-reverse-wstunnel/bin/wstt.js";
	var reverseS_url = nconf.get('config:reverse:server:url_reverse')+":"+nconf.get('config:reverse:server:port_reverse');
	
	var cp = require('child_process');
	var socat = cp.fork('./network-wrapper');
	
	//NEW-net
	var input_message = {
	    "socatBoard_ip": socatBoard_ip,
	    "basePort": basePort,
	    "socatServer_ip": socatServer_ip
	}

	socat.send(input_message); 
	
	socat.on('message', function(msg) {
	  
	  if(msg.name != undefined){
	    
	      if (msg.status === "alive"){

  
		  // START WSTT ------------------------------------------------------------------------------------------------
		  logger.info("[NETWORK-MANAGER] - WSTT activating...");

		  var wstt_proc = spawn(rtpath, ['-r '+ socatServer_port +':localhost:'+basePort, reverseS_url])
		  logger.info("[NETWORK-MANAGER] - WSTT - " + rtpath + ' -r '+ socatServer_port +':localhost:'+basePort,reverseS_url);
		  
		  wstt_proc.stdout.on('data', function (data) {
		      logger.info('[NETWORK-MANAGER] - WSTT - stdout: ' + data);
		  });
		  wstt_proc.stderr.on('data', function (data) {
		      logger.info('[NETWORK-MANAGER] - WSTT - stderr: ' + data);
		  });
		  wstt_proc.on('close', function (code) {
		      logger.warn('[NETWORK-MANAGER] - WSTT - process exited with code ' + code);
		  });  
		  
		  //------------------------------------------------------------------------------------------------------------
		  
	      } else if (msg.status === "complete"){
		
		logger.info('[NETWORK-MANAGER] - Sending notification to IOTRONIC: '+ msg.status+ ' - '+ msg.logmsg);
		
		var boardCode = nconf.get('config:board:code');
		session_wamp.call('iotronic.rpc.command.result_network_board', [msg.logmsg, boardCode] ).then( function(result){
			  logger.info('[NETWORK-MANAGER] --> response from IOTRONIC: '+ result);
			  logger.info('[NETWORK-MANAGER] - TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
		});
		
	      }
	      
	  }
	  
	  
	});
	    
	    
  
}





