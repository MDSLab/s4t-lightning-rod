/*
*				                  Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Arthur Warnier, Fabio Verboso, Nicola Peditto
* 
*/


//service logging configuration: "manageNetworks"   
var logger = log4js.getLogger('manageNetworks');
logger.setLevel(loglevel);

var Q = require("q");

var session_wamp;

// This function exports all the functions in the module as WAMP remote procedure calls
exports.exportNetworkCommands = function (session){
  
  //Register all the module functions as WAMP RPCs    
  session.register(boardCode+'.command.rpc.network.setSocatOnBoard', exports.setSocatOnBoard);
  session_wamp = session;
  logger.info('[WAMP-EXPORTS] Network commands exported to the cloud!');

};


// This function starts the creation of the SOCAT tunnel
exports.setSocatOnBoard = function (args, details){
  
  logger.info("[NETWORK] - Network manager loaded!");
  
  var d = Q.defer();
  
  //logger.info("Active flag status: " + active);
  
  //if(active){
  if(true){
    
    //logger.warn("FIRST NETWORK INITIALIZATION:");
    //active = false;
    
    var socatServer_ip = args[0];
    var socatServer_port = args[1];
    var socatBoard_ip = args[2];
    var socatRes = boardCode + " - Server:" + socatServer_ip +":"+ socatServer_port + " - Board: " + socatBoard_ip;
    
    logger.info("[NETWORK] - SOCAT PARAMETERS INJECTED: " + socatRes);

    exports.initNetwork(socatServer_ip, socatServer_port, socatBoard_ip);
  
    d.resolve(socatRes);

  }else{
    var socatRes = "Network of board " +boardCode + " already configured!";
    d.resolve(socatRes);
    logger.warn("[NETWORK] - NETWORK RECOVERY --- NO NEED NETWORK INITIALIZATION!");
  }

  return d.promise;

};


