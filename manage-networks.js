


//service logging configuration: "manageNetworks"   
var logger = log4js.getLogger('manageNetworks');

var Q = require("q");

var session_wamp;
//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportNetworkCommands = function (session){
    
  var boardCode = nconf.get('config:board:code');
  
  //Register all the module functions as WAMP RPCs    
  logger.info('Exporting network commands to the Cloud');
  session.register(boardCode+'.command.rpc.network.setSocatOnBoard', exports.setSocatOnBoard);
  session_wamp = session;
  

}







exports.setSocatOnBoard = function (args, details){
  
  var d = Q.defer();
  
  logger.info("Active flag status: " + active);
  
  //if(active){
  if(true){
    
    //logger.warn("FIRST NETWORK INITIALIZATION:");
    //active = false;
    
    //NEW-net
    var socatServer_ip = args[0];
    var socatServer_port = args[1];
    var socatBoard_ip = args[2];
    var socatRes = boardCode + " - Server:" + socatServer_ip +":"+ socatServer_port + " - Board: " + socatBoard_ip
    
    logger.info("--> SOCAT PARAMETERS INJECTED: " + socatRes);
    

    //NEW-net
    exports.initNetwork(socatServer_ip, socatServer_port, socatBoard_ip);
    
    logger.info("initNetwork CALLED!");
  
    d.resolve(socatRes);
  
  
  }else{
    var socatRes = "Network of board " +boardCode + " already configured!"
    d.resolve(socatRes);
    logger.warn("NETWORK FAILURE RECOVERY --- NO NEED NETWORK INITIALIZATION!");
  }


  return d.promise;

  
}	    

	    
	    
//NEW-net
exports.initNetwork = function(socatServer_ip, socatServer_port, socatBoard_ip){
  
	logger.info("--> Network initialization...");

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
		  logger.info("WSTT activating...");

		  var wstt_proc = spawn(rtpath, ['-r '+ socatServer_port +':localhost:'+basePort, reverseS_url])
		  logger.info("WSTT - " + rtpath + ' -r '+ socatServer_port +':localhost:'+basePort,reverseS_url);
		  
		  wstt_proc.stdout.on('data', function (data) {
		      logger.info('WSTT - stdout: ' + data);
		  });
		  wstt_proc.stderr.on('data', function (data) {
		      logger.info('WSTT - stderr: ' + data);
		  });
		  wstt_proc.on('close', function (code) {
		      logger.warn('WSTT - process exited with code ' + code);
		  });  
		  
		  //------------------------------------------------------------------------------------------------------------
		  
	      } else if (msg.status === "complete"){
		
		logger.info('--> send notification to IOTRONIC: '+ msg.status+ ' - '+ msg.logmsg);
		
		var boardCode = nconf.get('config:board:code');
		session_wamp.call('iotronic.rpc.command.result_network_board', [msg.logmsg, boardCode] ).then( function(result){
			  logger.info('--> response from IOTRONIC: '+ result);
			  logger.info('TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
		});
		
	      }
	      
	  }
	  
	  
	});
	    
	    
  
}




exports.manageNetworks = function(args){
  
  
    var spawn = require('child_process').spawn;
    
    switch(args[1]){

        case 'add-to-network':
		    
		  //NEW-net
		  //INPUT PARAMETERS: args[0]: boardID args[1]:'add-to-network' args[2]:vlanID - args[3]:boardVlanIP - args[4]:vlanMask - args[5]:vlanName
		  var vlanID = args[2];
		  var boardVlanIP = args[3];
		  var vlanMask = args[4];
		  var vlanName = args[5];
		  
		  logger.info("ADDING BOARD TO VLAN "+vlanName+"...");
		  
		  //ip link add link gre-lr0 name gre-lr0.<vlan> type vlan id <vlan> 
		  var add_vlan_iface = spawn('ip',['link', 'add', 'link', 'gre-lr0', 'name', 'gre-lr0.'+vlanID, 'type', 'vlan' ,'id', vlanID]);         
		  logger.info('NETWORK COMMAND: ip link add link gre-lr0 name gre-lr0.'+vlanID + ' type vlan id '+ vlanID),
		  
		  add_vlan_iface.stdout.on('data', function (data) {
		      logger.info('--> stdout - add_vlan_iface: ' + data);
		  });
		  add_vlan_iface.stderr.on('data', function (data) {
		      logger.info('--> stderr - add_vlan_iface: ' + data);
		  });
		  
		  add_vlan_iface.on('close', function (code) {

		    
			  //ip addr add <ip/mask> dev gre-lr0.<vlan> 
			  var add_vlan_ip = spawn('ip',['addr', 'add', boardVlanIP+'/'+vlanMask ,'dev','gre-lr0.'+vlanID]);         
			  logger.info('NETWORK COMMAND: ip addr add '+boardVlanIP+'/'+vlanMask+' dev gre-lr0.'+vlanID);
			  
			  add_vlan_ip.stdout.on('data', function (data) {
			      logger.info('--> stdout - add_vlan_ip: ' + data);
			  });
			  add_vlan_ip.stderr.on('data', function (data) {
			      logger.info('--> stderr - add_vlan_ip: ' + data);
			  });
			  add_vlan_ip.on('close', function (code) {
			    
				//ip link set gre-lr0.<vlan> up
				var greVlan_up = spawn('ip',['link','set','gre-lr0.'+vlanID,'up']); 
				logger.info('GRE IFACE UP: ip link set gre-lr0.'+ vlanID+ ' up');
				
				greVlan_up.stdout.on('data', function (data) {
				    logger.info('--> stdout - greVlan_up: ' + data);
				});
				greVlan_up.stderr.on('data', function (data) {
				    logger.info('--> stderr - greVlan_up: ' + data);
				});
				greVlan_up.on('close', function (code) {
				  
				    logger.info("--> VLAN IFACE UP!");
				    
				    logger.info("BOARD SUCCESSFULLY ADDED TO VLAN: "+boardVlanIP+'/'+vlanMask);
				    
				    
				});
				
				
			    
			  });
		  
		    
		    
		  });
		    

            break;
	    

	    
	case 'remove-from-network':
	  
	    //NEW-net
	    //INPUT PARAMETERS: args[0]: boardID args[1]:'remove-from-network' args[2]:vlanID - args[3]:vlanName
	    var vlanID = args[2];
	    var vlanName = args[3];
	    
	    logger.info("REMOVING BOARD FROM VLAN "+vlanName+"...");
	    
	    //NEW-net
	    //ip link del gre-lr0.<vlan>
	    var del_greVlan = spawn('ip',['link','del','gre-lr0.'+vlanID]); 
	    logger.info('DEL GRE IFACE: ip link del gre-lr0.'+ vlanID);
	    
	    del_greVlan.stdout.on('data', function (data) {
		logger.info('--> stdout - del_greVlan: ' + data);
	    });
	    del_greVlan.stderr.on('data', function (data) {
		logger.info('--> stderr - del_greVlan: ' + data);
	    });
	    del_greVlan.on('close', function (code) {
	      
		logger.info("--> VLAN IFACE DELETED!");
		
		logger.info("BOARD SUCCESSFULLY REMOVED FROM VLAN "+vlanName);
		
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
    
}


