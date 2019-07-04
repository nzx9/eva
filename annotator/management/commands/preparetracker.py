from django.core.management.base import BaseCommand, CommandError
import annotator.KCFtracker.fhog_utils as fhog
import os
import sys
my_path = 'annotator/KCFtracker'
class Command(BaseCommand):
    help = 'Compiles the fhog_utils file to be used in cpp through numba'

    def handle(self, *args, **options):
        try:
            fhog.compile_cc()
        except AttributeError:
            if (len([f for f in os.listdir(my_path)
                     if f.startswith('fhog_utils.') and os.path.isfile(os.path.join(my_path, f))]) > 1):
                print("It appears to be that fhog has already been compiled, "
                      "delete the fhog_utils-file which doesn't end with .py")
            else:
                print("Unknown AttributeError")