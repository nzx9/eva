"use strict";

// Constants. ES6 doesn't support class constants yet, thus this hack.
var PlayerViewConstants = {
    // Value of .player-control-scrubber[max]
    CONTROL_SCRUBBER_GRANULARITY: 10000,

    // How often the UI updates the displayed time
    TIME_UPDATE_DELAY: 30 /* ms */,
};


class PlayerView {
    constructor({$container, videoSrc, videoStart, videoEnd, isImageSequence,offset,videoChunkSize,videoIndex}) {
        // This container of the player
        this.$container = $container;

        // The Raphael paper (canvas) for annotations
        this.$paper = null;

        // Namespaced className generator
        this.classBaseName = new Misc.ClassNameGenerator('player');

        // The invisible rect that receives drag events not targeted at speciifc
        this.creationRect = null;

        this.crosshairs = null;

        // The keyframebar
        this.keyframebar = null;

        // Timer id used to increate <video>.on('timeupdate') frequency
        this.manualTimeupdateTimerId = null;

        // The rects
        this.rects = null;

        // Timder id for rewind
        this.rewindTimerId = null;

        // Is something being dragged?
        this.dragInProgress = false;

        // The <video> object
        this.video = null;

        // Video URL
        this.videoSrc = videoSrc;

        // Video start time
        this.videoStart = videoStart;

        // Video end time
        this.videoEnd = videoEnd;

        this.offset = offset;

        this.videoChunkSize = videoChunkSize;

        this.videoIndex = videoIndex;


        // are we waiting for buffering
        this.loading = true;

        this.scaleToFit = false;

        // whether or not we are using an image sequence or a video style renderer
        this.isImageSequence = isImageSequence;

        // Promises
        this.keyframebarReady = Misc.CustomPromise();
        this.paperReady = Misc.CustomPromise();
        this.videoReady = Misc.CustomPromise();

        // We're ready when all the components are ready.
        this.ready = Misc.CustomPromiseAll(
            this.keyframebarReady(),
            this.paperReady(),
            this.videoReady()
        );

        // Prevent adding new properties
        Misc.preventExtensions(this, PlayerView);

        this.initHandlers();
        this.initPaper();
        this.initVideo();
        this.initKeyframebar();

        if (helpEmbedded) {
            // check cookie

            var hasSeen = document.cookie && document.cookie.indexOf('has_seen_help=') > -1
            if (!hasSeen) {
                $('#instructionModal').modal();
            }
            var date = new Date();
            date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
            document.cookie = 'has_seen_help=yes; expires=' + date.toGMTString() + '; path=/';
            $('#show-help').on('click', () => $('#instructionModal').modal());
        }
    }

    set loading(val) {
        if (val) {
            this.$('loader').css({display: 'flex'});
        }
        else {
            this.$('loader').css({display: 'none'});
        }
        this._loading = val;
    }
    get loading() { return this._loading; }

    // Init ALL the annotations!

    initKeyframebar() {
        this.keyframebar = new Keyframebar({classBaseName: this.classBaseName});
        this.keyframebar.attach(this.$('keyframebar'));
        this.keyframebarReady.resolve();
    }

    initPaper() {
        // Depends on this.videoReady for this.video.videoWidth/Height
        this.videoReady().then(() => {
            var {videoWidth, videoHeight, viewWidth, viewHeight} = this.video;
            this.$paper = Raphael(this.$('paper')[0], videoWidth, videoHeight);

            var css = {
                position: 'absolute',
                'margin-left': 'auto',
                'margin-right': 'auto',
                'margin-top': 'auto',
                'margin-bottom': 'auto',
                left: 0,
                right: 0,
                top : 0,
                bottom : 0,
                'width': `${viewWidth}px`,
                'height': `${viewHeight}px`,
            };

            $(this.$paper.canvas).attr({
                viewBox: `0 0 ${videoWidth} ${videoHeight}`
            }).removeAttr(
                'width'
            ).removeAttr(
                'height'
            ).css(css);
            this.creationRect = this.makeAndAttachRect(CreationRect);
            this.rects = [];

            $(this.creationRect).on('create-bounds', (e, bounds) => { // here you mark the object (mark)
                var rect = this.addRect();
                rect.bounds = bounds;
                rect.focus();
                $(this).triggerHandler('create-rect', rect);
            });

            this.video.onTimeUpdate(() => {
                var {videoWidth, videoHeight, viewWidth, viewHeight} = this.video;
                var css = {
                    position: 'absolute',
                    'margin-left': 'auto',
                    'margin-right': 'auto',
                    'margin-top': 'auto',
                    'margin-bottom': 'auto',
                    left: 0,
                    right: 0,
                    top : 0,
                    bottom : 0,
                    'width': `${viewWidth}px`,
                    'height': `${viewHeight}px`,
                };
                $(this.$paper.canvas).attr({
                    viewBox: `0 0 ${videoWidth} ${videoHeight}`,
                }).css(css);
                this.$paper.setSize(videoWidth, videoHeight);
                this.creationRect.bounds = {
                    xMin: 0,
                    xMax: this.$paper.width,
                    yMin: 0,
                    yMax: this.$paper.height,
                };
            });

            this.drawCrosshairs();

            this.paperReady.resolve();
        });
    }

