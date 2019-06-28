import numpy as np
from numba.pycc import CC
from numba import jit
import math
import os
# constant
NUM_SECTOR = 9
FLT_EPSILON = 0.0000001 #To not have division by zero

cc = CC('fhog_utils_cpp')
def compile_cc():
    cc.compile()
    print("Compiled!")

@cc.export('mapPointsToBins', '(f4[:,:,:], f4[:,:,:], f4[:], f4[:], f4[:,:], i8[:,:,:], i8, i8, i8)')
def mapPointsToBins(dx, dy, bin_boundary_x, bin_boundary_y, r, choosenBins, height, width, numChannels):
    for j in range(1, height - 1):
        for i in range(1, width - 1):
            channel = 0
            x = dx[j, i, channel]
            y = dy[j, i, channel]
            r[j, i] = math.sqrt(x * x + y * y)

            for ch in range(1, numChannels):
                tx = dx[j, i, ch]
                ty = dy[j, i, ch]
                magnitude = math.sqrt(tx * tx + ty * ty)
                if (magnitude > r[j, i]):
                    r[j, i] = magnitude
                    x = tx
                    y = ty

            maxProjectionMagnitude = bin_boundary_x[0] * x + bin_boundary_y[0] * y

            maxIndex = 0

            for kk in range(0, NUM_SECTOR):
                dotProd = bin_boundary_x[kk] * x + bin_boundary_y[kk] * y
                if (dotProd > maxProjectionMagnitude):
                    maxProjectionMagnitude = dotProd
                    maxIndex = kk
                elif (-dotProd > maxProjectionMagnitude):
                    maxProjectionMagnitude = -dotProd
                    maxIndex = kk + NUM_SECTOR

            choosenBins[j, i, 0] = maxIndex % NUM_SECTOR
            choosenBins[j, i, 1] = maxIndex

@cc.export('aggregateToHOGFeatureMap', '(f4[:], f4[:,:], i8[:,:,:], i8[:], f4[:,:], i8, i8, i8, i8, i8, i8, i8)')
def aggregateToHOGFeatureMap(featureMap, r, alpha, nearestCell, cellWeights, cellSize, height, width, cellsAmountXDirection, cellsAmountYDirection, amountOfOrientationBins, rowSize):
    ### The algorithm goes through each cell one by one and each pixel one by one and allocates the computed magnitude to the right histogram bins in the right cells. It also performs interpolation between cells as can be seen by the nearestCell and cellWeights.
    for i in range(cellsAmountYDirection):
        for j in range(cellsAmountXDirection):
            for ii in range(cellSize):
                for jj in range(cellSize):
                    if (i * cellSize + ii > 0 and i * cellSize + ii < (height - 1) and j * cellSize + jj > 0 and j * cellSize + jj < (width - 1)):
                        featureMap[i * rowSize + j * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 0]] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 0] * cellWeights[jj, 0]
                        featureMap[i * rowSize + j * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 1] + NUM_SECTOR] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 0] * cellWeights[jj, 0]
                        if (i + nearestCell[ii] >= 0 and i + nearestCell[ii] <= (cellsAmountYDirection - 1)):
                            featureMap[(i + nearestCell[ii]) * rowSize + j * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 0]] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 1] * cellWeights[jj, 0]
                            featureMap[(i + nearestCell[ii]) * rowSize + j * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 1] + NUM_SECTOR] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 1] * cellWeights[jj, 0]
                        if (j + nearestCell[jj] >= 0 and j + nearestCell[jj] <= (cellsAmountXDirection - 1)):
                            featureMap[i * rowSize + (j + nearestCell[jj]) * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 0]] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 0] * cellWeights[jj, 1]
                            featureMap[i * rowSize + (j + nearestCell[jj]) * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 1] + NUM_SECTOR] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 0] * cellWeights[jj, 1]
                        if (i + nearestCell[ii] >= 0 and i + nearestCell[ii] <= (cellsAmountYDirection - 1) and j + nearestCell[jj] >= 0 and j + nearestCell[jj] <= (cellsAmountXDirection - 1)):
                            featureMap[(i + nearestCell[ii]) * rowSize + (j + nearestCell[jj]) * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 0]] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 1] * cellWeights[jj, 1]
                            featureMap[(i + nearestCell[ii]) * rowSize + (j + nearestCell[jj]) * amountOfOrientationBins + alpha[cellSize * i + ii, j * cellSize + jj, 1] + NUM_SECTOR] += r[cellSize * i + ii, j * cellSize + jj] * cellWeights[ii, 1] * cellWeights[jj, 1]

