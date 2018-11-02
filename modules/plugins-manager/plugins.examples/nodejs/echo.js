//pluginjsonschema = {"says": "BlaBlaBla..."}

exports.main = function (plugin_name, arguments, api, callback){ 
  
  var says = arguments.says;

  logger = api.getLogger(plugin_name, 'debug');
  
  logger.info(says); 
  
  callback("OK", says);
  
};