    drawCrosshairs() {
        // Create lines
        var h_line = this.$paper.path("M0 0L" + this.$paper.width + " 0").attr({stroke:'#FFFFFF'});
        var v_line = this.$paper.path("M0 0L0 " + this.$paper.height).attr({stroke:'#FFFFFF'});
        // Push lines back, so they will not have mouse focus
        h_line.toBack();
        v_line.toBack();

        var that = this;

        // After creating a box, push lines back, so the CreationRect will have mouse focus
        $(this.creationRect).on('drag-end', function(){
            h_line.toBack();
            v_line.toBack();
        });

        // Move lines with mouse
        $(this.$paper.canvas).bind('mousemove', function(e) {
            var {offset, scale} = that.metrics();

            var x = (e.pageX - offset.left) / scale;
            var y = (e.pageY - offset.top) / scale;

            h_line.remove();
            h_line = that.$paper.path(`M0 0L` + that.$paper.width + " 0").attr({stroke:'#FFFFFF'});
            h_line.transform("T" + 0 + "," + y);
            v_line.remove();
            v_line = that.$paper.path("M0 0L0 " + that.$paper.height).attr({stroke:'#FFFFFF'});
            v_line.transform("T" + x + "," + 0);
            h_line.toBack();
            v_line.toBack();
        });
    }

    sizeVideoFrame() {
        if (this.scaleToFit) {
            var height = this.video.videoHeight;
            if (this.$('video').width() < this.video.videoWidth) {
                height = height * (this.$('video').width() / this.video.videoWidth);
            }
            this.$('video').css({
                height: `${height}px`,
            });
        }

        // need to link SVG with video when scaling
        // if we just toggled scale to fit the video properties are not up to date yet
        if (this.$paper) {
            setTimeout(() => {
                var {viewWidth, viewHeight} = this.video;
                $(this.$paper.canvas)
                .css({
                    'width': `${viewWidth}px`,
                    'height': `${viewHeight}px`,
                });
            }, 10);
        }

        this.video.fit();
    }

    initVideo() {
        this.video = AbstractFramePlayer.newFramePlayer(this.$('video')[0], { images: imageList, videoSrc: this.videoSrc },this.offset,this.videoChunkSize,this.videoIndex);
        //need to set the current time by default -  if (this.videoStart != null) { this.video.currentTime = this.videoStart; }
        this.video.onPlaying(() => {
            clearInterval(this.manualTimeupdateTimerId);
            this.manualTimeupdateTimerId = setInterval(() => {
                if(this.video.paused){
                     if(this.loading)
                        this.loading = false;
                     this.video.play();
                 }
                this.video.triggerTimerUpdateHandler();
            }, this.TIME_UPDATE_DELAY);
        });
        this.video.onPause(() => {
             clearInterval(this.manualTimeupdateTimerId);
        });
        this.video.onLoadedMetadata(() => {
            this.videoReady.resolve();
        });
        $(window).resize(() => this.sizeVideoFrame());
        this.video.onAbort(() => {
            this.videoReady.reject();
        });
        this.video.onBuffering((isBuffering) => {
            this.loading = isBuffering;
        });
    }

