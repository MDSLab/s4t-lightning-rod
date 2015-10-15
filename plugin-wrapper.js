var plugin_name;
var plugin_json

process.once('message', function(message) {
  
    plugin_name = message.plugin_name;
    plugin_json = message.plugin_json;
    
    var plugin = require('./plugins/' + plugin_name);
        
    plugin.main(plugin_json);
    
});

process.on('exit', function(){
    
    console.log('Process terminated: putting ' + plugin_name + ' to off');
    
    try{
        //Reading the plugin configuration file
        var fs = require('fs');
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
        //Reading the json file as follows does not work because the result is cached!
        //var pluginsConf = require("./plugins.json");
    }
    catch(err){
        console.log('Error parsing JSON file ./plugins.json');
    }
        
    
    pluginsConf.plugins[plugin_name].status = "off";
    pluginsConf.plugins[plugin_name].pid = "";

             
    //updates the JSON file
    var outputFilename = './plugins.json';
    fs.writeFileSync(outputFilename, JSON.stringify(pluginsConf, null, 4));
    
});