// This function:
// 1. creates the SOCAT tunnel using the parameter received from Iotronic.
// 2. On SOCAT tunnel completion it will create the WSTT tunnel.
// 3. On tunnels completion it will advise Iotronic; later Iotronic will add this device to its VLANs.
exports.initNetwork = function(socatServer_ip, socatServer_port, socatBoard_ip){
  
	logger.info("[NETWORK] - Network initialization...");

	var spawn = require('child_process').spawn;

	var basePort = nconf.get('config:socat:client:port');
	var rtpath = nconf.get('config:reverse:lib:bin');			//DEBUG - rtpath = "/opt/demo/node-lighthing-rod-develop/node_modules/node-reverse-wstunnel/bin/wstt.js";
	var reverseS_url = nconf.get('config:reverse:server:url_reverse')+":"+nconf.get('config:reverse:server:port_reverse');
	
	var cp = require('child_process');
	var socat = cp.fork('./network-wrapper');

	var input_message = {
	    "socatBoard_ip": socatBoard_ip,
	    "basePort": basePort,
	    "socatServer_ip": socatServer_ip
	};

	socat.send(input_message); 
	
	socat.on('message', function(msg) {
	  
		if(msg.name != undefined){

			if (msg.status === "alive"){

				// START WSTT ------------------------------------------------------------------------------------------------
				logger.info("[NETWORK] - WSTT activating...");

				var wstt_proc = spawn(rtpath, ['-r '+ socatServer_port +':localhost:'+basePort, reverseS_url]);
				logger.debug("[NETWOR] - WSTT - " + rtpath + ' -r '+ socatServer_port +':localhost:'+basePort,reverseS_url);

				wstt_proc.stdout.on('data', function (data) {
					logger.debug('[NETWORK] - WSTT - stdout: ' + data);
				});
				wstt_proc.stderr.on('data', function (data) {
					logger.debug('[NETWORK] - WSTT - stderr: ' + data);
				});
				wstt_proc.on('close', function (code) {
					logger.warn('[NETWORK] - WSTT - process exited with code ' + code);
				});
				//------------------------------------------------------------------------------------------------------------

			} else if (msg.status === "complete"){

				logger.info('[NETWORK] - Sending notification to IOTRONIC: '+ msg.status+ ' - '+ msg.logmsg);

				session_wamp.call('iotronic.rpc.command.result_network_board', [msg.logmsg, boardCode] ).then(
					function(result){
						logger.info('[NETWORK] --> response from IOTRONIC: '+ result);
						logger.info('[NETWORK] - TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
					}
				);

			}
	      
	  }
	  
	  
	});
	    
	    
  
};


// This function manages the network following functionalities:
// - add-to-network
// - remove-from-network
// All of these functions are called by Iotronic via RPC.
exports.manageNetworks = function(args){
	
    var spawn = require('child_process').spawn;
    
    switch(args[1]){

        case 'add-to-network':
		    
			//INPUT PARAMETERS: args[0]: boardID args[1]:'add-to-network' args[2]:vlanID - args[3]:boardVlanIP - args[4]:vlanMask - args[5]:vlanName
			var vlanID = args[2];
			var boardVlanIP = args[3];
			var vlanMask = args[4];
			var vlanName = args[5];
		  
		  	logger.info("[NETWORK] - ADDING BOARD TO VLAN "+vlanName+"...");
		  
		  	//ip link add link gre-lr0 name gre-lr0.<vlan> type vlan id <vlan>
		  	var add_vlan_iface = spawn('ip',['link', 'add', 'link', 'gre-lr0', 'name', 'gre-lr0.'+vlanID, 'type', 'vlan' ,'id', vlanID]);
		  	logger.debug('[NETWORK] --> NETWORK COMMAND: ip link add link gre-lr0 name gre-lr0.'+vlanID + ' type vlan id '+ vlanID);
		  
			add_vlan_iface.stdout.on('data', function (data){
				logger.debug('[NETWORK] ----> stdout - add_vlan_iface: ' + data);
			});
			add_vlan_iface.stderr.on('data', function (data){
			  	logger.debug('[NETWORK] ----> stderr - add_vlan_iface: ' + data);
			});
		  
			add_vlan_iface.on('close', function (code) {

				//ip addr add <ip/mask> dev gre-lr0.<vlan>
				var add_vlan_ip = spawn('ip',['addr', 'add', boardVlanIP+'/'+vlanMask ,'dev','gre-lr0.'+vlanID]);
				logger.debug('[NETWORK] --> NETWORK COMMAND: ip addr add '+boardVlanIP+'/'+vlanMask+' dev gre-lr0.'+vlanID);
			  
				add_vlan_ip.stdout.on('data', function (data) {
				  	logger.debug('[NETWORK] ----> stdout - add_vlan_ip: ' + data);
				});
				add_vlan_ip.stderr.on('data', function (data) {
				  	logger.debug('[NETWORK] ----> stderr - add_vlan_ip: ' + data);
				});

			  	add_vlan_ip.on('close', function (code) {
			    
					//ip link set gre-lr0.<vlan> up
					var greVlan_up = spawn('ip',['link','set','gre-lr0.'+vlanID,'up']);
					logger.debug('[NETWORK] --> GRE IFACE UP: ip link set gre-lr0.'+ vlanID+ ' up');

					greVlan_up.stdout.on('data', function (data) {
						logger.debug('[NETWORK] ----> stdout - greVlan_up: ' + data);
					});
					greVlan_up.stderr.on('data', function (data) {
						logger.debug('[NETWORK] ----> stderr - greVlan_up: ' + data);
					});
					greVlan_up.on('close', function (code) {
						logger.debug('[NETWORK] --> VLAN IFACE gre-lr0.'+ vlanID+ ' is UP!');
						logger.info("[NETWORK] --> BOARD SUCCESSFULLY ADDED TO VLAN "+vlanName+" with IP "+boardVlanIP);
					});
			    
			  	});
		    
		  	});

            break;
	    

	    
		case 'remove-from-network':
	  
			//INPUT PARAMETERS: args[0]: boardID args[1]:'remove-from-network' args[2]:vlanID - args[3]:vlanName
			var vlanID = args[2];
			var vlanName = args[3];
	    
	    	logger.info("[NETWORK] - REMOVING BOARD FROM VLAN "+vlanName+"...");
			
			//ip link del gre-lr0.<vlan>
			var del_greVlan = spawn('ip',['link','del','gre-lr0.'+vlanID]); 
			logger.debug('[NETWORK] --> DEL GRE IFACE: ip link del gre-lr0.'+ vlanID);
	    
			del_greVlan.stdout.on('data', function (data) {
				logger.info('[NETWORK] ----> stdout - del_greVlan: ' + data);
			});
			del_greVlan.stderr.on('data', function (data) {
				logger.info('[NETWORK] ----> stderr - del_greVlan: ' + data);
			});
			del_greVlan.on('close', function (code) {
				logger.info("[NETWORK] --> VLAN IFACE gre-lr0."+ vlanID +" DELETED!");
				logger.info("[NETWORK] --> BOARD SUCCESSFULLY REMOVED FROM VLAN "+vlanName);
			});
	    
	    	break;
	    
		/*    
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
		*/
	    
	    
    }
    
};