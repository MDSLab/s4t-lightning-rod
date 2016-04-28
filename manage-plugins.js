
//service logging configuration: "managePlugins"   
var logger = log4js.getLogger('managePlugins');
logger.setLevel(loglevel);

var fs = require("fs");
var Q = require("q");
var cp = require('child_process');  //In order to create a plugin-wrapper process for each active plugin.
var running = require('is-running');  //In order to verify if a plugin is alive or not.


var plugins = {}
var outputFilename = './plugins.json';
    
    


//This function executes a single call
exports.call = function (args, details){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    
    var d = Q.defer();
        
    // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
    var plugin_autostart = "";
    
    logger.info('Running request for plugin \"'+ plugin_name +'\" with parameter json: '+plugin_json);
    
    try{
        //Reading the plugin configuration file
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));

    }
    catch(err){
        logger.error('Error parsing JSON file ./plugins.json');
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
	logger.info("Plugin successfully loaded!");
        
        //Check the status to be decided
	var status = pluginsConf.plugins[plugin_name].status;
	
        if (status == "off" || status == "injected"){
            
            logger.info("Plugin " + plugin_name + " being started");
            
            //Create a new process that has plugin-wrapper as code
            var child = cp.fork('./call-wrapper');
	    
            
            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            }
	      
            
            child.on('message', function(msg) {
	   
	      if(msg.name != undefined){
		
		
		if (msg.status === "alive"){
		  
		      //Creating the plugin json schema
		      var schema_outputFilename = './plugin_conf/'+plugin_name+'.json';
		      fs.writeFile(schema_outputFilename, plugin_json, function(err) {
			
			  if(err) {
			      logger.error('Error parsing '+plugin_name+'.json file: ' + err);
			      
			  } else {
			    
			      logger.info('Plugin JSON schema saved to ' + schema_outputFilename);
			      
			      // - change the plugin status from "off" to "on" and update the PID value
			      pluginsConf.plugins[plugin_name].status = "on";
			      pluginsConf.plugins[plugin_name].pid = child.pid;

			      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				
				  if(err) {
				      logger.error('Error writing ./plugins.json file: ' + err);
				  } else {
				      logger.info("JSON file plugins.json updated -> " + plugin_name + ':  status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
				  }
				  
			      });

			      
			  }
		      });
		      
		  
		  
		} else if(msg.status === "finish") {
		  
		  logger.info("RESULT: ", msg.logmsg);
		  
		  d.resolve(msg.logmsg);
		  
		} else if(msg.status === "fault") {
		  
		  logger.info("RESULT: ", msg.logmsg);
		  
		  d.resolve(msg.logmsg);
		  
		} else if(msg.level === "error") {
		  
		  logger.error(msg.name + ": " + msg.logmsg);
		  
		} else if(msg.level === "warn") {
		  
		  logger.warn(msg.name + ": " + msg.logmsg);
		  
		}  
		else{
		  //level info
		  logger.info(msg.name + ": " + msg.logmsg);

		}
		
	      }
	      else{
		//serve per gestire il primo messaggio alla creazione del child
		logger.info(msg);
	      }
	      

	      
	    });
 
	    
	    //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
	    child.send(input_message); 
	    
	    return d.promise;

	    

        }
        else{
            logger.warn("Call already started!");
            return 'Call already started on this board!';
        }
        
    }
    else{
      // Here the plugin does not exist
      logger.warn("Call \"" + plugin_name + "\" does not exist on this board!");
      return 'Call does not exist on this board!';
    }
}




