/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Fabio Verboso, Nicola Peditto
* 
*/

nconf = require('nconf');
nconf.file ({file: 'settings.json'});

log4js = require('log4js');
log4js.loadAppender('file');
logfile = nconf.get('config:log:logfile');
log4js.addAppender(log4js.appenders.file(logfile));    


//service logging configuration: "network-wrapper"
var logger = log4js.getLogger('network-wrapper');

try{
  
    loglevel = nconf.get('config:log:loglevel');
    if (loglevel === undefined){
      logger.setLevel('INFO');
      //logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO'); 
    }else{
      logger.setLevel(loglevel);
      //logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel); 
    }
}
catch(err){
    //logger.warn('[SYSTEM] - Error in parsing loglevel parameter from settings.json: '+ err);
    logger.setLevel('INFO');
    //logger.warn('[SYSTEM] - Log level applied: INFO');

}


process.once('message', function(message) {
  
      var spawn = require('child_process').spawn;
      
      //MESSAGE RECEIVED FROM IOTRONIC:
      /*
       	    var input_message = {
                "args": args,
		"socatBoard_ip": socatBoard_ip,
                "basePort": basePort,
		"bSocatNum": bSocatNum,
		"socatClient": socatClient
            }
      */

      
      //NEW-net
      var basePort = message.basePort;
      var socatBoard_ip = message.socatBoard_ip;
      var socatServer_ip = message.socatServer_ip;
      //var logger = log4js.getLogger('network-wrapper');
      
      logger.info("[NETWORK-MANAGER] - NetWRAPPER loaded!");
      logger.info("[NETWORK-MANAGER] - SOCAT starting...");
      
	    //NEW-net
	    //socat -d -d \ TCP-L:<basePort>,bind=localhost,reuseaddr,forever,interval=10 \ TUN:<socatBoard_ip>,tun-name=socat0,iff-up &
	    var socatProcess = spawn('socat', ['-d','-d','TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+socatBoard_ip+'/31,tun-name=socat0,up'])
	    logger.debug('[NETWORK-MANAGER] - SOCAT COMMAND: socat -d -d TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10 TUN:'+socatBoard_ip+'/31,tun-name=socat0,up' );
	    
	    logger.debug("[NETWORK-MANAGER] - --> SOCAT PID: "+socatProcess.pid);
	    
	    if (socatProcess.pid != undefined)
		logger.info("[NETWORK-MANAGER] - --> SOCAT daemon succefully started!");
	    
            socatProcess.stdout.on('data', function (data) {
                logger.debug('[NETWORK-MANAGER] - SOCAT - stdout: ' + data);
            });
	    
            socatProcess.stderr.on('data', function (data) {
	      
                var textdata = 'stderr: ' + data;
                logger.debug("[NETWORK-MANAGER] - SOCAT - "+textdata);
		
		if(textdata.indexOf("starting data transfer loop") > -1) {
		  
		      logger.info('[NETWORK-MANAGER] - --> WSTT configuration completed!');
		      
		      //NEW-net
		      //ip link set $TUNNAME up
		      spawn('ifconfig',['socat0','up']);
		      
		      logger.debug('[NETWORK-MANAGER] - NETWORK COMMAND: ifconfig socattun socat0 up');
		      
		      logger.info('[NETWORK-MANAGER] - SOCAT TUNNEL SUCCESSFULLY ESTABLISHED!');
		      
		      
		      //NEW-net: INIZIALIZZARE IL TUNNEL GRE CONDIVISO
		      //ip link add gre-lr0 type gretap remote <serverip> local <boadip>
		      //ip link set gre-lr0 up		    
		      var greIface = spawn('ip',['link','add','gre-lr0','type', 'gretap', 'remote', socatServer_ip, 'local', socatBoard_ip]); 
		      logger.debug('[NETWORK-MANAGER] - GRE IFACE CREATION: ip link add gre-lr0 type gretap remote '+ socatServer_ip+' local '+socatBoard_ip);
		      
		      greIface.stdout.on('data', function (data) {
			  logger.debug('--> GRE IFACE CREATION stdout: ' + data);
		      });
		      greIface.stderr.on('data', function (data) {
			  logger.debug('--> GRE IFACE CREATION stderr: ' + data);
		      });
		      greIface.on('close', function (code) {
			
			  logger.debug("--> GRE IFACE CREATED!");
			  
			  //ip link set gre-lr<port> up
			  var greIface_up = spawn('ip',['link','set','gre-lr0','up']); 
			  logger.debug('[NETWORK-MANAGER] - GRE IFACE UP COMMAND: ip link set gre-lr0 up');
			  
			  greIface_up.stdout.on('data', function (data) {
			      logger.debug('--> GRE IFACE UP stdout: ' + data);
			  });
			  greIface_up.stderr.on('data', function (data) {
			      logger.debug('--> GRE IFACE UP stderr: ' + data);
			  });
			  greIface_up.on('close', function (code) {
			    
			      logger.debug("--> GRE IFACE UP!");
			      logger.info('[NETWORK-MANAGER] - GRE tunnel info: server ip = '+ socatServer_ip+' - local ip = '+socatBoard_ip);
			      //logger.info('TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
			      
			      //SEND MESSAGE TO IOTRONIC
			      process.send({ name: "socat", status: "complete" , logmsg: "tunnels configured"});
			      
			      			    
			      
			  });
			  
		      });
		    
		  
		  
		}
		
            });
	    
	    
	    
	    
            socatProcess.on('close', function (code) { //in case of disconnection, delete all interfaces
                logger.info('SOCAT - process exited with code ' + code);
				
            }); 
	    
	    //NEW-net
	    process.send({ name: "socat", status: "alive" , logmsg: "I'm alive!"});
    
	    
});





process.on('exit', function(){

       process.send({ name: "socat", level: "warn" , logmsg: 'SOCAT Process terminated!'}); 
});


