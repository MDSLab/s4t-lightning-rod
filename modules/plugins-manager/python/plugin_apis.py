import logging
import json
import os

SETTINGS_PATH = os.environ['IOTRONIC_HOME']+"/settings.json"

def getLogger(plugin_name):
    logging.basicConfig(filename='/var/log/iotronic/plugins/'+plugin_name+'.log', format='%(asctime)s - %(levelname)s - %(message)s', level=logging.DEBUG)
    #logging.debug('TEXT')
    #logging.info('TEXT')
    #logging.warning('TEXT)
    return logging

def getExtraInfo():

    with open(SETTINGS_PATH) as settings_file:

        try:

            settings = json.load(settings_file)
            extra = settings['config']['extra']
            #print(extra)

        except Exception as err:
            extra = "NA"
            print("Error parsing settings.json: " + str(err))

        return extra