function pluginStarter(plugin_name, timer, pluginsConf, plugin_json_name, skip) {

      try{
	
	  // Get the plugin's configuration.
	  pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
	  
	  var status = pluginsConf.plugins[plugin_name].status;
	  var pid = pluginsConf.plugins[plugin_name].pid;
	  var autostart = pluginsConf.plugins[plugin_name].autostart;
		
    
	  // The board restarts all the plugins with status "on" (this status happens after a crash of L-R/board) or with autostart parameter set at true (because some plugins need to start at boot time).
	  if (status == "on" || autostart == "true"){
	    
	    
		//if (pid == null || pid =='') {
		if (pid == '') {
		  
		    // if the pid of plugin is empty (wrong status)
		  
		    //console.log(plugin_name + " - PID NULL and running = " + running(pid))
		    plugins[plugin_name]={
		      child: "",
		      pid: pid,
		      alive: false,
		      timer: timer
		    }
		
		}else if( pid == null){
		  
		    // if the plugin was just injected
		  
		    skip = "true";
		    
		    plugins[plugin_name]={
		      child: "",
		      pid: pid,
		      alive: null,
		      timer: timer
		    }
		    
		}else{
		  
		    // if the pid is specified and we came from reboot of the board/LR or after a crash of the plugin process
		  
		    //console.log(plugin_name + " - PID "+pid+" and running = " + running(pid))
		    plugins[plugin_name]={
		      child: "",
		      pid: pid,
		      alive: running(pid),
		      timer: timer
		    }
		  
		}
		
				
		if( plugins[plugin_name].alive === true ){
		    // the plugin is normally running
		    logger.info( 'PluginChecker - '+ plugin_name + ' with PID: ' + plugins[plugin_name].pid + ' alive: '+ plugins[plugin_name].alive );
		    
		}
		else if( skip === "true") {
		  
		    // the plugin is in injected state and it doesn't need to be restarted
		    logger.info( plugin_name + ' is a new plugin! status: injected - It is needed to start it the first time!' );
		    clearPluginTimer(plugin_name);
		    
		}
		else if( plugins[plugin_name].alive === false || skip === "false") {
		  
		    // the plugin is not alive: we are after a reboot of the board/LR or after a crash of the plugin process
		    logger.warn( 'PluginChecker - '+ plugin_name + ' - No such process found with PID '+plugins[plugin_name].pid+'!'+ ' - alive: '+ plugins[plugin_name].alive +' - Restarting...');
		    
		    // If the schema json file exists the board will create a child_process to restart the plugin and update the status and the PID value	
		    if (fs.existsSync(plugin_json_name) === true){

			//Create a new process that has plugin-wrapper as code
			try{

			    plugins[plugin_name].child = cp.fork('./plugin-wrapper');
			    
			    var plugin_json_schema = JSON.parse(fs.readFileSync(plugin_json_name));
			    var input_message = {
				"plugin_name": plugin_name,
				"plugin_json": plugin_json_schema
			    }

			    logger.info("|----> "+ plugin_name + " - Input parameters: "+ fs.readFileSync(plugin_json_name));
			    plugins[plugin_name].child.send(input_message);

			}
			catch(err){
			    logger.error('|----> Error starting '+plugin_name+' plugin: ' + err);
			}	
			
			
			//updates the JSON file plugins.json
			try{
			  
			      pluginsConf.plugins[plugin_name].pid = plugins[plugin_name].child.pid;	      
			      pluginsConf.plugins[plugin_name].status = "on";

			      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				  if(err) {
				      logger.error('|----> '+ plugin_name + ' - Error writing JSON file ' + outputFilename + ': ' + err);
				  } else {
				      logger.debug("|----> "+ plugin_name + " - JSON file " + outputFilename + " updated!");
				  }
			      });
			  
			}
			catch(err){
			      logger.error('|----> '+ plugin_name + ' - Error updating JSON file ' + outputFilename + ': ' + err);
			} 
			
			
			
		      
		    } else{
		      //If the schema json file doesn't exist the related plugin will be not restarted and the value of its PID will be cleaned.
		      
		      //updates the plugins.json JSON file
		      try{
			
			    logger.warn('|----> '+ plugin_name + ' - I can not restart plugin!!! JSON file '+ plugin_json_name +' does not exist!');
			    
			    pluginsConf.plugins[plugin_name].pid = "";

			    fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				if(err) {
				    logger.error('|----> '+ plugin_name + ' - Error writing JSON file ' + outputFilename + ': ' + err);
				} else {
				    logger.info('|----> '+ plugin_name + ' - JSON file ' + outputFilename + ' updated: PID value cleaned!');
				}
			    });
			    
			    logger.warn('|----> '+ plugin_name + ' - Please call the RUN command again for this plugin!');
			
		      }
		      catch(err){
			    logger.error('|----> '+ plugin_name + ' - Error updating JSON file ' + outputFilename + ': ' + err);
		      } 
		      
		      
		    }	
		    
		    
		    
		}		

		
		
	  }

	  
      }
      catch(err){
	  logger.error('|--> '+ plugin_name + ' - Error loading plugin: ' + err);
      }
      
		
  

    
}

