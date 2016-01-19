
//service logging configuration: "network-wrapper"
//var logger = log4js.getLogger('network-wrapper');
log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('/var/log/s4t-lightning-rod.log'));  




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
      /*
      var basePort = message.basePort;
      var socatClient = message.socatClient;
      var socatBoard_ip = message.socatBoard_ip;
       */
      var args = message.args;
      var basePort = message.basePort;
      var socatClient = message.socatClient;
      var socatBoard_ip = message.socatBoard_ip;
      var bSocatNum = message.bSocatNum;
      
      var logger = log4js.getLogger('network-wrapper');
      
      logger.info("NetWRAPPER: SOCAT starting...");
      
	    //NEW-net
	    //socat -d -d \ TCP-L:<basePort>,bind=localhost,reuseaddr,forever,interval=10 \ TUN:<socatBoard_ip>,tun-name=socat0,iff-up &
	    var socatProcess = spawn('socat', ['-d','-d','TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+socatBoard_ip+'/30,tun-name=socattun'+bSocatNum+',up'])
	    logger.info('SOCAT COMMAND: socat -d -d TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10 TUN:'+socatBoard_ip+'/30,tun-name=socattun'+bSocatNum+',up' );
	    
	    logger.info("--> SOCAT PID: "+socatProcess.pid);
	    
	    var sClientElem = {
                key: bSocatNum,
		process: socatProcess.pid
                //process: spawn('socat', ['-d','-d','TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+socatBoard_ip+'/30,tun-name=socattun'+bSocatNum+',up'])
            }

	   
            
	    
            socatProcess.stdout.on('data', function (data) {
                logger.info('SOCAT - stdout: ' + data);
            });
	    
            socatProcess.stderr.on('data', function (data) {
	      
                var textdata = 'stderr: ' + data;
                logger.info("SOCAT - "+textdata);
		
		if(textdata.indexOf("starting data transfer loop") > -1) {
		  
		  //NEW-net
		  //ip link set $TUNNAME up
		  spawn('ifconfig',['socattun'+bSocatNum,'up']);
		  
		  logger.info('NETWORK COMMAND: ifconfig socattun' + bSocatNum + ' up');
		  
		  logger.info('SOCAT TUNNEL SUCCESSFULLY ESTABLISHED!');
		  
		  
		  //NEW-net: INIZIALIZZARE IL TUNNEL GRE CONDIVISO
		  //ip link add gre-lr0 type gretap remote <serverip> local <boadip>
		  //ip link set gre-lr0 up
		  //logger.info('GRE TUNNEL SUCCESSFULLY ESTABLISHED!');
		
		}
		
            });
	    
	    
	    
	    
            socatProcess.on('close', function (code) { //in case of disconnection, delete all interfaces
                logger.info('SOCAT - process exited with code ' + code);
		
		//LATEST
		//KILL WSTT !!!!!!!!!!!!!
		
		
		/*
		var testing4 = spawn('ip',['link','del',args[8]]);
		logger.info('NETWORK COMMAND: ip link del ' + args[8]);
		
		testing4.stdout.on('data', function (data) {
		    logger.info('--> del link: ' + data);
		});
		testing4.stderr.on('data', function (data) {
		    logger.info('--> del link: ' + data);
		});
		testing4.on('close', function (code) {
		    logger.info('--> del link process exited with code ' + code);
		});
		*/
				
            }); 
	    
	    
	    process.send({ name: "socat", status: "alive" , logmsg: "I'm alive!", sClientElem: sClientElem});

    
});



process.on('exit', function(){

       process.send({ name: "socat", level: "warn" , logmsg: 'SOCAT Process terminated!'}); 
});


