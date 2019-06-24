#!/usr/bin/env python
import os
import sys
import annotator.KCFtracker.fhog_utils as fhog

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eva.settings")

    from django.core.management import execute_from_command_line
    if(sys.argv[1] == "compileFhog"):
        #try:
        fhog.compile_cc()
        #except:
        #    print("It appears to be that fhog has already been compiled, delete the old compiled file if you want to "
        #          "recompile it")
    else:
        execute_from_command_line(sys.argv)