function clearPluginTimer(plugin_name) {
  
    try{
      
	  if( plugins[plugin_name].timer == null){
	    
	      logger.info("|--> " +plugin_name+ ": no timer to clear!");
	      
	  }else{
	      clearInterval( plugins[plugin_name].timer );

	      logger.debug("|--> " + plugin_name +" - "+ JSON.stringify(plugins[plugin_name]) + " timer cleared!");
	  }
	  
    }  
    catch(err){
	logger.error('Error in clearing timer for plugin '+plugin_name+': '+ err);
    }
    
}
    
exports.pluginKeepAlive = function (plugin_name){
   
    try{
	  
	  // Get the plugin's configuration.
	  var pluginsConf = JSON.parse(fs.readFileSync(outputFilename, 'utf8'));
	  var status = pluginsConf.plugins[plugin_name].status;
	  var autostart = pluginsConf.plugins[plugin_name].autostart;
	  
	  var plugin_json_name = "./plugin_conf/"+plugin_name+".json";
	  
	  var skip = "false";
	  
	  if (status == "on" || autostart == "true"){
	    
	      pluginStarter(plugin_name, null, pluginsConf, plugin_json_name, skip);

	      if(status != "injected"){
		
		  var timer = setInterval(function() {
		    
		      pluginStarter(plugin_name, timer, pluginsConf, plugin_json_name, skip);

		  //}, 60000);	
		  }, 300000);

		  plugins[plugin_name]={
		    child: "",
		    pid: "",
		    alive: "",
		    timer: timer
		  }
		  
	      }
	      
	  } 

	  
    }
    catch(err){
	logger.error('Error in keeping alive the plugin '+plugin_name+': '+ err);
    }



	

    

}

exports.pluginsLoader = function (){
  
    logger.info('Plugins loader is running!');

    try{
      
	  // Get the plugin's configuration.
	  var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
	  
	  // Get the plugin json object list
	  var plugins_keys = Object.keys( pluginsConf["plugins"] );

	  // Get the number of plugins in the list "plugins_keys" in order to use it in the next loop
	  var plugin_num = plugins_keys.length; 
	  //logger.info('Number of plugins: '+ plugin_num);
	  
	  logger.info('Restarting enabled plugins on board: ');

	  for(var i = 0; i < plugin_num; i++) {
	    
	    (function(i) {
	      
	      var plugin_name = plugins_keys[ i ];
	      var plugin_json_name = "./plugin_conf/"+plugin_name+".json";
	      var status = pluginsConf.plugins[plugin_name].status;
	      var autostart = pluginsConf.plugins[plugin_name].autostart;
	      
	      logger.info( '|--> '+ plugin_name + ' - status: '+ status +' - autostart: '+autostart);

	      setTimeout( function() {
	      
		exports.pluginKeepAlive(plugin_name);
		
		  
	      }, 7000*i);
	      
	    })(i);
	    
	  } 
    }
    catch(err){
	logger.warn('Error parsing ./plugins.json: '+ err);
    }

}