    initHandlers() {
        this.ready().then(() => {
            // key => better key events
            $(document).keydown(Misc.fireEventByKeyCode.bind(this));
            $(document).keyup(Misc.fireEventByKeyCode.bind(this));
            $('input').keydown(function(e) {   e.stopPropagation(); });
            $('textarea').keydown(function(e) {   e.stopPropagation(); });

            // control-time <=> video
            this.$on('control-time', 'change', () => this.video.currentTime = this.controlTime);
            this.video.onTimeUpdate(() => this.controlTimeUnfocused = this.video.currentTime);
            this.video.onPlaying(() => this.togglePlayPauseIcon());
            this.video.onPause(() => this.togglePlayPauseIcon());

            // control-scrubber <=> video
            this.$on('control-scrubber', 'input', () => this.jumpToTimeAndPause(this.controlScrubber));
            this.$('control-scrubber').on('focus', () => this.$('control-scrubber').blur());
            this.video.onTimeUpdate(() => this.controlScrubberInactive = this.video.currentTime);

            // keyframebar => video
            $(this.keyframebar).on('jump-to-time', (e, time) => this.jumpToTimeAndPause(time));

            // controls => video
            this.$on('control-play-pause', 'click', (event) => {this.playPause()});
            this.$on('control-step-backward', 'click', (event) => {this.video.previousFrame()});
            this.$on('control-step-forward', 'click', (event) => {this.nextFrame()});
            this.$on('control-goto-start', 'click', () => this.jumpToTimeAndPause(0));
            this.$on('control-goto-end', 'click', () => this.jumpToTimeAndPause(this.video.duration + this.offset));
            this.$on('control-delete-keyframe', 'click', () => this.deleteSingleKeyframe());
            this.$on('control-delete-all-future-keyframes', 'click', () => this.deleteKeyframes());
            this.$on('control-start-tracker', 'click', () => this.runTrackerAll());
            this.$on('control-lock-unlock-object', 'click', () => this.lockUnlockAnnotation())

            // better key events => video
            // play/pause
            $(this).on('keydn-space            ', () => this.playPause());
            // rewind-play
            $(this).on('keydn-semicolon keydn-q', () => this.rewind());
            $(this).on('keyup-semicolon keyup-q', () => this.stopRewind());
            // step-play
            $(this).on('keydn-period    keydn-e', () => this.play());
            $(this).on('keyup-period    keyup-e', () => this.pause());
            // Delete keyframe
            $(this).on('keyup-delete           ', () => this.deleteKeyframes());
            // Delete single keyframe
            $(this).on('keyup-d'                , () => this.deleteSingleKeyframe());
            // Keyframe stepping
            $(this).on('keydn-g                ', () => this.stepforward());
            $(this).on('keydn-f                ', () => this.stepbackward());
            // Keyframe duplication
            $(this).on('keydn-r                ', () => this.duplicateKeyFrame());
            //run tracker
            $(this).on('keydn-t                ', () => this.runTrackerAll());
            //lock or unlock annotated object
            $(this).on('keydn-l keydnr-l              ', () => this.lockUnlockAnnotation());
            // video frame stepping - capture the repeat events with the 'r' handler
            $(this).on('keydn-a keydnr-a     ', () => {
                if (this.loading) {
                    return;
                }
                if (this.video.imgPlayer.isPlaying()) {
                    this.pause();
                }
                this.video.previousFrame();
            });
            $(this).on('keydn-s keydnr-s    ', () => {
                if (this.loading) {
                    return;
                }
                if (this.video.imgPlayer.isPlaying()) {
                    this.pause();
                }
                this.nextFrame();
            });
            $('#scale-checkbox').on('click', () => {
                this.scaleToFit = $('#scale-checkbox')[0].checked;
                if (!this.scaleToFit) {
                $(this.$paper.canvas).removeAttr(
                    'position'
                ).css({
                    position: 'absolute',
                });
                    this.$('video').css({
                        height: `100%`,
                        width : `100%`,
                        'flex-grow': 1
                    });
                }
                else {

                    $(this.$paper.canvas).removeAttr(
                        'position'
                    ).css({
                        position: 'relative',
                    });
                    this.$('video').css({
                        'flex-grow': 0
                    });
                }

                this.video.fit();
                this.sizeVideoFrame();
            });
            $('#labels').on('keydown', function(e) {
                // Taken from https://stackoverflow.com/questions/1227146/disable-keyboard-in-html-select-tag/1227352#1227352
                var ev = e ? e : window.event;
                if(ev)
                {
                    if(ev.preventDefault)
                       ev.preventDefault();
                    else
                      ev.returnValue = false;
                }
            });
            this.sizeVideoFrame();
            this.loading = false;
            this.video.fit();
            this.sizeVideoFrame();
        });
    }
    
    loadEditLabelModal(data) {
        var annotation = data.annotation;
        var type = annotation.type;
        $('select[name=edit-label]').find('option[value="' + type + '"]').prop('selected', true);
        $('#edit-label-modal').find('#change-label').data("annotation", annotation);
    }

     // Time control
    stepforward() {
        $(this).trigger('step-forward-keyframe');
    }

    stepbackward() {
        $(this).trigger('step-backward-keyframe');
    }

    nextFrame(){
        this.video.nextFrame();
    }

    play() {
        if(this.video.currentTime==this.offset+this.video.duration){
            this.jumpToTimeAndPause(1);
        };
        this.video.play();
        return false;
    }

    stop()
    {
        this.video.stop();
        return false;
    }

    pause() {
        this.video.pause();
        return false;
    }

    playPause() {
        if (this.video.paused) {
             return this.play();
        }
        else {
            return this.pause();
        }
    }

    jumpToTimeAndPause(time) {
        this.video.pause();
        this.video.currentTime = time;
    }

    stepTime(timeDelta) {
        this.video.currentTime = this.video.currentTime + timeDelta;
        return false;
    }

