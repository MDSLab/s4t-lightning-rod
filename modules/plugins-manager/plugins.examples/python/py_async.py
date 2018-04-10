# User imports
import sys
import time
import threading
import os
from datetime import datetime
import json

class Plugin(threading.Thread):
    def __init__(self, params):
        threading.Thread.__init__(self)
        # self.setDaemon(1)
        self.setName("AsyncPlugin")  # Set thread name
        self.params = json.loads(params)

    def run(self):
        print("Plugin Thread starting...")
        print("--> PARAMS:" + self.params['name'])
        while(True):
            now = datetime.now().strftime( "%-d %b %Y %H:%M:%S.%f" )
            print("I'm "+self.params['name']+" @ "+now)
            time.sleep(1)
"""

def main(params):
    while(True):
        now = datetime.now().strftime( "%-d %b %Y %H:%M:%S.%f" )
        print("I'm "+params+" @ "+now)
        time.sleep(1)

"""
