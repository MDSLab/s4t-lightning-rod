/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
* 
*/


var plugin_name;
var plugin_json;

var fs = require('fs');
var PLUGINS_SETTING = process.env.IOTRONIC_HOME + '/plugins/plugins.json';
var PLUGINS_STORE = process.env.IOTRONIC_HOME + '/plugins/';

process.once('message', function(message) {
  
    plugin_name = message.plugin_name;
    plugin_json = message.plugin_json;

    var plugin_folder = PLUGINS_STORE + plugin_name;
    var fileName = plugin_folder + "/" + plugin_name + '.js';
    
    if (fs.existsSync(fileName) === true){

        var plugin = require(plugin_folder + "/" + plugin_name);
      
        process.send({ name: plugin_name, status: true , logmsg: "I'm alive!"});
        process.send({ name: plugin_name, level: "info" , logmsg: "starting..."});
        process.send({ name: plugin_name, status: "alive"});
      
        plugin.main(plugin_json, function(err, result){
	
	    process.send({ name: plugin_name, status: "finish", logmsg: result});
	
      });

    }
    else{
      
        process.send({ name: plugin_name, status: "fault" , logmsg: "Call source file does not exist!"});
      
    }
    
});

process.on('exit', function(){
    
    process.send({ name: plugin_name, level: "warn" , logmsg: 'Process terminated: putting ' + plugin_name + ' to off'});
    
    try{
        //Reading the plugin configuration file
        var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
    }
    catch(err){
	    process.send({ name: plugin_name, level: "error" , logmsg: 'Error parsing JSON file plugins.json'});
    }
        
    pluginsConf.plugins[plugin_name].status = "off";
    pluginsConf.plugins[plugin_name].pid = "";
             
    //updates the JSON file
    fs.writeFileSync(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4));
    
});


