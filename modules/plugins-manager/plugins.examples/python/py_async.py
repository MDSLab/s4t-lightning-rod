# User imports
import time
from datetime import datetime

def main(params):
   while(True):
        now = datetime.now().strftime( "%-d %b %Y %H:%M:%S.%f" )
        print("I'm "+str(params['name'])+" @ "+now)
        time.sleep(1)
