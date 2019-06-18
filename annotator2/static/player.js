"use strict";


class Player {
    constructor({$container, videoSrc, videoId, videoStart, videoEnd, isImageSequence,offset,videoChunkSize,videoIndex}) {

        this.$container = $container;

        this.videoId = videoId;

        this.selectedAnnotation = null;

        this.annotations = null;

        this.offset = offset;

        this.videoIndex = videoIndex;

        this.videoChunkSize = videoChunkSize;

        //will be the index positions of the dropdown list
        //if the labels change index then another label will be hidden/shown 
        //not really a problem because you can just press show or hide again
        this.hidden_types = [];

        this.annotationRectBindings = [];

        this.videoSrc = videoSrc;

        this.view = null;

        this.videoStart = videoStart;

        this.videoEnd = videoEnd;

        this.isImageSequence = isImageSequence;
        
        this.numTrackersRunning = 0;

        this.metrics = {
            playerStartTimes: Date.now(),
            annotationsStartTime: null,
            annotationsEndTime: null,
            browserAgent: navigator.userAgent
        };

        // Promises
        this.annotationsDataReady = Misc.CustomPromise();
        this.annotationsReady = Misc.CustomPromise();
        this.viewReady = Misc.CustomPromise();

        // We're ready when all the components are ready.
        this.ready = Misc.CustomPromiseAll(
            this.annotationsReady(),
            this.viewReady()
        );

        // Prevent adding new properties
        Misc.preventExtensions(this, Player);

        this.initAnnotations();
        this.initView();
        this.initHandlers();
    }


    // Init ALL the annotations!

    initView() {

        var {$container, videoSrc, videoStart, videoEnd,offset,videoChunkSize,videoIndex} = this;

        this.view = new PlayerView({$container, videoSrc, videoStart, videoEnd,offset,videoChunkSize,videoIndex});

        this.view.ready().then(this.viewReady.resolve);
    }

    initAnnotations() {
        DataSources.annotations.load(this.videoId).then((annotations) => {
            this.annotations = annotations;
            this.annotationsDataReady.resolve();
        });

        // When this.annotations is loaded AND view is ready for drawing...
        Promise.all([this.annotationsDataReady(), this.viewReady()]).then(() => {

            for (let annotation of this.annotations) {
                let rect = this.view.addRect();
                rect.fill = annotation.fill;
                rect.title = annotation.type;
                this.initBindAnnotationAndRect(annotation, rect);
                // Possible to run tracker in first frame in a new chunk
                if (annotation.keyframes.slice(-1)[0].time == this.view.video.currentTime) {
                    annotation.modified = true;
                }
            }
            $(this).triggerHandler('change-onscreen-annotations');
            $(this).triggerHandler('change-keyframes');

            this.annotationsReady.resolve();
        });
    }

    initBindAnnotationAndRect(annotation, rect) {

        // On PlayerView...
        this.annotationRectBindings.push({annotation, rect});

        // On Rect...
        $(rect).on('discrete-change', (e, bounds) => {
                annotation.updateKeyframe({
                time: this.view.video.currentTime,
                bounds: bounds,
            }, this.isImageSequence);
        });

        $(rect).on('select', () => {
            this.selectedAnnotation = annotation;
            $(this).triggerHandler('change-keyframes');
        });

        $(rect).on('drag-start', () => {
            this.view.video.pause();
        });

        $(rect).on('focus', () => {
            this.selectedAnnotation = annotation;
            $(this).triggerHandler('change-onscreen-annotations');
            $(this).triggerHandler('change-keyframes');
            $(this).triggerHandler('change-btn-txt');
        });

        $(rect).on('contextMenu-lock-unlock-object' , () =>  {
            $(this).triggerHandler('lock-unlock-object');
        });

        $(rect).on('contextMenu-delete-single-keyframe', () => {
            $(this).triggerHandler('delete-single-keyframe');
        });

        // On Annotation...
        $(annotation).on('change delete', () => {
            rect.appear({singlekeyframe: annotation.keyframes.length === 1});
        });
        $(annotation).triggerHandler('change');

        $(annotation).on('delete', () => {
            $(annotation).off();
            $(rect).off();
            this.view.deleteRect(rect);
        });
    }

