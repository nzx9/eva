"use strict";

class AbstractFramePlayer {
    constructor(src, element,offset,videoChunkSize) {
        this.onTimeUpdates = [];
    }

    static newFramePlayer(element, options,offset,videoChunkSize) {
        if (options.images)
            return new ImageFramePlayer(options.images, element,offset,videoChunkSize);
        else throw new Error("Unknown Frame Player specified - [" + type + "], currently only support 'video' and 'image'");
    }
    get videoWidth() {
        return 0;
    }
    get videoHeight() {
        return 0;
    }
    get duration() {
        return 0;
    }
    get currentTime() {
        return 0;
    }

    set currentTime(val) {

    }

    get paused() {
        return false
    }

    pause() {

    }

    play() {

    }

    rewindStep() {}

    /**
     * Events:
     *  - playing
     *  - pause
     *  - loadedmetadata
     *  - abort
     *  - timeupdate
     *  - buffering
     */
    onPlaying(callback) {}
    onPause(callback) {}
    onLoadedMetadata(callback) {}
    onAbort(callback) {}
    onBuffering(callback) {}

    nextFrame() {}
    previousFrame() {}

    fit() {}


    onTimeUpdate(callback) {
        this.onTimeUpdates.push(callback);
    }
    triggerTimerUpdateHandler() {
        this.triggerCallbacks(this.onTimeUpdates);
    }

    triggerCallbacks(handlers) {
        for (var i = 0; i < handlers.length; i++) {
            handlers[i]();
        }
    }
}



class ImageFramePlayer extends AbstractFramePlayer {
    constructor(images, element,offset,videoChunkSize) {
        
        super(images, element,offset,videoChunkSize);
        // image list
        $(element).imgplay({rate: 15, controls: false, pageSize: 100, center: true, onLoading: (isLoading) => {

            if (this.onBuffering){
                this.onBuffering(isLoading);
            }
        }});
        this.offset = offset;
        this.videoChunkSize = videoChunkSize;
        this.imgPlayer = $(element).data('imgplay');
        this.imgPlayer.toFrame(0);
        this.onPauseHandlers = [];
        this.onPlayingHandlers = [];

        // hack but we don't want to trigger ready until we have frame 0 loaded and can read the height
        var image = new Image();
        image.onload = () => {
            if (this.onLoadedMetadata) {
                this.onLoadedMetadata();
                this.hasInit = true;
            }
            var css = {
                width: '100%'
            };
            $(element).css(css);
            this.imgPlayer.fitCanvas();
            this.imgPlayer.toFrame(0);
        }
        image.src = this.imgPlayer.frames[0].src;
    }
    get videoWidth() {
        return this.imgPlayer.frames[this.imgPlayer.getCurrentFrame()].width;
    }
    get videoHeight() {
        return this.imgPlayer.frames[this.imgPlayer.getCurrentFrame()].height;
    }

    get viewWidth() {
        return this.imgPlayer.getDrawnWidth();
    }
    get viewHeight() {
        return this.imgPlayer.getDrawnHeight();
    }

    get duration() {
        //TODO figure out why -1 fixed the issue of having the imgplayer repeat the last picture
        return this.imgPlayer.getTotalFrames()-1;
    }

    get currentTime() {
        return this.imgPlayer.getCurrentFrame() + this.offset;
    }

    set currentTime(val) {
        val = val - this.offset;
        val = Math.min(this.duration, val);
        val = Math.max(0, val);
        this.imgPlayer.toFrame(Math.floor(val));
        this.triggerTimerUpdateHandler();
    }

    get paused() {
        
        return !this.imgPlayer.isPlaying();
    }

    pause() {
        this.imgPlayer.pause();
        this.triggerCallbacks(this.onPauseHandlers);
    }

    play() {
        this.imgPlayer.play();
        this.triggerCallbacks(this.onPlayingHandlers);
    }

    rewindStep() {
        this.previousFrame();
    }

    nextFrame() {
        this.currentTime = this.currentTime + 1
    }

    previousFrame() {
        return this.currentTime = this.currentTime - 1;
    }

    fit() {
        this.imgPlayer.fitCanvas();
    }

    /**
     * Events:
     *  - playing
     *  - pause
     *  - loadedmetadata
     *  - abort
     *  - timeupdate
     */
    onPlaying(callback) {
        this.onPlayingHandlers.push(callback);
        //console.log("hey I am here !!");
        if (!this.paused && callback)
            callback();

    }
    onPause(callback) {
        this.onPauseHandlers.push(callback);
    }

    onLoadedMetadata(callback) {
        this.onLoadedMetadata = callback;
        if (this.hasInit)
            callback();
    }
    onAbort(callback) {
        this.onAbort = callback;
    }
    onBuffering(callback) {
        this.onBuffering = callback;
    }
}

void ImageFramePlayer;
void AbstractFramePlayer;