//DEPRECATED method to restart all enabled plugins
//This function restarts all active plugins after a crash of Lightning-rod or a reboot of the board and starts  at boot all the plugins with "autostart" paramenter set true.
exports.restartAllActivePlugins = function (){
    
    logger.info('Restarting all the already scheduled plugins');
    
    // create a list of child_process one for each active plugin
    var child = [];
    
    var outputFilename = './plugins.json';
    
    //Reading the plugins configuration file
    try{
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
    }
    catch(err){
        logger.info('Error parsing JSON file ./plugins.json');
    }
    
   
    
    /*
    // TEST FOR
    console.log('new scope');
    for(var i = 0; i < 5; i++) {
    (function(i) {
      setTimeout(function() {console.log('st2:'+i)}, 0);
    })(i);
    }

    */
  
    
    // Get the plugin json object list
    var plugins_keys = Object.keys( pluginsConf["plugins"] );

    // Get the number of plugins in the list "plugins_keys" in order to use it in the next loop
    var plugin_num = plugins_keys.length; 
    logger.info('Number of plugins: '+ plugin_num);
    
    
    // Loop used to find the active plugin at the boot of the board or after a crash of L-R. In particular this loop use the setTimeout function in order to avoid to start at the same time the plugins that use the "board.connect" function.
    for(var i = 0; i < plugin_num; i++) {
      
      // We used this construct "function(i)" because with javascript and nodejs "the code within the function is only executed after the loop has been completed". 
      (function(i) {
	
	//Moreover "setTimeout() ensures that the function is only executed at some later stage."
	//At the moment we set the timeout at 5 seconds between the exection of the plugins to avoid the simultaneously connection to the board ("board.connect").
	setTimeout(function() {
	      
	  
	      var plugin_name = plugins_keys[ i ];

	      logger.info("|");
	      // Get the plugin's configuration.
	      var plugin_json_name = "./plugin_conf/"+plugin_name+".json";
	      var status = pluginsConf.plugins[plugin_name].status;
	      var pid = pluginsConf.plugins[plugin_name].pid;
	      var autostart = pluginsConf.plugins[plugin_name].autostart;
	      
	      logger.info("|--> " + plugin_name + ': autostart < ' + autostart + ' > - status < '+ status + ' > ' + pid);

	      // The board restarts all the plugins with status "on" (this status happens after a crash of L-R/board) or with autostart parameter set at true (because some plugins need to start at boot time).
	      if (status == "on" || autostart == "true"){
		
		//Check PID value
		if (pid == null || pid =='') {      //if (eval ("typeof " + pid) === 'undefined'){
	  
		    // This parameter is not specified only if the user KILLED/STOPPED the plugin execution previously. So in this case the plugin will be restarted because has autostart set at "true" and the board is at boot time.
		    logger.info("|----> Plugin " + plugin_name + " being restarted with this json schema:")
    
		} else {
	  
		    // otherwise, if the PID is specified, this means: 
		    try{
			// the L-R crashed... so we need to kill all the child_process of each plugin before to start them again;
			process.kill(pid);
			pluginsConf.plugins[plugin_name].pid = "";
			logger.info("|----> Plugin " + plugin_name + " had a PID and it was just killed!");
			logger.info("|----> " + plugin_name + " being restarted with this json schema:")
		    }
		    catch(err){
		        // the board crashed for a power failure... so we don't need to kill any child_process.
			logger.warn('|----> The PID ('+ pid +') of the plugin ('+plugin_name+') was already killed!');
		    }
		  
		}


		// If the schema json file exists the board will create a child_process to restart the plugin and update the status and the PID value	
		if (fs.existsSync(plugin_json_name) === true){

		    //Create a new process that has plugin-wrapper as code
		    try{

			child[plugin_name] = cp.fork('./plugin-wrapper');
			var plugin_json_schema = JSON.parse(fs.readFileSync(plugin_json_name));
			var input_message = {
			    "plugin_name": plugin_name,
			    "plugin_json": plugin_json_schema
			}

			logger.info("|----> "+ fs.readFileSync(plugin_json_name));
			child[plugin_name].send(input_message);

		    }
		    catch(err){
			logger.error('|----> Error parsing JSON file '+ plugin_json_name +': ' + err);
		    }	
		    
		    
		    //updates the JSON file plugins.json
		    try{
		      
		      pluginsConf.plugins[plugin_name].pid = child[plugin_name].pid;	      
		      pluginsConf.plugins[plugin_name].status = "on";

		      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
			  if(err) {
			      logger.error(err);
			  } else {
			      logger.debug("|----> JSON file " + outputFilename + " updated!");
			  }
		      });
		      
		    }
		    catch(err){
			logger.error('|----> Error writing JSON file ./plugins.json: ' + err);
		    } 
		    
		    
		    
		  
		} else{
		  //If the schema json file doesn't exist the related plugin will be not restarted and the value of its PID will be cleaned.
		  
		  //updates the JSON file plugins.json
		  try{
		    
		    logger.warn('|----> I can not restart '+ plugin_name +'!!! JSON file '+ plugin_json_name +' does not exist!');
		    
		    pluginsConf.plugins[plugin_name].pid = "";

		    fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
			if(err) {
			    logger.error(err);
			} else {
			    logger.info("|----> JSON file " + outputFilename + " updated: PID value cleaned!");
			}
		    });
		    
		    logger.warn('|----> Please call the RUN command again for the plugin: '+ plugin_name);
		    
		  }
		  catch(err){
		      logger.error('|----> Error writing JSON file ./plugins.json: ' + err);
		  } 
		  
		  
		}		  

		
		
	      // END IF STATUS
	      } else {
		  logger.info("|----> Plugin " + plugin_name + " with status OFF and autostart FALSE!");
	      }
		  
		
			  
	}, 7000*i);  // end of setTimeout function	
	
	
      })(i);  // end of the function(i)	
      
    } // end of the for loop
    

}

