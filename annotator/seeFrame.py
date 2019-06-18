import numpy as np
import cv2
import h5py
from models import Video, UploadFile, LabelMapping

def get_frame(line):
    impath = linecache.getline('datasets/' + str(1) + '/images.txt', line + 1)
    impath = impath.split("\n")[0]
    frame = cv2.imread(impath)
    return frame

video = Video.objects.get(id=3)
hdf5_file = h5py.File(video.cache_file, 'r')
frame = hdf5_file['img'][101, ...]
cv2.imshow(frame)

frame = get_frame(100)
cv2.imshow(frame)