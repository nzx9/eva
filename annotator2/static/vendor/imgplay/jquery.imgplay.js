!function($) {
    $.imgplay = function(element, n) {
        var s = {
            name: "imgplay",
            rate: 1,
            controls: !0,
            pageSize: 5
        }
          , plugin = this
          , el = element
          , $el = $(element)
          , $canvas = null
          , screen = null
          , loadFrame  = !1
          , direction = "forward"
          , total = 0
          , index = 0
          , buffer = []
          , loadMore  = null
          , bufferLoading = []
          , drawnHeight = 0
          , drawnWidth = 0;
        plugin.settings = {},
        plugin.getTotalFrames = function() {
            return total
        }
        ,
        plugin.controls = {
            play: null,
            pause: null,
            stop: null,
            rewind: null,
            forward: null,
            previousFrame: null,
            nextFrame: null,
            fullscreen: null
        },
        plugin.getDrawnHeight = function() {
            return drawnHeight
        }
        ,
        plugin.getDrawnWidth = function() {
            return drawnWidth
        }
        ,
        plugin.frames = [],
        plugin.init = function() {
            plugin.settings = $.extend({}, s, n),
            plugin.settings.rate = plugin.settings.rate < .001 ? .001 : plugin.settings.rate,
            plugin.settings.rate = plugin.settings.rate > 100 ? 100 : plugin.settings.rate,
            $el.addClass("imgplay"),
            $canvas = $('<canvas class="imgplay-canvas">'),
            screen = $canvas.get(0).getContext("2d"),
            $el.append($canvas),
            w(),
            $el.find("img").each(function(element, n) {
                "" != $(n).prop("src") ? plugin.frames[element] = n : buffer[element] = n,
                total++
            }).detach(),
            $(window).resize(k),
            k()
        }
        ,
        plugin.isloadFrame  = function() {
            return loadFrame 
        }
        ,
        plugin.getCurrentFrame = function() {
            return index
        }
        ,
        plugin.play = function() {
            loadFrame  = !0,
            direction = "forward",
            drawFrame(),
            plugin.settings.controls && (plugin.controls.play.addClass("active"),
            plugin.controls.stop.removeClass("active"),
            plugin.controls.pause.removeClass("active"),
            plugin.controls.rewind.removeClass("active"),
            plugin.controls.forward.removeClass("active"))
        }
        ,
        plugin.pause = function() {
            loadFrame  = !1,
            null != loadMore  && clearTimeout(loadMore ),
            plugin.settings.controls && (plugin.controls.pause.addClass("active"),
            plugin.controls.play.removeClass("active"),
            plugin.controls.stop.removeClass("active"),
            plugin.controls.rewind.removeClass("active"),
            plugin.controls.forward.removeClass("active"))
        }
        ,
        plugin.stop = function() {
            loadFrame  = !1,
            index = 0,
            plugin.settings.controls && (plugin.controls.stop.addClass("active"),
            plugin.controls.play.removeClass("active"),
            plugin.controls.pause.removeClass("active"),
            plugin.controls.rewind.removeClass("active"),
            plugin.controls.forward.removeClass("active"))
        }
        ,
        plugin.rewind = function($) {
            var $ = parseInt($);
            $ > 0 && index >= $ && (direction = "backward",
            index -= $,
            drawFrame()),
            plugin.settings.controls && (plugin.controls.rewind.addClass("active"),
            plugin.controls.forward.removeClass("active"),
            plugin.controls.stop.removeClass("active"),
            plugin.controls.play.removeClass("active"),
            plugin.controls.pause.removeClass("active"))
        }
        ,
        plugin.forward = function($) {
            var $ = parseInt($);
            $ > 0 && total >= index + $ && (direction = "forward",
            index += $,
            drawFrame()),
            plugin.settings.controls && (plugin.controls.forward.addClass("active"),
            plugin.controls.rewind.removeClass("active"),
            plugin.controls.stop.removeClass("active"),
            plugin.controls.play.removeClass("active"),
            plugin.controls.pause.removeClass("active"))
        }
        ,
        plugin.fastRewind = function($) {
            var $ = parseInt($);
            $ > 0 && (direction = "backward",
            plugin.settings.rate = $),
            drawFrame()
        }
        ,
        plugin.fastForward = function($) {
            var $ = parseInt($);
            $ > 0 && (direction = "forward",
            plugin.settings.rate = $),
            drawFrame()
        }
        ,
        plugin.previous = function() {}
        ,
        plugin.next = function() {}
        ,
        plugin.previousFrame = function() {
            loadFrame  = !1,
            direction = "backward",
            index--,
            drawFrame()
        }
        ,
        plugin.nextFrame = function() {
            loadFrame  = !1,
            direction = "forward",
            index++,
            drawFrame()
        }
        ,
        plugin.toFrame = function($) {
            if ($ = $ < 0 ? 0 : $,
            plugin.frames[$])
                return index = $,
                drawFrame(),
                index > plugin.frames.length - plugin.settings.pageSize / 2 && loadMore (),
                jQuery.Deferred().resolve();
            for (plugin.settings.onLoading && plugin.settings.onLoading(!0),
            index = $,
            loadFrom = $ - .1 * plugin.settings.pageSize,
            loadFrom < 0 && (loadFrom = 0); plugin.frames[loadFrom]; )
                loadFrom++;
            return loadMore (loadFrom).then(function() {
                plugin.settings.onLoading && plugin.settings.onLoading(!1),
                index == $ && drawFrame()
            })
        }
        ,
        plugin.fullscreen = function($) {
            document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement ? (document.exitFullscreen ? document.exitFullscreen() : document.msExitFullscreen ? document.msExitFullscreen() : document.mozCancelFullScreen ? document.mozCancelFullScreen() : document.webkitExitFullscreen && document.webkitExitFullscreen(),
            plugin.settings.controls && plugin.controls.fullscreen.removeClass("active")) : (el.requestFullscreen ? el.requestFullscreen() : el.msRequestFullscreen ? el.msRequestFullscreen() : el.mozRequestFullScreen ? el.mozRequestFullScreen() : el.webkitRequestFullscreen && el.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT),
            plugin.settings.controls && plugin.controls.fullscreen.addClass("active")),
            setTimeout(function() {
                k()
            }, 2e3)
        }
        ;
        var w = function() {
            if (plugin.settings.controls && 0 == $el.find(".imgplay-controls").length) {
                var element = $('<div class="imgplay-controls"></div>')
                  , n = $('<div class="imgplay-progress">')
                  , s = $('<div class="imgplay-buttons">')
                  , el = $('<div class="imgplay-load-bar">')
                  , $canvas = $('<div class="imgplay-play-bar">')
                  , screen = $('<div class="imgplay-button imgplay-play"><$canvas class="material-icons">play_arrow</$canvas></div>')
                  , loadFrame  = $('<div class="imgplay-button imgplay-pause"><$canvas class="material-icons">pause</$canvas></div>')
                  , direction = $('<div class="imgplay-button imgplay-stop"><$canvas class="material-icons">stop</$canvas></div>')
                  , index = $('<div class="imgplay-button imgplay-previous-frame"><$canvas class="material-icons">skip_previous</$canvas></div>')
                  , buffer = $('<div class="imgplay-button imgplay-next-frame"><$canvas class="material-icons">skip_next</$canvas></div>')
                  , loadMore  = $('<div class="imgplay-button imgplay-fullscreen"><$canvas class="material-icons">fullscreen</$canvas></div>');
                screen.on("click", function() {
                    plugin.play()
                }),
                loadFrame .on("click", function() {
                    plugin.pause()
                }),
                direction.on("click", function() {
                    plugin.stop()
                }),
                index.on("click", function() {
                    plugin.previousFrame()
                }),
                buffer.on("click", function() {
                    plugin.nextFrame()
                }),
                loadMore .on("click", function() {
                    plugin.fullscreen()
                }),
                n.on("click", function(element) {
                    var n = $(this)
                      , s = element.pageX - n.offset().left
                      , el = n.width()
                      , $el = Math.floor(s / el * total);
                    plugin.toFrame($el)
                }),
                el.append($canvas),
                n.append(el),
                s.append([screen, loadFrame , index, direction, buffer, loadMore ]),
                element.append([n, s]),
                $el.append(element),
                plugin.controls.play = screen,
                plugin.controls.pause = loadFrame ,
                plugin.controls.stop = direction,
                plugin.controls.previousFrame = index,
                plugin.controls.nextFrame = buffer,
                plugin.controls.fullscreen = loadMore 
            }
        }
          , drawFrame = function() {
            if (null != screen) {
                var element = plugin.frames[index]
                  , n = $(element);
                if (element) {
                    if (n.prop("naturalHeight") > 0) {
                        var s = $canvas.width()
                          , el = $canvas.height()
                          , $el = element.width
                          , bufferLoading = element.height
                          , w = 0
                          , loadFrame  = 0;
                        $el >= bufferLoading ? (w = s,
                        loadFrame  = bufferLoading * (s / $el),
                        loadFrame  > el && (loadFrame  = el,
                        w = $el * (el / bufferLoading))) : (loadFrame  = el,
                        w = $el * (el / bufferLoading),
                        w > s && (w = s,
                        loadFrame  = bufferLoading * (s / $el))),
                        drawnHeight = loadFrame ,
                        drawnWidth = w,
                        screen.clearRect(0, 0, s, el),
                        plugin.settings.center ? screen.drawImage(element, (s - w) / 2, (el - loadFrame ) / 2, w, loadFrame ) : screen.drawImage(element, 0, 0, w, loadFrame )
                    }
                } else if (buffer.length && index < total) {
                    var k = loadFrame ;
                    return plugin.pause(),
                    k && plugin.settings.onLoading && plugin.settings.onLoading(!0),
                    void loadMore (index, k)
                }
                if (index < 0 || index > plugin.frames.length)
                    return void plugin.stop();
                loadFrame  && ("forward" == direction ? (index++,
                index > plugin.frames.length - plugin.settings.pageSize / 2 && loadMore ()) : index--,
                loadMore  = setTimeout(drawFrame, Math.ceil(1e3 / plugin.settings.rate))),
                b()
            }
        }
          , loadMore  = function($, element) {
            var n, s = void 0 != $ ? $ : index;
            if (buffer.length)
                for (var el = s; el < plugin.settings.pageSize + s && el < buffer.length; el++) {
                    var $el = loadFrame (el, element);
                    el == $ && (n = $el)
                }
            return n
        }
          , loadFrame  = function(element, n) {
            if (bufferLoading[element])
                return bufferLoading[element];
            var s = jQuery.Deferred();
            if (bufferLoading[element] = s,
            element < buffer.length) {
                var el = buffer[element]
                  , $el = $(el);
                $el.data("src") && ($el.prop("src", $el.data("src")),
                $el.on("load", function() {
                    plugin.frames[element] = el,
                    b(),
                    n && element == index + plugin.settings.pageSize / 2 && 0 == loadFrame  && (plugin.settings.onLoading && plugin.settings.onLoading(!1),
                    plugin.play()),
                    delete bufferLoading[element],
                    s.resolve()
                }))
            }
            return s
        }
          , b = function() {
            if (plugin.settings.controls) {
                var $ = plugin.frames.length / total * 100
                  , element = index / plugin.frames.length * 100;
                $ = $ > 100 ? 100 : $,
                element = element > 100 ? 100 : element,
                $el.find(".imgplay-load-bar").css("width", $ + "%"),
                $el.find(".imgplay-play-bar").css("width", element + "%")
            }
        }
          , k = function() {
            $canvas.prop({
                height: $el.height(),
                width: $el.width()
            }),
            drawFrame()
        };
        plugin.fitCanvas = function() {
            k()
        }
        ,
        plugin.init()
    }
    ,
    $.fn.imgplay = function(element) {
        return this.each(function() {
            if (void 0 == $(this).data("imgplay")) {
                var n = new $.imgplay(this,element);
                $(this).data("imgplay", n)
            }
        })
    }
}(jQuery);