//This function runs a plugin in a new process
exports.run = function (args){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    
    // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
    var plugin_autostart = "";

    
    logger.info('Run plugin RPC called for plugin '+ plugin_name +'...');
    logger.info("|--> Input parameters: "+ plugin_json);
    
    
    try{
        //Reading the plugin configuration file
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));

    }
    catch(err){
        logger.error('|--> '+ plugin_name + ' - Error parsing plugins.json!');
        return 'Error parsing plugins.json!';
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
	logger.info('|--> '+ plugin_name + ' - Plugin configuration successfully loaded!');
        
        //Check the status
        var status = pluginsConf.plugins[plugin_name].status;
        
        if (status == "off" || status == "injected"){
            
            logger.info('|--> '+ plugin_name + ' - Plugin starting...');
            
            //Create a new process that has plugin-wrapper as code
            var child = cp.fork('./plugin-wrapper');
            
            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            }
            
            
            child.on('message', function(msg) {
	   
	      if(msg.name != undefined){
		
		
		if (msg.status === "alive"){
		  
		  
		      //Creating the plugin json schema
		      var schema_outputFilename = './plugin_conf/'+plugin_name+'.json';
		      fs.writeFile(schema_outputFilename, plugin_json, function(err) {
			
			  if(err) {
			      logger.error('|--> '+ plugin_name + ' - Error opening '+plugin_name+'.json file: ' + err);
			      return 'Error opening '+plugin_name+'.json file: ' + err;
			      
			  } else {
			    
			      logger.info('|--> '+ plugin_name + ' - Plugin JSON schema saved to ' + schema_outputFilename);
	      
			      // Reading the plugins.json configuration file
			      try{
				
				  var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
				  
				  var pluginsSchemaConf = JSON.parse(fs.readFileSync(schema_outputFilename, 'utf8'));
				  
				  //Get the autostart parameter from the schema just uploaded
				  plugin_autostart = pluginsSchemaConf.autostart;
				  

			      }
			      catch(err){
				  logger.error('|--> '+ plugin_name + ' - Error parsing plugins.json configuration file: ' + err);
				  return 'Error parsing plugins.json configuration file: ' + err;
			      }
			      
			      
			      
			      // Updating the plugins.json file:
			      // - check if the user changed the autostart parameter at this stage
			      if(plugin_autostart != undefined){
				
				  pluginsConf.plugins[plugin_name].autostart = plugin_autostart;
				  logger.info('|--> '+ plugin_name + ' - Autostart parameter set by user to ' + plugin_autostart);

			      } else {
				
				  logger.info('|--> '+ plugin_name + ' - Autostart parameter not changed!');
				
			      }
			      
			      // - change the plugin status from "off" to "on" and update the PID value
			      pluginsConf.plugins[plugin_name].status = "on";
			      pluginsConf.plugins[plugin_name].pid = child.pid;
			      
			      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				
				  if(err) {
				      logger.error('|--> '+ plugin_name + ' - Error opening '+plugin_name+'.json file: ' + err);
				  } else {
				      logger.info('|--> '+ plugin_name + ' - plugins.json updated -> autostart < ' + pluginsConf.plugins[plugin_name].autostart + ' > - status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
				      
				      
				      // Start a timer to check every X minutes if the plugin is still alive!
				      exports.pluginKeepAlive(plugin_name);
				      
				  }
				  
			      });
			      
			      

			      
			  }
		      });

		      
		} else if(msg.level === "error") {
		  
		  logger.error("|--> "+ msg.name + " - " + msg.logmsg);
		  
		} else if(msg.level === "warn") {
		  
		  logger.warn("|--> "+ msg.name + " - " + msg.logmsg);
		  
		} else{

		  logger.info("|--> "+ msg.name + " - " + msg.logmsg);

		}
		
	      }
	      else{
		//serve per gestire il primo messaggio alla creazione del child
		logger.info("|--> "+ msg);
	      }

	      
	    });
            
	    
	    //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
	    child.send(input_message); 

	    
	    return 'OK - Plugin running!';


        }
        else{
            logger.warn("Plugin already started!");
            return 'Plugin already started on this board!';
        }
        
    }
    else{
      // Here the plugin does not exist
      logger.warn("Plugin \"" + plugin_name + "\" does not exist on this board!");
      return "Plugin \"" + plugin_name + "\" does not exist on this board!";
    }
}

