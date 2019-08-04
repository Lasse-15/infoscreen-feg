function symmetricDifference(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    for (i = 0; i < a2.length; i++) {
        if (a1.indexOf(a2[i]) === -1) {
            result.push(a2[i]);
        }
    }
    return result;
}

var connectionTimeoutId;

$(function () {
    if (!flux.browser.supportsTransitions)
        alert("Flux Slider requires a browser that supports CSS3 transitions");

    window.f = new flux.slider('#slider', {
        controls: false,
        captions: false,
        autoplay: false,
        pagination: false,
        width: $(window).width(),
        height: $(window).height(),
    });

    $(window).resize(function () {
        if (this.resizeTO) clearTimeout(this.resizeTO);
        this.resizeTO = setTimeout(function () {
            $(this).trigger('windowResize');
        }, 250);
    });

    $(window).on('windowResize', function () {
        window.f.setSize($(window).width(), $(window).height());
    });

    updateTimeout();
});

var layer = 0;
var flvPlayer;
var doNext = false;
/** bundleData
 * @see data/default/bundle.json
 *
 **/
var bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};
var serverOptions = {};
var streamStarted = false;


/***************************
 *  window load, init
 * **************************/

$(function () {
    fixImageSizes();
    displayTime();
    setInterval(displayTime, 1000);
});

$(window).bind("resize", function () {
    fixImageSizes();
});


function getLayer(offset) {
    if (offset === undefined) offset = 0;
    return "layer" + (layer + offset) % 2;
}

// socketio callbacks
/** when connected **/
socket.on('connect', function () {
    socket.emit("sync");
    doNext = true;
});

socket.on('callback.blackout', function (data) {
    serverOptions = data.serverOptions;
    checkBlackout();
});

socket.on('error', function () {
    $("#networkstatus").css("opacity", 1);
});

socket.on('disconnect', function () {
    $("#networkstatus").css("opacity", 1);
});

socket.on('pong', function () {
    updateTimeout();
});

socket.on('callback.time', function (data) {
    serverOptions.displayTime = data;
    checkTimeDisplay();
});

/** callback Load **/
socket.on('callback.load', function (data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    preloadImages(data.slides);
    checkBlackout();
    setTimeout(function () {
        setBackground(data.bundleData.background);
        if (checkStream(serverOptions) === false) {
            nextSlide(data);
        }
    }, 1000);

});


/** callback Update **/
socket.on('callback.update', function (data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    checkBlackout();
    if (checkStream(serverOptions) === false) {
        nextSlide(data);
    }
});

socket.on('callback.removeSlide', function (data) {
    window.f.clearImageById(data.uuid);
});

socket.on('callback.reload', function () {
    location.reload(true);
});

socket.on('callback.reloadImage', function (data) {
    reloadImage(data);
});

socket.on('callback.announce', function (data) {
    checkBlackout();
    nextSlide(data);

});

socket.on('callback.forceSlide', function (data) {
    checkBlackout();
    nextSlide(data);
});

/**
 * Displays the local time for bottom of screen
 * hh:mm
 **/
function displayTime() {
    var date = new Date();
    var min = date.getMinutes();
    if (min < 10) min = "0" + min;
    var time = date.getHours() + ":" + min;
    $('#time').html(time);
}

/** resize canvas to max width keeping aspect ratio 16:9**/
function fixImageSizes() {
    var con = $(window),
        aspect = (0.9 / 1.6),
        width = con.innerWidth(),
        height = Math.floor(width * aspect);
}

function checkTimeDisplay() {
    var bool = serverOptions.displayTime;

    if (serverOptions.currentMeta.displayTime !== null) {
        bool = serverOptions.currentMeta.displayTime;
    }

    if (bool) {
        $('#time').removeClass('flipOutX').addClass("flipInX");
    } else {
        $('#time').addClass('flipOutX').removeClass("flipInX");
    }

}

function checkBlackout() {
    updateTimeout();
    if (serverOptions.blackout) {
        $("#blackoutLayer").css("opacity", 1);
    } else {
        $("#blackoutLayer").css("opacity", 0);
    }
}

function nextSlide(data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    checkTimeDisplay();

    if (serverOptions.isAnnounce) {
        $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
        $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
        setTimeout(function () {
            clearIFrame(getWebLayer());
            clearIFrame(getWebLayer(1));
        }, 2500);
        try {
            var randomId = uuidv4();
            getDataUri("/tmp/" + serverOptions.displayId + "/?randomId=" + randomId, randomId, function (imageId, dataUrl, image) {
                image.id = imageId;
                image.class = "temp";
                window.f.images.push(image);
                window.f.imageData.push(dataUrl);
                $("#slider").show();
                $("#helperLayer").addClass("announce");
                window.f.showTempImage(imageId);
            });
        } catch (err) {
            console.log(err);
        }
    } else {
        $("#helperLayer").removeClass("announce");
        switch (serverOptions.currentMeta.type) {
            case "webpage":
                $("#slider").hide();
                $("#" + getWebLayer()).css("transform", "scale(" + serverOptions.currentMeta.zoom + ")");
                $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");

                displayWebPage(serverOptions.currentMeta.webUrl);
                break;
            default:
                var transition = serverOptions.transition;
                if (serverOptions.currentMeta.transition !== null) {
                    transition = serverOptions.currentMeta.transition;
                }

                $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn").contents().empty();
                $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn").contents().empty();
                setTimeout(function () {
                    clearIFrame(getWebLayer());
                    clearIFrame(getWebLayer(1));
                }, 2500);

//                $("#slider").show();
                window.f.showImageById(serverOptions.currentFile, transition);
                break;
        }
    }

    setBackground(bundleData.background);
}

