/*!
 * author:jieyou
 * contacts:baidu hi->youyo1122
 * see https://github.com/jieyou/lazyload
 */
;(function(factory){
    if(typeof define === 'function' && define.amd){ // AMD
        // you may need to change `define([------>'jquery'<------], factory)` 
        // if you use zepto, change it rely name, such as `define(['zepto'], factory)`
        // if your jquery|zepto lib is in other path, change it such as `define(['lib\jquery.min'], factory)`
        define(['jquery'], factory)
    }else{ // Global
        factory(jQuery || Zepto)
    }
})(function($ , undefined){
    var w = window,
        $window = $(w),
        defaultOptions = {
            threshold                   : 0,
            failure_limit               : 0,
            event                       : 'scroll',
            effect                      : 'show',
            effect_params               : null,
            container                   : w,
            data_attribute              : 'original',
            skip_invisible              : true,
            appear                      : emptyFn,
            load                        : emptyFn,
            vertical_only               : false,
            minimum_interval            : 300,
            use_minimum_interval_in_ios : false,
            url_rewriter_fn             : emptyFn,
            no_fake_img_loader          : false,
            placeholder_data_img        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC',
            // for IE6\7 that does not support data image
            placeholder_real_img        : 'http://ditu.baidu.cn/yyfm/lazyload/0.0.1/img/placeholder.png'
        },
        isIOS = (/(?:iphone|ipod|ipad).*os/gi).test(navigator.appVersion),
        isIOS5 = isIOS && (/(?:iphone|ipod|ipad).*os 5/gi).test(navigator.appVersion),
        type // function

    function emptyFn(){}

    type = (function(){
        var object_prototype_toString = Object.prototype.toString
        return function(obj){
            // todo: compare the speeds of replace string twice or replace a regExp
            return object_prototype_toString.call(obj).replace('[object ','').replace(']','')
        }
    })()

    function belowthefold($element, options){
        var fold
        if(options._$container == $window){
            fold = ('innerHeight' in w ? w.innerHeight : $window.height()) + $window.scrollTop()
        }else{
            fold = options._$container.offset().top + $(options.container).height()
        }
        return fold <= $element.offset().top - options.threshold
    }

    function rightoffold($element, options){
        var fold
        if(options._$container == $window){
            // Zepto do not support `$window.scrollLeft()` yet.
            fold = $window.width() + ($.fn.scrollLeft?$window.scrollLeft():w.pageXOffset)
        }else{
            fold = options._$container.offset().left + $(options.container).width()
        }
        return fold <= $element.offset().left - options.threshold
    }

    function abovethetop($element, options){
        var fold
        if(options._$container == $window){
            fold = $window.scrollTop()
        }else{
            fold = options._$container.offset().top
        }
        // console.log('abovethetop fold '+ fold)
        // console.log('abovethetop $element.height() '+ $element.height())
        return fold >= $element.offset().top + options.threshold  + $element.height()
    }

    function leftofbegin($element, options){
        var fold
        if(options._$container == $window){
            // Zepto do not support `$window.scrollLeft()` yet.
            fold = $.fn.scrollLeft?$window.scrollLeft():w.pageXOffset
        }else{
            fold = options._$container.offset().left
        }
        return fold >= $element.offset().left + options.threshold + $element.width()
    }

    function checkAppear($elements, options){
        var counter = 0
        $elements.each(function(i,e){
            var $element = $elements.eq(i)
            if(options.skip_invisible &&
            // Support zepto
             !($element.width() || $element.height()) && $element.css("display") !== "none"){
                return
            }
            function appear(){
                $element.trigger('_lazyload_appear')
                // if we found an image we'll load, reset the counter 
                counter = 0
            }
            // If vertical_only is set to true, only check the vertical to decide appear or not
            // In most situations, page can only scroll vertically, set vertical_only to true will improve performance
            if(options.vertical_only){
                if(abovethetop($element, options)){
                    // Nothing. 
                }else if(!belowthefold($element, options)){
                    appear()
                }else{
                    if(++counter > options.failure_limit){
                        return false
                    }
                }
            }else{
                if(abovethetop($element, options) || leftofbegin($element, options)){
                    // Nothing. 
                }else if(!belowthefold($element, options) && !rightoffold($element, options)){
                    appear()
                }else{
                    if(++counter > options.failure_limit){
                        return false
                    }
                }
            }
        })
    }

    // Remove image from array so it is not looped next time. 
    function getUnloadElements($elements){
        return $elements.filter(function(i,e){
            return !$elements.eq(i)._lazyload_loadStarted
        })
    }

    $.fn.lazyload = function(options){
        var $elements = this,
            $container,
            isScrollEvent,
            isScrollTypeEvent,
            scrollTimer = null,
            hasMinimumInterval

        if(!$.isPlainObject(options)){
            options = {}
        }

        // following params can be a string
        $.each(['threshold','failure_limit','minimum_interval'],function(i,e){
            if(type(options[e]) == 'String'){
                options[e] = parseInt(options[e],10)
            }
        })

        $.each(defaultOptions,function(k,v){
            if(defaultOptions.hasOwnProperty(k) && (!options.hasOwnProperty(k) || (type(options[k]) != type(defaultOptions[k])))){
                options[k] = v
            }
        })

        // Cache container as jQuery as object. 
        $container = options._$container = (!options.container || options.container == w) ? $window : $(options.container)
        delete options.container

        isScrollEvent = options.event == 'scroll'

        // isScrollTypeEvent. cantains custom scrollEvent . Such as 'scrollstart' & 'scrollstop'
        isScrollTypeEvent = isScrollEvent || options.event == 'scrollstart' || options.event == 'scrollstop'

        $elements.each(function(i,e){
            var element = this,
                $element = $elements.eq(i),
                placeholderSrc = $element.attr('src'),
                originalSrcInAttr = $element.attr('data-'+options.data_attribute), // `data-original` attribute value
                originalSrc = options.url_rewriter_fn == emptyFn?
                    originalSrcInAttr:
                    options.url_rewriter_fn.call(element,$element,originalSrcInAttr),
                isImg = $element.is('img')

            if($element._lazyload_loadStarted == true || placeholderSrc == originalSrc){
                $element._lazyload_loadStarted = true
                $elements = getUnloadElements($elements)
                return
            }

            $element._lazyload_loadStarted = false

            // If element is an img and no src attribute given, use placeholder. 
            if(isImg && !placeholderSrc){
                // For browsers that do not support data image.
                $element.one('error',function(){ // `on` -> `one` : IE6 triggered twice error event sometimes
                    $element.attr('src',options.placeholder_real_img)
                }).attr('src',options.placeholder_data_img)
            }
            
            // When appear is triggered load original image. 
            $element.one('_lazyload_appear',function(){
                var effectParamsIsArray = $.isArray(options.effect_params),
                    effectIsNotImmediacyShow
                function loadFunc(){
                    // In most situations, the effect is immediacy show, at this time there is no need to hide element first
                    // Hide this element may cause css reflow, call it as less as possible
                    if(effectIsNotImmediacyShow){
                        // todo: opacity:0 for fadeIn effect
                        $element.hide()
                    }
                    if(isImg){
                        $element.attr('src', originalSrc)
                    }else{
                        $element.css('background-image','url("' + originalSrc + '")')
                    }
                    if(effectIsNotImmediacyShow){
                        $element[options.effect].apply($element,effectParamsIsArray?options.effect_params:[])
                    }
                    $elements = getUnloadElements($elements)
                }
                if(!$element._lazyload_loadStarted){
                    effectIsNotImmediacyShow = (options.effect != 'show' && $.fn[options.effect] && (!options.effect_params || (effectParamsIsArray && options.effect_params.length == 0)))
                    if(options.appear != emptyFn){
                        options.appear.call(element, $elements.length, options)
                    }
                    $element._lazyload_loadStarted = true
                    if(options.no_fake_img_loader){
                        if(options.load != emptyFn){
                            $element.one('load',function(){
                                options.load.call(element, $elements.length, options)
                            })
                        }
                        loadFunc()
                    }else{
                        $('<img />').one('load', function(){ // `on` -> `one` : IE6 triggered twice load event sometimes
                            loadFunc()
                            if(options.load != emptyFn){
                                options.load.call(element, $elements.length, options)
                            }
                        }).attr('src',originalSrc)
                    }
                }
            })

            // When wanted event is triggered load original image 
            // by triggering appear.                              
            if (!isScrollTypeEvent){
                $element.on(options.event, function(){
                    if (!$element._lazyload_loadStarted){
                        $element.trigger('_lazyload_appear')
                    }
                })
            }
        })

        // Fire one scroll event per scroll. Not one scroll event per image. 
        if(isScrollTypeEvent){
            hasMinimumInterval = options.minimum_interval != 0
            $container.on(options.event, function(){
                // desktop and Android device triggered many times `scroll` event in once user scrolling
                if(isScrollEvent && hasMinimumInterval && (!isIOS || options.use_minimum_interval_in_ios)){
                    if(!scrollTimer){
                        scrollTimer = setTimeout(function(){
                            checkAppear($elements, options)
                            scrollTimer = null
                        },options.minimum_interval) // only check once in 300ms
                    }
                }else{
                    return checkAppear($elements, options)
                }
            })
        }

        // Check if something appears when window is resized. 
        // Force initial check if images should appear when window onload. 
        $window.on('resize load', function(){
            checkAppear($elements, options)
        })
              
        // With IOS5 force loading images when navigating with back button. 
        // Non optimal workaround. 
        if(isIOS5){
            $window.on('pageshow', function(e){
                if(e.originalEvent && e.originalEvent.persisted){
                    $elements.trigger('_lazyload_appear')
                }
            })
        }

        // Force initial check if images should appear. 
        $(function(){
            checkAppear($elements, options)
        })
        
        return this
    }
})