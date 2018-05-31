exports.main = function (arguments){ 
  
    /* THIS PLUGIN IS FOR ARDUINO YUN */
    /* THIS PLUGIN REQUIRES THE DRIVER "led_driver" MOUNTED */
  
    var fs = require('fs');

	var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;
	api = require(LIGHTNINGROD_HOME + '/modules/plugins-manager/nodejs/plugin-apis');
	
    var logger = api.getLogger();
    logger.info("DRIVER-APP - Plugin driver application starting...");
    
    var path = '/opt/stack4things/drivers/led_driver/led';
 
    setInterval(function(){   
      
	fs.open(path, 'a', function(err, data) {
	    if (err) {
		logger.error("ERROR: " + err);
	    } else {
		
		fs.write(data, '1', 0, 'utf8', function(err) {
		    if (err)
			logger.error("ERROR: " + err);
		    fs.close(data, function() {
			logger.info("TURN ON");
		    })
		});
		
	    }
	});
	
	
	setTimeout(function(){
	  
	    
	  
	    fs.open(path, 'a', function(err, data) {
		if (err) {
		    logger.error("ERROR: " + err);
		} else {
			    
		    fs.write(data, '0', 0, 'utf8', function(err) {
			if (err)
			    logger.error("ERROR: " + err);
			fs.close(data, function() {
			    logger.info("TURN OFF");
			})
		    });
		    
		}
	    });
	
	}, 500);  
	
	    
    }, 2000);  

    

}

