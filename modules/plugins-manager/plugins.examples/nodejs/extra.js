exports.main = function (plugin_name, arguments, api, callback){

  logger = api.getLogger(plugin_name, 'debug');

  extra = api.getExtraInfo();

  logger.info("EXTRA: ",extra);

  if (extra.field != undefined)
      result = extra.field;
  else
      result = extra;

  callback("OK", result);


};