@cc.export('createNormalizedFeatures', '(f4[:], f4[:], f4[:], i8, i8, i8, i8, i8)')
def createNormalizedFeatures(newData, partOfNorm, featureMap, cellsAmountXDirection, cellsAmountYDirection, amountOfOrientationBinsPerChannel, amountOfOrientationBins, amountOfFeaturesPerCell):
    ###Creates 4 normalized features for each cell, creates the features by normalizing the targeted cell with the norm of the 4 cells in that direction(incl. itself) - e.g. southwest, northwest, northeast, southeast
    for i in range(1, int(cellsAmountYDirection+1)):
        for j in range(1, int(cellsAmountXDirection+1)):
            pos1 = i*(cellsAmountXDirection+2)*amountOfOrientationBins + j*amountOfOrientationBins
            pos2 = (i-1)*cellsAmountXDirection * amountOfFeaturesPerCell + (j-1)*amountOfFeaturesPerCell
            valOfNorm = math.sqrt(partOfNorm[i*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[i*(cellsAmountXDirection + 2) + (j + 1)] +
                                  partOfNorm[(i + 1)*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[(i + 1)*(cellsAmountXDirection + 2) + (j + 1)]) + FLT_EPSILON
            newData[pos2:pos2+amountOfOrientationBinsPerChannel] = featureMap[pos1:pos1+amountOfOrientationBinsPerChannel] / valOfNorm
            newData[pos2+4*amountOfOrientationBinsPerChannel:pos2+6*amountOfOrientationBinsPerChannel] = featureMap[pos1+amountOfOrientationBinsPerChannel:pos1 + 3*amountOfOrientationBinsPerChannel] / valOfNorm

            valOfNorm = math.sqrt(partOfNorm[i*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[i*(cellsAmountXDirection + 2) + (j + 1)] +
                                  partOfNorm[(i - 1)*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[(i - 1)*(cellsAmountXDirection + 2) + j + 1]) + FLT_EPSILON
            newData[pos2 + amountOfOrientationBinsPerChannel:pos2+2 * amountOfOrientationBinsPerChannel] = featureMap[pos1:pos1 + amountOfOrientationBinsPerChannel] / valOfNorm
            newData[pos2 + 6 * amountOfOrientationBinsPerChannel:pos2 + 8 * amountOfOrientationBinsPerChannel] = featureMap[pos1 + amountOfOrientationBinsPerChannel:pos1 + 3 * amountOfOrientationBinsPerChannel] / valOfNorm

            valOfNorm = math.sqrt(partOfNorm[i*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[i*(cellsAmountXDirection + 2) + (j - 1)] +
                                  partOfNorm[(i + 1)*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[(i + 1)*(cellsAmountXDirection + 2) + (j - 1)]) + FLT_EPSILON
            newData[pos2+2*amountOfOrientationBinsPerChannel:pos2+3*amountOfOrientationBinsPerChannel] = featureMap[pos1:pos1+amountOfOrientationBinsPerChannel] / valOfNorm
            newData[pos2+8*amountOfOrientationBinsPerChannel:pos2+10*amountOfOrientationBinsPerChannel] = featureMap[pos1+amountOfOrientationBinsPerChannel:pos1+3*amountOfOrientationBinsPerChannel] / valOfNorm

            valOfNorm = math.sqrt(partOfNorm[i*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[i*(cellsAmountXDirection + 2) + (j - 1)] +
                                  partOfNorm[(i - 1)*(cellsAmountXDirection + 2) + j] +
                                  partOfNorm[(i - 1)*(cellsAmountXDirection + 2) + (j - 1)]) + FLT_EPSILON
            newData[pos2+3*amountOfOrientationBinsPerChannel:pos2+4*amountOfOrientationBinsPerChannel] = featureMap[pos1:pos1+amountOfOrientationBinsPerChannel] / valOfNorm

            newData[pos2+10*amountOfOrientationBinsPerChannel:pos2+12*amountOfOrientationBinsPerChannel] = featureMap[pos1+amountOfOrientationBinsPerChannel:pos1+3*amountOfOrientationBinsPerChannel] / valOfNorm

@cc.export('hogPCA', '(f4[:], f4[:], i8, i8, i8, i8, i8, i8, f8, f8)')
def hogPCA(newData, featuresMap, totalAmountOfFeaturesPerCell, cellsAmountXDirection, cellsAmountYDirection, newAmountOfFeatures, normalizationFeatures, amountOfBinsPerChannel, nx, ny):
    for i in range(cellsAmountYDirection):
        for j in range(cellsAmountXDirection):
            pos1 = (i*cellsAmountXDirection + j) * totalAmountOfFeaturesPerCell
            pos2 = (i*cellsAmountXDirection + j) * newAmountOfFeatures
            ### Does not seem to be PCA, he just creates his own kind of base based on channel and histogram bin
            ### And then also creates vector based on each normalization features
            for jj in range(2 * amountOfBinsPerChannel):  # 2*9
                newData[pos2 + jj] = np.sum(featuresMap[pos1 + normalizationFeatures*amountOfBinsPerChannel + jj : pos1 + 3*normalizationFeatures*amountOfBinsPerChannel + jj : 2*amountOfBinsPerChannel])*ny
            for jj in range(amountOfBinsPerChannel):  # 9
                newData[int(pos2 + 2*amountOfBinsPerChannel + jj)] = np.sum(featuresMap[pos1 + jj : pos1 + jj + normalizationFeatures*amountOfBinsPerChannel : amountOfBinsPerChannel])*ny
            for ii in range(normalizationFeatures):  # 4
                newData[int(pos2 + 3*amountOfBinsPerChannel + ii)] = np.sum(featuresMap[pos1 + normalizationFeatures*amountOfBinsPerChannel + ii*amountOfBinsPerChannel*2 : pos1 + normalizationFeatures*amountOfBinsPerChannel + ii*amountOfBinsPerChannel*2 + 2*amountOfBinsPerChannel]) * nx

#if __name__ == "__main__":
#    cc.compile()
