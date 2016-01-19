


//service logging configuration: "manageNetworks"   
var logger = log4js.getLogger('manageNetworks');

var Q = require("q");


//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportNetworkCommands = function (session){
    
  var boardCode = nconf.get('config:board:code');
  
  //Register all the module functions as WAMP RPCs    
  logger.info('Exporting network commands to the Cloud');
  session.register(boardCode+'.command.rpc.network.setSocatOnBoard', exports.setSocatOnBoard);
  
}







exports.setSocatOnBoard = function (args, details){
  
  var d = Q.defer();
  
  
  //NEW-net
  /*
  var socatServer_ip = args[0];
  var socatServer_port = args[1];
  var socatBoard_ip = args[2];
  */
  var board_id = args[0];
  var socatServer_ip = args[1];
  var socatServer_port = args[2];
  var socatBoard_ip = args[3];
  var bSocatNum = args[4];
  
  //NEW-net
  //var board_id = nconf.get('config:board:code');
  //var socatRes = board_id + " - Server:" + socatServer_ip +":"+ socatServer_port + " - Board: " + socatBoard_ip
  var socatRes = board_id + " - Server:" + socatServer_ip +":"+ socatServer_port + " - Board: " + socatBoard_ip +" - socat_index: "+bSocatNum
  logger.info("SOCAT PARAMETERS INJECTED: " + socatRes);
  

  //NEW-net
  //exports.initNetwork(socatServer_ip, socatServer_port, socatBoard_ip);
  exports.initNetwork(socatServer_ip, socatServer_port, socatBoard_ip, bSocatNum);
  logger.info("initNetwork CALLED!");


  
  d.resolve(socatRes);

  return d.promise;

  
  
  
}




	    
	    

	    
	    
//NEW-net
//exports.initNetwork = function(socatServer_ip, socatServer_port, socatBoard_ip){
exports.initNetwork = function(socatServer_ip, socatServer_port, socatBoard_ip, bSocatNum){

  
	    logger.info("Network initialization...");

	    
	    var spawn = require('child_process').spawn;
	    
	    var boardCode = nconf.get('config:board:code');
	    var basePort = nconf.get('config:socat:client:port');
            var rtpath = nconf.get('config:reverse:lib:bin');
            var reverseS_url = nconf.get('config:reverse:server:url_reverse')+":"+nconf.get('config:reverse:server:port_reverse');
	    
	    var cp = require('child_process');
            var socat = cp.fork('./network-wrapper');
	
	    
	    //NEW-net: CANCELLARE ARGS
	    /*
	    arg0 - board: 14144545
	    arg1 - cmd: add-to-network
	    arg2 - socatIP: 10.0.0.2
	    arg3 - socatServ: 10.0.0.1
	    arg4 - socatPort: 10000
	    arg5 - greIP: 192.168.99.1
	    arg6 - greBC: 192.168.99.255
	    arg7 - greMask: 24
	    arg8 - greTap: b6f013-141445
	    arg9 - socatPort-parseInt(basePort): 0
	    */
	    var args = [boardCode, "add-to-network", "10.0.0.2", "10.0.0.1", "10000", "192.168.99.1", "192.168.99.255", "24", "b6f013-141445", "0"]

	    
	    //NEW-net: CANCELLARE "socatClient" E "ARGS" ?????
	    /*
	    var input_message = {
		"socatBoard_ip": socatBoard_ip,
                "basePort": basePort,
		"socatClient": socatClient
            }
	    */
	    var input_message = {
                "args": args,
		"socatBoard_ip": socatBoard_ip,
                "basePort": basePort,
		"bSocatNum": bSocatNum,
		"socatClient": socatClient
            }
            
            socat.send(input_message); 
	    
	    
	    socat.on('message', function(msg) {
	      
	      
	      if(msg.name != undefined){
		
		  if (msg.status === "alive"){

		      
		      socatClient.push(msg.sClientElem);
		      logger.info("--> SOCAT PID PUSHED IN socatClient LIST: "+msg.sClientElem.process);
     
		      // START WSTT ------------------------------------------------------------------------------------------------
		      logger.info("WSTT activating...");
		      
		      var rtClientElem = {
			  key: args[9],
			  process: spawn(rtpath, ['-r '+ socatServer_port +':localhost:'+basePort, reverseS_url])
		      }
		      
		      
		      //DEBUG - rtpath = "/opt/demo/node-lighthing-rod-develop/node_modules/node-reverse-wstunnel/bin/wstt.js";
		      logger.info("WSTT - " + rtpath + ' -r '+ socatServer_port +':localhost:'+basePort,reverseS_url);
		      
		      rtClient.push(rtClientElem); 
		     
		      rtClientElem.process.stdout.on('data', function (data) {
			  logger.info('WSTT - stdout: ' + data);
		      });
		      rtClientElem.process.stderr.on('data', function (data) {
			  logger.info('WSTT - stderr: ' + data);
		      });
		      rtClientElem.process.on('close', function (code) {
			  logger.warn('WSTT - process exited with code ' + code);
		      });  
		     
		      //------------------------------------------------------------------------------------------------------------
		      
		  }
		  
	      }
	      
	      
	    });
	    
	    
  
}