exports.kill = function (args){
    
    var plugin_name = String(args[0]);
    
    logger.info('Stop plugin RPC called for plugin '+ plugin_name +'...');
    
    // Get the plugin's configuration.
    try{
      
	    var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
	
	    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
	      var status = pluginsConf.plugins[plugin_name].status;
	      var autostart = pluginsConf.plugins[plugin_name].autostart;
	      
	      if (status == "on"){
				
		  logger.info('|--> '+ plugin_name + ' - Plugin being stopped!');
		  
		  var pid = pluginsConf.plugins[plugin_name].pid;
		  
		  //PLUGIN KILLING
		  process.kill(pid);
		  
		  pluginsConf.plugins[plugin_name].status = "off";
		  pluginsConf.plugins[plugin_name].pid = "";

		  
		  // updates the JSON file
		  fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
		    
		      if(err) {
			
			  logger.error('|--> Error writing plugins.json: '+ err);
			  return 'Error writing plugins.json: '+ err;
			  
		      } else {
			
			  logger.debug("|--> " + outputFilename + " updated!");
			  
			  clearPluginTimer(plugin_name);
			  
		      }
		  });
		  
		  /*
		  // delete the plugin json configuration file if it doesn't have to be executed at boot time
		  if (autostart == "false"){
		  
		      fs.unlink('./plugin_conf/'+plugin_name+'.json', function (err) {
			if (err) throw err;
			  logger.info('JSON schema of '+ plugin_name +' successfully deleted!');
		      });
		  }
		  */
		  
		  return 'OK - Plugin killed!';
		  
	      }
	      else{
		      logger.warn('|--> '+ plugin_name + ' - Plugin is not running on this board!');
		      return 'Plugin is not running on this board!';

	      }
	      
	  }
    
    
    
    }
    catch(err){
	logger.info('Error parsing JSON file ./plugins.json: '+ err);
	return 'Error parsing JSON file ./plugins.json: '+ err;
    }
    
          
    
}

exports.injectPlugin = function(args){
    
    // Parsing the input arguments
    plugin_name = String(args[0]);
    plugin_code = String(args[1]);
    
    // The autostart parameter is used to set the boot execution configuration of the plugin.
    autostart = String(args[2]);
    
    logger.info("Inject plugin RPC called for "+plugin_name+" plugin...");
    logger.info("|--> Parameters injected: { plugin_name : " + plugin_name + ", autostart : " + autostart + " }");
    logger.debug("|--> plugin code:\n\n" + JSON.stringify(plugin_code) + "\n\n");
    
    // Writing the file
    var fileName = './plugins/' + plugin_name + '.js';
    fs.writeFile(fileName, plugin_code, function(err) {
      
        if(err) {
	    logger.error('|--> Error writing '+ fileName +' file: ' + err);
	    return 'Error writing '+ fileName +' file: ' + err;
	    
        } else {
	  
	    logger.info("|--> Plugin " + plugin_name + ".js injected successfully!");
            
            //Reading the measure configuration file
            var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
            
            //Update the data structure                    
            pluginsConf.plugins[plugin_name] = {};                
            pluginsConf.plugins[plugin_name]['status'] = "injected";
	    
	    if(autostart != undefined){
		pluginsConf.plugins[plugin_name]['autostart'] = autostart;
		
	    } else {
	      
		pluginsConf.plugins[plugin_name]['autostart'] = false;
	      
	    }
            
            //Updates the JSON file
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
		    logger.error('|--> Error writing ./plugins.json file: ' + err);
		    return 'Error writing ./plugins.json file: ' + err;
		    
                } else {
		    logger.debug("|--> Plugins configuration file saved to " + outputFilename);

                }
            });
	    
        }
    });
    
    return "Plugin injected successfully!"; 
    
}