    initHandlers() {
        // Drawing annotations
        $(this).on('change-onscreen-annotations', () => {
            this.drawOnscreenAnnotations();
        });

        $(this).on('change-keyframes', () => {
            this.drawKeyframes();
          });
          
        $(this).on('update-tracker-status', () => {
            this.updateTrackerStatus();
        })

        // Submitting
        $('#next-btn').click(this.submitAnnotationsAnchor.bind(this,1));
        $('#previous-btn').click(this.submitAnnotationsAnchor.bind(this,-1));
        $('#submit-btn').click(this.submitAnnotations.bind(this));

        //locking and unlocking object
        $(this).on('lock-unlock-object', () => {
            var currentFrameTime = this.view.video.currentTime;
            if (this.selectedAnnotation == null) return false;
            //If object is locked unlock it
            else if(this.selectedAnnotation.lockObject){
                this.selectedAnnotation.lockObject = false;
                for (let {annotation, rect} of this.annotationRectBindings) {
                    if( annotation == this.selectedAnnotation){
                        rect.unlock();
                    }
                }
             }else{//object is unlocked lock it
                this.selectedAnnotation.lockObject = true;
                for (let {annotation, rect} of this.annotationRectBindings) {
                if( annotation == this.selectedAnnotation){
                        rect.lock();
                    }
                }
             }
             $(this).triggerHandler('change-btn-txt');
         });

        $(this).on('change-btn-txt', () => {
           if (this.selectedAnnotation == null)
                return false;
           //If object is locked , change button txt to unlock
           if(this.selectedAnnotation.lockObject){
               $('#lock-unlock-btn').text('Unlock');
               $('#lock-unlock-btn').attr('title', "Unlock object for tracking (shortcut - ' L ')")
                                     .tooltip('fixTitle').tooltip('hide');
             }
           //If object is unlocked , change button txt to lock
           if (!this.selectedAnnotation.lockObject){
               $('#lock-unlock-btn').text('Lock');
               $('#lock-unlock-btn').attr('title',"Lock object for tracking (shortcut - ' L ')")
                                    .tooltip('fixTitle').tooltip('hide');
            }
        });


         $(this).on('delete-keyframes', () => {
                this.view.video.pause();
                this.deleteSelectedKeyframe();
                $(this).triggerHandler('change-onscreen-annotations');
                $(this).triggerHandler('change-keyframes');
         });
         $(this).on('delete-single-keyframe', () => {
                this.view.video.pause();
                this.deleteSingleSelectedKeyframe();
                $(this).triggerHandler('change-onscreen-annotations');
                $(this).triggerHandler('change-keyframes');
          });



        // On drawing changed
        this.viewReady().then(() => {
            $(this.view.creationRect).on('drag-start', () => {
                this.view.video.pause();
            });

            $(this.view).on('trackAll', () => {
                var trackersDone = [];
                this.annotationRectBindings.forEach(function (binding) {
                    trackersDone.push(this.runTracker(binding.annotation));
                }, this);
                $.when.apply($, trackersDone).then(function(){
                    $("#tracker-btn").prop("disabled", false);
                })
            });

            $(this.view.creationRect).on('focus', () => {
                this.selectedAnnotation = null;
                $(this).triggerHandler('change-onscreen-annotations');
                $(this).triggerHandler('change-keyframes');
            });

            this.view.video.onTimeUpdate(() => {
                $(this).triggerHandler('change-onscreen-annotations');
                this.annotationRectBindings.forEach(function (binding) {
                    binding.annotation.modified = false;
                });
            });

            $(this.view).on('create-rect', (e, rect) => {
                this.addAnnotationAtCurrentTimeFromRect(rect);
                rect.focus();
                $(this).triggerHandler('change-keyframes');
            });



            $(this.view).on('step-forward-keyframe', () => {
                var time = this.view.video.currentTime;
                if (!this.selectedAnnotation || !this.selectedAnnotation.keyframes)
                    return;
                for (let [i, kf] of this.selectedAnnotation.keyframes.entries()) {
                    if (Math.abs(time - kf.time) < this.selectedAnnotation.SAME_FRAME_THRESHOLD) {
                        if (i != this.selectedAnnotation.keyframes.length - 1) {
                            var nf = this.selectedAnnotation.keyframes[i + 1];
                            this.view.video.currentTime = nf.time;
                            break;
                        }
                    }
                }
            });

            $(this.view).on('step-backward-keyframe', () => {
                var time = this.view.video.currentTime;
                var selected = this.selectedAnnotation;
                if (!this.selectedAnnotation || !this.selectedAnnotation.keyframes)
                    return;
                for (let [i, kf] of this.selectedAnnotation.keyframes.entries()) {
                    if (Math.abs(time - kf.time) < this.selectedAnnotation.SAME_FRAME_THRESHOLD) {
                        if (i !== 0) {
                            var nf = this.selectedAnnotation.keyframes[i - 1];
                            this.view.video.currentTime = nf.time;
                            break;
                        }
                    }
                }
            });

            $(this.view).on('duplicate-keyframe', () => {
                var time = this.view.video.currentTime;

                if (!this.selectedAnnotation || !this.selectedAnnotation.keyframes) {
                    return;
                }
                var previousKeyFrame;
                for (let [i, kf] of this.selectedAnnotation.keyframes.entries()) {
                    if (Math.abs(kf.time - time) < this.selectedAnnotation.SAME_FRAME_THRESHOLD) {
                        return;
                    } else if (kf.time > time) {
                        break;
                    }
                    previousKeyFrame = kf;
                }
                this.selectedAnnotation.updateKeyframe({time:time, bounds:previousKeyFrame.bounds}, this.isImageSequence);
                $(this).triggerHandler('change-onscreen-annotations');
                $(this).triggerHandler('change-keyframes');
            });

            $(this.view).on('annotator-lock-unlock-object', () => {
                $(this).triggerHandler('lock-unlock-object');
            });

            $(this.view).on('annotator-delete-single-keyframe', () => {
                $(this).triggerHandler('delete-single-keyframe');
            });

            $(this.view).on('annotator-delete-keyframes', () => {
                $(this).triggerHandler('delete-keyframes');
            });


            // Edit Annotation

            $('#change-label').on('click', (e) => {
                var annotation = $(e.currentTarget).data('annotation');
                var newLabel = $('#edit-label option:selected').val();
                annotation.changeAnnotationLabel(newLabel);
                $(this).triggerHandler('change-onscreen-annotations');
                $(this).triggerHandler('change-keyframes');
                $('#edit-label-modal').modal('toggle');
            });
        });
    }

