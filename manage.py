#!/usr/bin/env python
import os
import sys
my_path = './annotator/KCFtracker'
if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eva.settings")

    from django.core.management import execute_from_command_line
    #if(sys.argv[1] == "compileFhog"):
    #    fhog.compile_cc()
    #else:
    execute_from_command_line(sys.argv)