exports.removePlugin = function(args){
    
    // Parsing the input arguments
    plugin_name = String(args[0]);
    
    logger.info("Remove plugin RPC called for " + plugin_name +"...");
    
    var pluginFileName = './plugins/' + plugin_name + '.js';
    var pluginConfFileName = './plugin_conf/'+plugin_name+'.json';
    var jsonPluginsFileName = './plugins.json';
    
    var d = Q.defer();

    fs.exists(pluginFileName, function(exists) {
      
      if(exists) {
	
	  logger.debug('|--> File '+pluginFileName+' exists. Deleting now ...');
	  
	  fs.unlink(pluginFileName, function(err) {
	    
		if(err) {
		      response = "|--> Plugin file removing FAILED: "+err;
		      logger.error(response);
		      d.resolve(response);
		      
		}
				
	  });
	
      } else {
	  response = "Plugin "+pluginFileName+" not found!"
	  logger.warn("|--> Plugin "+pluginFileName+" not found!");
      }
      
      
      logger.debug('|--> Plugin data cleaning...');
		    
      var pluginsConf = JSON.parse(fs.readFileSync(jsonPluginsFileName, 'utf8'));

      if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
	
	  pluginsConf.plugins[plugin_name]=null;
	  delete pluginsConf.plugins[plugin_name];
	  logger.debug("|--> Plugin node successfully removed from plugins.json!" );
	  
	  fs.writeFile(jsonPluginsFileName, JSON.stringify(pluginsConf, null, 4), function(err) {
	      if(err) {
		  response = "plugin.json file updating FAILED: "+err;
		  logger.error("|--> plugin.json updating FAILED: "+err);
		  d.resolve(response);
		  
	      } else {
		  logger.debug("|--> plugins.json file updated!");
		  
		  fs.exists(pluginConfFileName, function(exists) {

			if(exists) {
			    
			    fs.unlink(pluginConfFileName, function (err) {
			      if (err){
				  response = "|--> "+pluginConfFileName+" file deleting FAILED: "+err;
				  logger.warn("|--> "+pluginConfFileName+" file deleting FAILED: "+err);
				  d.resolve(response);				    
			      }else{
				  logger.debug("|--> "+pluginConfFileName+" file successfully deleted!");
				  response = plugin_name+" completely removed from board!";
				  logger.info("|--> " + plugin_name + " - plugin completely removed from board!");
				  d.resolve(response);	
			      }
			    });
			    
			}else{
			    logger.warn("|--> "+pluginConfFileName+" file does not exist!");
			    response = plugin_name+" completely removed from board!";
			    logger.info("|--> " + plugin_name + " - plugin completely removed from board!");
			    d.resolve(response);						
			}
			
		  });
		  
	      }
	  });	

      }else{
	  logger.warn("|--> plugins.json already clean!");
	  response = plugin_name+" completely removed from board!";
	  logger.info("|--> " + plugin_name + " - plugin completely removed from board!");
	  d.resolve(response);		      
      }
		
      
      
    });    
 

    return d.promise;

    
}








//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPluginCommands = function (session){
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    //logger.info('Exporting plugin commands to the Cloud');
    
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.plugin.run', exports.run);
    session.register(boardCode+'.command.rpc.plugin.kill', exports.kill);    
    session.register(boardCode+'.command.rpc.injectplugin', exports.injectPlugin);
    session.register(boardCode+'.command.rpc.restartAllActivePlugins', exports.restartAllActivePlugins);
    session.register(boardCode+'.command.rpc.plugin.call', exports.call);
    session.register(boardCode+'.command.rpc.removeplugin', exports.removePlugin);
    
    logger.info('[WAMP-EXPORTS] Plugin commands exported to the cloud!');
    
}