    //validation helper functions
    checkIfObjectIsLocked(){
        if(this.selectedAnnotation.lockObject){
            $("#display-status").text('Unlock the selected object');
            setTimeout(function () {
            $("#display-status").html('&nbsp;');
            }, 2000);
            return true;
        }
        return false
    }

    // Draw something

    drawOnscreenAnnotations() {
        //hack to stop drawing the annotation when we are with frame player
        if (this.view.video.currentTime-this.offset >= this.view.video.duration) {
            this.view.video.pause();
        }
         for (let {annotation, rect} of this.annotationRectBindings) {
            this.drawAnnotationOnRect(annotation, rect);
        }
    }

    drawKeyframes() {
        this.view.keyframebar.resetWithDuration(this.view.video.duration);
        for (let annotation of this.annotations) {
            for (let keyframe of annotation.keyframes) {
                if(this.offset-1 < keyframe.time && keyframe.time < this.videoChunkSize+this.offset){
                    let selected = (annotation == this.selectedAnnotation);
                    this.view.keyframebar.addKeyframeAt(keyframe.time-this.offset, {selected});
                }
            }
        }
    }

    drawAnnotationOnRect(annotation, rect) {
        if (this.metrics.annotationsStartTime == null) {
            this.metrics.annotationsStartTime = Date.now();
            // force the keyboard shortcuts to work within an iframe
            window.focus();
        }

        var frameNo = this.view.video.currentTime;

        var {bounds, prevIndex, nextIndex, closestIndex, continueInterpolation, state} = annotation.getFrameAtTime(frameNo, this.isImageSequence);
        /* singlekeyframe determines whether we show or hide the object
         we want to hide if:
            - the very first frame object is in the future (nextIndex == 0 && closestIndex is null)
            - we're after the last frame and that last frame was marked as continueInterpolation false */
        rect.appear({
            real: closestIndex != null,
            selected: this.selectedAnnotation === annotation && !rect.locked,
            singlekeyframe: continueInterpolation && !(nextIndex == 0 && closestIndex === null)
        });

        // Don't mess up our drag
        if (rect.isBeingDragged()) return;
        rect.bounds = bounds;
    }

    // Actions
    submitAnnotations(e) {
        e.preventDefault();
        this.metrics.annotationsEndTime = Date.now();
        if (this.metrics.annotationsStartTime == null) {
            this.metrics.annotationsStartTime = this.metrics.annotationsEndTime;
        }
        if (this.annotations.length === 0 && !confirm('Confirm that there are no objects in the video?')) {
            return;
        }
        DataSources.annotations.save(this.videoId, this.annotations, this.metrics).then((response) => {
           $("#display-status").text('saved successfully!');
            setTimeout(function () {
                $("#display-status").html('&nbsp;');
            }, 2000);

        });
    }

    // Actions
    submitAnnotationsAnchor(nextOrBack) {
        var this_=this
        this.metrics.annotationsEndTime = Date.now();
        if (this.metrics.annotationsStartTime == null) {
            this.metrics.annotationsStartTime = this.metrics.annotationsEndTime;
        }
        DataSources.annotations.save(this.videoId, this.annotations, this.metrics).then((response) => {
            location ="../"+Math.round(nextOrBack+((Math.round(this_.videoIndex))));
        });
    }

