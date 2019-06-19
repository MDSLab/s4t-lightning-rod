import logging
import json
import os
import sys

SETTINGS_PATH = os.environ['IOTRONIC_HOME']+"/settings.json"

def getLogger(plugin_name, console=None):

    # logging.root.handlers = []
    lr_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    logging.basicConfig(filename='/var/log/iotronic/plugins/'+plugin_name+'.log', level=logging.DEBUG)

    # set up logging to console
    if (console != None) and (console == True):
        cl = logging.StreamHandler(sys.stdout)
        cl.setLevel(logging.DEBUG)
        logging.getLogger("").addHandler(cl)

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
