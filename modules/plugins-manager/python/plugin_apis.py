import logging

def getLogger(plugin_name):
    logging.basicConfig(filename='/var/log/iotronic/plugins/'+plugin_name+'.log', format='%(asctime)s - %(levelname)s - %(message)s', level=logging.DEBUG)
    #logging.debug('This message should go to the log file')
    #logging.info('So should this')
    #logging.warning('And this, too')
    return logging