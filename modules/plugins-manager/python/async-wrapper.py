import sys
import imp
import socket
from datetime import datetime
import time
import os

plugin_name = sys.argv[1]
plugin_params = sys.argv[2]

socket_path = '/tmp/plugin-'+plugin_name

plugin_path = os.environ.get('IOTRONIC_HOME')+"/plugins/"+plugin_name+"/"+plugin_name+".py"

plugin = imp.load_source("plugin", plugin_path)

worker = plugin.Plugin(
    plugin_params
)
worker.start()

"""
plugin.main(plugin_name)
"""

msg="Plugin " +plugin_name+" is running!"

# connect to the unix local socket with a stream type
client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
client.connect(socket_path)
client.send(msg)
client.close()