exports.manageNetworks = function(args){
  
  
    
    var spawn = require('child_process').spawn;
    
    switch(args[1]){
      
      
      
      
      
        case 'add-to-network':
		    
		  //NEW-net
		  //ip link add link gre-lr0 name gre-lr0.<vlan> type vlan id <vlan> 
		  //ip addr add <ip/mask> dev gre-lr0.<vlan> 
		  //ip link set gre-lr0.<vlan> up
		  //logger.info("VIRTIAL NET SUCCESSFULLY CREATED!");
	  
	  
		  var testing = spawn('ip',['link','add',args[8],'type','gretap','remote',args[3],'local',args[2]]);         
		  logger.info('NETWORK COMMAND: ip link add ' + args[8] + ' type gretap remote '+ args[3] +' local '+ args[2]);
		  
		  testing.on('error',function(err){
		    logger.error('--> create link error: ' + data);
		    throw err
		  });
		  testing.stdout.on('data', function (data) {
		      logger.info('--> stdout - create link: ' + data);
		  });
		  testing.stderr.on('data', function (data) {
		      logger.info('--> stderr - create link: ' + data);
		  });
		  
		  testing.on('close', function (code) {
		    
		      //logger.info('--> create link process exited with code ' + code);
		      
		      if(code == 0) {
			
			  greDevices.push(args[8]);
			  
			  var testing2 = spawn('ip',['addr','add',args[5]+'/'+args[7],'broadcast',args[6],'dev',args[8]]); 
			  logger.info('NETWORK COMMAND: ip link add ' + args[5]+'/'+args[7] + ' broadcast '+ args[6] +' dev '+ args[8]);
			  
			  
			  testing2.stdout.on('add ip: ', function (data) { 
			      logger.info('--> stdout: ' + data); 
			  });
			  testing2.stderr.on('add ip: ', function (data) { 
			      logger.info('--> stderr: ' + data);
			  });
			  
			  testing2.on('close', function (code) {
			    
			      //logger.info('--> add ip process exited with code ' + code); 
			      
			      var testing3 = spawn('ip',['link','set',args[8],'up']);
			      logger.info('NETWORK COMMAND: ip link set ' + args[8] + ' up');
			      
			      testing3.stdout.on('data', function (data) {
				  logger.info('--> set link up: ' + data);
			      });
			      testing3.stderr.on('data', function (data) {
				  logger.info('--> set link up: ' + data);
			      });
			      testing3.on('close', function (code) {
				  //logger.info('--> set link up process exited with code ' + code);
				  logger.info("GRE TUNNEL SUCCESSFULLY ESTABLISHED!");
			      });
			      
			  });
			  
		      }
		  });
		    

            break;
	    
	    
	    
	    
	    
	    
	    
	    
	    
	    
	    
	    
	    
	case 'remove-from-network':
	  
	    logger.info("REMOVING BOARD FROM SOCAT NETWORK...");
    
	    //NEW-net
	    //ip link del gre-lr0.<vlan>
	    
	    var testing = spawn('ip',['link','del',args[2]]);
	    
	    testing.stdout.on('data', function (data) {
		logger.info('--> del link stdout: ' + data);
	    });
	    testing.stderr.on('data', function (data) {
		logger.info('--> del link stderr: ' + data);
	    });
	    testing.on('close', function (code) {
		logger.info('--> NETWORK COMMAND: ip link del ' + args[2]);
		logger.info("--> BOARD SUCCESSFULLY REMOVED FROM NETWORK!");
	    });
	    
	    break;
	    
	    
	case 'disable-network':
	    
	    logger.info("REMOVING BOARD FROM SOCAT NETWORK...");
	    logger.info("--> "+JSON.stringify(socatClient)+" - socatClient to kill: "+args[3]);
	    
	    var position = findValue(socatClient, args[3], 'key');
	    
	    logger.info("--> socatClient position selected: "+position);
	   	   
	    //Killing Socat
	    logger.info("--> Killing socatClient...");
	    process.kill(socatClient[position].process);
	    //socatClient[position].process.kill('SIGINT');
	    
	    //Killing WSTT
	    logger.info("--> Killing WSTT client...");
	    rtClient[position].process.kill('SIGTERM');

	    
	    socatClient.splice(position,1);
	    
	    rtClient.splice(position,1);
	    
	    var testing = spawn('ip',['link','del',args[2]]);

	    testing.stdout.on('data', function (data) {
		logger.info('--> del link stdout: ' + data);
	    });
	    testing.stderr.on('data', function (data) {
		logger.info('--> del link stderr: ' + data);
	    });
	    testing.on('close', function (code) {
		logger.info('--> NETWORK COMMAND: ip link del ' + args[2]);
		logger.info("--> BOARD SUCCESSFULLY REMOVED FROM NETWORK!");
	    });
	    
	    break;	    
	    
	    
	    
	    
	    
	    
	case 'update-board':
	    var testing = spawn('ip',['link','set',args[3],'down']);
	    testing.on('close', function (code) {
		var testing2 = spawn('ip',['addr','del',args[4],'dev',args[3]]);
		testing2.on('close',function (code) {
		    var testing3 = spawn('ip',['addr','add',args[2],'broadcast',args[5],'dev',args[3]]);
		    testing3.on('close',function (code) {
			spawn('ip',['link','set',args[3],'up']);
		    })
		});
	    });
	    break;
    }
}



// myArray is the array being searched
// value is the value we want to find
// property is the name of the field in which to search
function findValue(myArray, value, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
       if (myArray[i][property] === value) {
          return i;
       }
    }
    return -1;
}