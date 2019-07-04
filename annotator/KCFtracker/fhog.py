import numpy as np
import cv2
import math
from .fhog_utils import map_points_to_bins, aggregate_to_hog_feature_map, create_normalized_features, hog_pca

# constant
NUM_SECTOR = 9
FLT_EPSILON = 0.0000001  # To not have division by zero


# This is file involves functions used to compute histogram of oriented gradients
def get_feature_maps(image, cellSize, featuresMap):
    """Here we compute the edge convolution in x and y direction, with interval k in x and y direction.
    By using the interval k we limit the accuracy of the edge detection but it saves time.
    In our current usage of the function the k is the cell size"""
    kernel = np.array([[-1., 0., 1.]], np.float32)

    height = image.shape[0]
    width = image.shape[1]
    assert (image.ndim == 3 and image.shape[2])
    numChannels = 3  # (1 if image.ndim==2 else image.shape[2])

    cellsAmountXDirection = int(width / cellSize)
    cellsAmountYDirection = int(height / cellSize)
    amountOfOrientationBins = numChannels * NUM_SECTOR
    rowSize = int(cellsAmountXDirection * amountOfOrientationBins)
    featuresMap['sizeX'] = cellsAmountXDirection
    featuresMap['sizeY'] = cellsAmountYDirection
    featuresMap['numFeatures'] = amountOfOrientationBins
    featuresMap['map'] = np.zeros(featuresMap['sizeX'] * featuresMap['sizeY'] * featuresMap['numFeatures'], np.float32)

    # Computing the gradients
    dx = cv2.filter2D(np.float32(image), -1, kernel)  # np.float32(...) is necessary #Detecting edges in x-direction
    dy = cv2.filter2D(np.float32(image), -1, kernel.T)  # detecting edges in y-direction
    arg_vector = np.arange(NUM_SECTOR + 1).astype(np.float32) * np.pi / NUM_SECTOR
    boundary_x = np.cos(arg_vector)  # The orientations value in x-axis(as vectors)
    boundary_y = np.sin(arg_vector)  # The orientations value in y-axis(as vectors)

    """ Using the gradients in each channel to get the largest value of the channels and then using the resulting gradient
    to calculate the bin-value(for the histogram), where r is the radians """
    r = np.zeros((height, width), np.float32)  # The radians
    alpha = np.zeros((height, width, 2), np.int64)  # Will be the directions in which the maximum gradient was found
    map_points_to_bins(dx, dy, boundary_x, boundary_y, r, alpha, height, width, numChannels)  # with @jit
    # ~0.001s
    nearestCell = np.ones(cellSize, np.int64)
    nearestCell[0:math.floor(cellSize / 2)] = -1

    # Computing weights which are used to interpolate between cells
    cellWeights = np.zeros((cellSize, 2), np.float32)
    a_x = np.concatenate(
        (cellSize / 2 - np.arange(cellSize / 2) - 0.5, np.arange(cellSize / 2, cellSize) - cellSize / 2 + 0.5)).astype(
        np.float32)
    b_x = np.concatenate((cellSize / 2 + np.arange(cellSize / 2) + 0.5,
                          -np.arange(cellSize / 2, cellSize) + cellSize / 2 - 0.5 + cellSize)).astype(np.float32)
    cellWeights[:, 0] = 1.0 / a_x * ((a_x * b_x) / (a_x + b_x))
    cellWeights[:, 1] = 1.0 / b_x * ((a_x * b_x) / (a_x + b_x))

    # Here we compute the actual HOG-features, by using the weights to sum up the values for each bin  for each cell.
    temporaryFeaturesMap = np.zeros(cellsAmountXDirection * cellsAmountYDirection * amountOfOrientationBins, np.float32)
    aggregate_to_hog_feature_map(temporaryFeaturesMap, r, alpha, nearestCell, cellWeights, cellSize, height, width,
                             cellsAmountXDirection, cellsAmountYDirection, amountOfOrientationBins, rowSize)
    featuresMap['map'] = temporaryFeaturesMap
    # ~0.001s

    return featuresMap


def normalize_and_truncate(featureMap, alpha):
    cellsAmountXDirection = featureMap['sizeX']
    cellsAmountYDirection = featureMap['sizeY']
    numChannels = 3
    normalizationFeatures = 4
    amountOfOrientationBinsPerChannel = NUM_SECTOR
    amountOfOrientationBins = amountOfOrientationBinsPerChannel * numChannels
    totalAmountOfFeaturesPerCell = amountOfOrientationBins * normalizationFeatures
    # 50x speedup
    index = np.arange(0, cellsAmountXDirection * cellsAmountYDirection * featureMap['numFeatures'],
                      featureMap['numFeatures']).reshape(
        (cellsAmountXDirection * cellsAmountYDirection, 1)) + np.arange(amountOfOrientationBinsPerChannel)
    # The divisor-component used to normalize each cell
    partOfNorm = np.sum(featureMap['map'][index] ** 2, axis=1)  ### ~0.0002s
    # Removes the cells at the borders
    cellsAmountXDirection, cellsAmountYDirection = cellsAmountXDirection - 2, cellsAmountYDirection - 2

    newData = np.zeros(cellsAmountYDirection * cellsAmountXDirection * totalAmountOfFeaturesPerCell, np.float32)
    create_normalized_features(newData, partOfNorm, featureMap['map'], cellsAmountXDirection, cellsAmountYDirection,
                             amountOfOrientationBinsPerChannel, amountOfOrientationBins,
                             totalAmountOfFeaturesPerCell)  # with @jit

    # truncation
    newData[newData > alpha] = alpha

    featureMap['numFeatures'] = totalAmountOfFeaturesPerCell
    featureMap['sizeX'] = cellsAmountXDirection
    featureMap['sizeY'] = cellsAmountYDirection
    featureMap['map'] = newData

    return featureMap


def pca_feature_maps(featureMap):
    cellsAmountXDirection = featureMap['sizeX']
    cellsAmountYDirection = featureMap['sizeY']

    totalAmountOfFeaturesPerCell = featureMap['numFeatures']
    numChannels = 3
    newAmountOfFeatures = NUM_SECTOR * numChannels + 4
    normalizationFeatures = 4
    amountOfBinsPerChannel = NUM_SECTOR

    nx = 1.0 / np.sqrt(amountOfBinsPerChannel * 2)
    ny = 1.0 / np.sqrt(normalizationFeatures)

    newData = np.zeros(cellsAmountXDirection * cellsAmountYDirection * newAmountOfFeatures, np.float32)
    hog_pca(newData, featureMap['map'], totalAmountOfFeaturesPerCell, cellsAmountXDirection, cellsAmountYDirection,
           newAmountOfFeatures, normalizationFeatures, amountOfBinsPerChannel, nx, ny)  # with @jit

    featureMap['numFeatures'] = newAmountOfFeatures
    featureMap['map'] = newData

    return featureMap
