#!/usr/bin/env python
import os
import sys
import annotator.KCFtracker.fhog_utils as fhog
my_path = './annotator/KCFtracker'
if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eva.settings")

    from django.core.management import execute_from_command_line
    if(sys.argv[1] == "compileFhog"):
        if(len([f for f in os.listdir(my_path)
                 if f.startswith('fhog_utils.') and os.path.isfile(os.path.join(my_path, f))]) > 1):
            print("It appears to be that fhog has already been compiled, delete the old compiled file if you want to "
                  "recompile it")
        else:
            fhog.compile_cc()
    else:
        execute_from_command_line(sys.argv)