function setBackground(background) {
    background = "/background/" + background;
    if (serverOptions.isStreaming) return;

    var video = document.getElementById("bgvid");
    var bg = $("#bg");
    var bgImage = document.getElementById("bgimg");
    if (background.indexOf(".mp4") !== -1) {

        if (parseUrl(video.src) !== background) {
            bg.fadeOut();
            video.src = background;
            video.load();
            video.play();
            $(video).show();
        }
    } else {
        if (parseUrl(bgImage.src) !== background) {
            bgImage.src = background;
            bg.fadeIn();
            // unload video
            video.pause();
            video.removeAttribute("src");
            video.load();
            $(video).hide();
        }
    }
}

function parseUrl(url) {
    return '/background' + url.split('background')[1]
}

function showBackgroundOnly() {
    $("#" + getLayer(1)).css("opacity", 0);
    $("#" + getLayer()).css("opacity", 0);
}

function checkStream(serverOptions) {
    if (serverOptions.isStreaming && streamStarted === false) {
        if (flvjs.isSupported()) {
            var videoElement = document.getElementById('bgvid');
            flvPlayer = flvjs.createPlayer({
                type: 'flv',
                url: serverOptions.streamSource
            });
            try {
                flvPlayer.attachMediaElement(videoElement);
                flvPlayer.volume = videoVolume;
                flvPlayer.load();
                flvPlayer.play();
                showBackgroundOnly();
                streamStarted = true;
                return true;
            } catch (err) {
                console.log(err);
                streamStarted = false;
                return false;
            }
        }
    } else if (serverOptions.isStreaming === false) {
        if (typeof flvPlayer !== "undefined") {
            if (flvPlayer != null) {
                flvPlayer.pause();
                flvPlayer.unload();
                flvPlayer.detachMediaElement();
                flvPlayer.destroy();
                flvPlayer = null;
                streamStarted = false;
            }
            return false;
        }
        return false;
    }
    return false;
}

/**
 * preload images
 * @param allSlides
 */
function preloadImages(allSlides) {
    window.f.clearImages();
    for (var i in allSlides) {
        try {
            if (allSlides[i].type === "slide") {
                getDataUri("/render/" + serverOptions.currentBundle + "/" + allSlides[i].uuid + ".png", allSlides[i].uuid, function (imageId, imageData, image) {
                    image.id = imageId;
                    window.f.images.push(image);
                    window.f.imageData.push(imageData);
                });
            }
        } catch (err) {
            console.log(err);
        }
    }
}

function reloadImage(data) {
    if (serverOptions.currentBundle === data.bundleName) {
        getDataUri("/render/" + data.bundleName + "/" + data.uuid + ".png?" + uuidv4(), data.uuid, function (imageId, imageData, image) {
            var found = false;
            for (var i in window.f.images) {
                if (window.f.images[i].id === data.uuid) {
                    window.f.imageData[i] = imageData;
                    found = true;
                }
            }
            if (!found) {
                console.log("notfound, adding!");
                image.id = imageId;
                window.f.images.push(image);
                window.f.imageData.push(imageData);
            }
        });
    }
}

var fluxIds;
var allIds;

function checkImages(allSlides) {
    fluxIds = [];
    allIds = [];

    var fImages = window.f.images;
    for (var j in fImages) {
        fluxIds.push(fImages[j].id);
    }
    for (var k in allSlides) {
        if (allSlides[k].type === "slide") {
            allIds.push(allSlides[k].uuid);
        }
    }

    // new slides count is less than slides in rotation
    // remove slides
    if (allIds.length < fluxIds.length) {
        var diffIds = symmetricDifference(fluxIds, allIds);
        for (var l in diffIds) {
            window.f.clearImageById(diffIds[l]);
        }
    } else
    // else count is greater, so add slides
    {
        for (var i in allIds) {
            try {
                if (fluxIds.indexOf(allIds[i]) < 0) {
                    getDataUri("/render/" + serverOptions.currentBundle + "/" + allIds[i] + ".png", allIds[i], function (imageId, imageData, image) {
                        image.id = imageId;
                        window.f.images.push(image);
                        window.f.imageData.push(imageData);
                    });
                    return true;
                }
            } catch (err) {
                console.log(err);
                return false;
            }
        }
    }
    return false;
}

/** Generate an uuid
 * @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function updateTimeout() {
    clearTimeout(connectionTimeoutId);
    $("#networkstatus").css("opacity", 0);
    connectionTimeoutId = setTimeout(function () {
        $("#networkstatus").css("opacity", 1);
    }, 30000)
}


function displayWebPage(url) {
    $("#" + getWebLayer()).attr('src', url).addClass("fadeIn").removeClass("fadeOut");
    $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
    layer++;
    if (layer > 1) {
        layer = 0;
    }
}

function getWebLayer(offset) {
    if (offset === undefined) offset = 0;
    return "webLayer" + (layer + offset) % 2;
}

function clearIFrame(id) {
    if ($('#' + id).attr('src') !== "/empty") {
        $('#' + id).attr('src', '/empty');
    }
}


function getDataUri(url, imageId, callback) {
    var image = new Image();
    image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
        canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

        canvas.getContext('2d').drawImage(this, 0, 0);
        callback(imageId, canvas.toDataURL('image/png'), {src: url});
    };
    image.src = url;
}
