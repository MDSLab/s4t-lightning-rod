//ADESSO NON FUNZIONA PERCHé LA CHIAMATA REST NON RITORNA CORRETTAMENTE
//Per adesso stiamo considerando processi asincroni che non restituiscono nulla
//Per far restituire qualcosa alla funzione run (almeno se il processo è stato lanciato correttamente) credo che si debbano usare le promise ma non sono sicuro (si dovrebbe domandare a quelli di TAVENDO se è possibile in WAMP dichiarare una RPC con una funziona asincrona ed eventualmente come).


//This function runs a plugin in a new process
exports.run = function (args){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    
    console.log(new Date().toISOString() + ' - INFO - Plugin '+ plugin_name +' JSON Schema: '+plugin_json);
    
    try{
        //Reading the plugin configuration file
        var fs = require('fs');
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
        //Reading the json file as follows does not work because the result is cached!
        //var pluginsConf = require("./plugins.json");
    }
    catch(err){
        console.log('Error parsing JSON file ./plugins.json');
        return 'Internal server error';
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
        
        //Check the status
        var status = pluginsConf.plugins[plugin_name].status;
        
        if (status == "off"){
            
            console.log("Plugin " + plugin_name + " being started");
            
            //Create a new process that has plugin-wrapper as code
            var cp = require('child_process');
            var child = cp.fork('./plugin-wrapper');
            
            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            }
            
            //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
            child.send(input_message);
            
//             //I wait for a message from the wrapper to know if it terminates
//             child.on('message', function(message) {
//                 if (message == "exiting"){
//                     pluginsConf.plugins[plugin_name].status = "on";
//                     
//                     //updates the JSON file
//                     var fs = require("fs");
//                     var outputFilename = './plugins.json';
//                     fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
//                         if(err) {
//                             console.log(err);
//                         } else {
//                             console.log("JSON saved to " + outputFilename);
//                         }
//                     });
//                 }
//                 
//                 else
//                     console.log("something very strange happened");
//             });
            
            pluginsConf.plugins[plugin_name].status = "on";
            pluginsConf.plugins[plugin_name].pid = child.pid;
            
            //console.log('New file %j', pluginsConf);
            
            //updates the JSON file
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
	    
	    //create plugin json schema
	    var schema_outputFilename = './schemas/'+plugin_name+'.json';
	    fs.writeFile(schema_outputFilename, plugin_json, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log(new Date().toISOString() + ' - INFO - JSON SCHEMA saved to ' + schema_outputFilename);
                }
            });
	    
            return 'OK';
	    

	    

        }
        else{
            console.log("Plugin already started.");
            return 'Plugin already started on this board';
        }
        
    }
    else{
      //Here the plugin does not exist
      console.log("Plugin " + pluginname + " does not exists on this board");
      return 'Plugin does not exist on this board';
    }
}


exports.kill = function (args){
    
    var plugin_name = String(args[0]);

    //Reading the plugin configuration file
    var fs = require('fs');
    var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var pluginsConf = require("./plugins.json");
    
          
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
        var status = pluginsConf.plugins[plugin_name].status;
        if (status == "on"){
            console.log("Plugin " + plugin_name + " being stopped");
            
            var pid = pluginsConf.plugins[plugin_name].pid;
            process.kill(pid);
            pluginsConf.plugins[plugin_name].status = "off";
            pluginsConf.plugins[plugin_name].pid = "";

            
            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
	    
	    
	    //delete plugin json schema
	    fs.unlink('./schemas/'+plugin_name+'.json', function (err) {
	      if (err) throw err;
		console.log(new Date().toISOString() + ' - INFO - Json schema '+ plugin_name +' successfully deleted!');
	    });
	    
            return 'OK';
        }
        else{
                console.log("Plugin already stopped.");
                return 'Plugin is not running on this board';

        }
        
    }    
}


exports.injectPlugin = function(args){
    
    plugin_name = String(args[0]);
    plugin_code = String(args[1]);
    
    console.log("Called RPC with plugin_name = " + plugin_name + ", plugin_code = " + plugin_code);
    
    var fs = require("fs");
    
    //Writing the file
    var fileName = './plugins/' + plugin_name + '.js';
    fs.writeFile(fileName, plugin_code, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("Plugin " + fileName + " injected successfully");
            
            //Reading the measure configuration file
            var fs = require('fs');
            var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
            //Reading the json file as follows does not work because the result is cached!
            //var measuresConf = require("./measures.json");
            
            //Update the data structure                    
            pluginsConf.plugins[plugin_name] = {};                
            pluginsConf.plugins[plugin_name]['status'] = "off";
            
            //Updates the JSON file
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
        }
    });
}


//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPluginCommands = function (session){
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    console.log('Exporting plugin commands to the Cloud');
    
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.plugin.run', exports.run);
    session.register(boardCode+'.command.rpc.plugin.kill', exports.kill);    
    session.register(boardCode+'.command.rpc.injectplugin', exports.injectPlugin);
  
}