    rewindStep() {
        if (this.video.currentTime <= 0) {
            this.stopRewind();
        }
        else {
            this.video.rewindStep();
        }
    }

    rewind() {
        this.video.pause();
        clearInterval(this.rewindTimerId);
        this.rewindTimerId = setInterval(this.rewindStep.bind(this), 100);
        this.rewindStep();
        return false;
    }

    stopRewind() {
        clearInterval(this.rewindTimerId);
        return false;
    }

    runTrackerAll(){
        $('#tracker-btn').prop('disabled', true);
        $(this).trigger('trackAll');

    }

    deleteKeyframes() {
        $(this).trigger('annotator-delete-keyframes');
    }

    deleteSingleKeyframe() {
        $(this).trigger('annotator-delete-single-keyframe');
    }

    checkTimeRange() {

        var currentTime = this.$('control-time').val();
        var time = {
            closestTimeinRange: currentTime,
            violatesEndTime: false,
            violatesStartTime: false,
        };
        if (this.videoStart != null && currentTime < this.videoStart) {
            time.closestTimeinRange = this.videoStart;
        } else if (this.videoEnd != null && currentTime > this.videoEnd) {
            time.closestTimeinRange = this.videoEnd;
        }
        return time;
    }

    fixVideoTime(newTime) {
        if (newTime != null) {
            this.video.currentTime = newTime;
        }
        this.pause();
    }

    // Rect control

    metrics() {
        return {
            offset: $(this.$paper.canvas).offset(),
            original: {
                height: this.$paper.height,
                width: this.$paper.width,
            },
            scale: $(this.$paper.canvas).height() / this.$paper.height,
        };
    }

    makeAndAttachRect(KindOfRect) {
        var {classBaseName} = this;
        var rect = new KindOfRect({classBaseName});
        rect.attach(this.$paper, this.metrics.bind(this));

        // In case drag exceeds bounds of object, set it as the cursor of the
        // entire paper
        $(rect).on('change-cursor', (e, cursor) => {
            if (this.dragInProgress) return;
            this.$('paper').css({cursor});
        });

        // .. but don't change it if there's we're in the middle of a drag
        $(rect).on('drag-start', () => {
            this.dragInProgress = true;
        });
        $(rect).on('drag-end', () => {
            this.dragInProgress = false;
        });
        return rect;
    }


    addRect() {
        var rect = this.makeAndAttachRect(Rect);
        this.rects.push(rect);
        return rect;
    }

    deleteRect(rect) {
        if (rect == null) return false;

        for (let i = 0; i < this.rects.length; i++) {
            if (this.rects[i] === rect) {
                rect.detach();
                this.rects.splice(i, 1);
                return true;
            }
        }
        throw new Error("PlayerView.deleteRect: rect not found", rect);
    }

    togglePlayPauseIcon() {
        var btnIcon = $('.player-control-play-pause');
        if (this.video.paused) {
            btnIcon.addClass('fa-play');
            btnIcon.removeClass('fa-pause');
        }
        else {
            btnIcon.addClass('fa-pause');
            btnIcon.removeClass('fa-play');
        }
    }

    duplicateKeyFrame() {
        $(this).trigger('duplicate-keyframe');
    }

    lockUnlockAnnotation(){
        $(this).trigger('annotator-lock-unlock-object');
    }

    // UI getters and setters
    get controlTime() {
         return parseFloat(this.$('control-time').val());
    }

    get controlTimeUnfocused() {
        return this.controlTime;
    }

    set controlTimeUnfocused(value) {
        var timeRange = this.checkTimeRange();
        this.$('control-time:not(:focus)').val((value).toFixed(2));
        if (timeRange.violatesStartTime || timeRange.violatesEndTime) {
            this.fixVideoTime(timeRange.closestTimeinRange);
        }
    }

    get controlScrubber() {
        return parseFloat(this.$('control-scrubber').val()) / this.CONTROL_SCRUBBER_GRANULARITY * (this.video.duration) + this.offset;
    }

    get controlScrubberInactive() {
        return this.controlScrubber;
    }

    set controlScrubberInactive(value) {
        var timeRange = this.checkTimeRange();
        this.$('control-scrubber:not(:active)').val((value-this.offset) * this.CONTROL_SCRUBBER_GRANULARITY / this.video.duration);
        if (timeRange.violatesStartTime || timeRange.violatesEndTime) {
            this.fixVideoTime(timeRange.closestTimeinRange);
        }
    }


    // DOM/jQuery helpers

    $(extension) {
        return this.$container.find(this.classBaseName.add(extension).toSelector());
    }

    $on(extension, eventName, callback) {
        return this.$container.on(eventName, this.classBaseName.add(extension).toSelector(), callback);
    }
}

// Mix-in constants
Misc.mixinClassConstants(PlayerView, PlayerViewConstants);
void PlayerView;