    showModal(title, message) {
        $('#genericModalTitle')[0].innerText = title;
        $('#genericModalMessage')[0].innerText = message;
        $('#genericModal').modal();
    }

    runTracker(annotation) {
        let trackerDone = $.Deferred();
        
        if (annotation.lockObject || !annotation.modified) {
            return trackerDone.resolve();
        }
      
        var frameNo = this.view.video.currentTime;
        var {bounds, closestIndex} = annotation.getFrameAtTime(frameNo, this.isImageSequence);
        
        if (closestIndex != null) {
            $.post("/tracker/" + this.videoId + "/",
                  { x: bounds.xMin,
                    y: bounds.yMin,
                    w: bounds.xMax - bounds.xMin,
                    h: bounds.yMax - bounds.yMin,
                    t: frameNo,
                  }
            ).done((input) => {
              if (input.status == 'ok') {
                this.numTrackersRunning += 1;

                $(this).triggerHandler('update-tracker-status');
                setTimeout(function(annotation, taskId){ 
                  this.getTrackerResult(annotation, taskId, trackerDone) 
                }.bind(this, annotation, input.task_id, trackerDone), 500);
              } else {
                $("#tracker-status").text('Tracker error')
                trackerDone.reject();
              }
            });
        } else {
            trackerDone.resolve();
        }
        
        return trackerDone;
    }
    
    getTrackerResult(annotation, taskId, trackerDone) {
        $.get("/tracker/get_results/", {task_id: taskId})
         .done((resp) => {
            if (resp.finish) {
                this.numTrackersRunning -= 1;
                
                var firstSkipFlag = true;
                for (var key in resp.results) {
                    if (resp.results.hasOwnProperty(key)) {
                        if (firstSkipFlag){
                            firstSkipFlag = false;
                            continue;
                        }
                        let data = resp.results[key];
                        let bounds = {
                            xMin : Number(data[0]),
                            yMin : Number(data[1]),
                            xMax : (Number(data[2]) + Number(data[0])),
                            yMax : (Number(data[1]) + Number(data[3]))
                        }
                        annotation.updateKeyframe({
                            time: parseInt(key),
                            bounds: bounds
                        }, true);
                    }
                }
                annotation.modified = false;
                $(this).triggerHandler('update-tracker-status');
                $(this).triggerHandler('change-onscreen-annotations');
                $(this).triggerHandler('change-keyframes');
                trackerDone.resolve();
            } else {
                 setTimeout(function(annotation, taskId) { 
                   this.getTrackerResult(annotation, taskId, trackerDone) 
                 }.bind(this, annotation, taskId, trackerDone), 500);
            }
        });
    }
    
    updateTrackerStatus() {
        if (this.numTrackersRunning > 0) {
            $('#display-status').text('Trackers running: ' + this.numTrackersRunning)
        } else {
            $('#display-status').html('&nbsp;');
        }
    }
    
    addAnnotationAtCurrentTimeFromRect(rect) {
        var annotation = Annotation.newFromCreationRect(this.isImageSequence);
        annotation.updateKeyframe({
            time: this.view.video.currentTime,
            bounds: rect.bounds
        }, this.isImageSequence);
        this.annotations.push(annotation);
        rect.fill = annotation.fill;
        rect.title = annotation.type;
        this.initBindAnnotationAndRect(annotation, rect);
    }
    
    deleteAnnotation(annotation) {
        if (annotation == null) return false;

        if (annotation == this.selectedAnnotation) {
            this.selectedAnnotation = null;
        }


        for (let i = 0; i < this.annotations.length; i++) {
            if (this.annotations[i] === annotation) {
                annotation.delete();
                this.annotations.splice(i, 1);
                this.annotationRectBindings.splice(i, 1);
                return true;
            }
        }
        throw new Error("Player.deleteAnnotation: annotation not found");
    }

    deleteSelectedKeyframe() {
        if (this.selectedAnnotation == null) return false;
        if (this.checkIfObjectIsLocked()) return false;

        this.selectedAnnotation.deleteKeyframeAtTimeAndFuture(
            this.view.video.currentTime, this.isImageSequence);
        if (this.selectedAnnotation.keyframes.length === 0) {
            this.deleteAnnotation(this.selectedAnnotation);
        }
        return true;
    }
    deleteSingleSelectedKeyframe() {
        if (this.selectedAnnotation == null) return false;
        if (this.checkIfObjectIsLocked()) return false;
        
        this.selectedAnnotation.deleteKeyframeAtTime(
            this.view.video.currentTime, this.isImageSequence);
        if (this.selectedAnnotation.keyframes.length === 0) {
            this.deleteAnnotation(this.selectedAnnotation);
        }
        return true;
    }
}

void Player;
