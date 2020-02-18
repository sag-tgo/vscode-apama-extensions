# @file plist2json.py
# @desc convert plist to json
# @usage >python plist2json.py FILE_NAME
# @test under python v2.7
# @author g8up
# @date 2017.7.21

import sys
import json
from plistlib import load, readPlist

def main ():
  for filename in sys.argv [1:]:
    plist = open(filename,'rb')
    plist_object = load(plist)

    json_serialized = json.dumps(plist_object)
    print (json_serialized)

if __name__ == "__main__":
  main ()