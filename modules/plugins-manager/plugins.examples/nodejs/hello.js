//pluginjsonschema = {"name": "IoTronic"}

exports.main = function (plugin_name, arguments, api){

    var name = arguments.name;

    logger = api.getLogger(plugin_name, 'debug');

    logger.info("Hello plugin starting...");

    setInterval(function(){
        logger.info('Hello '+name+'!');

    }, 3000);

};
