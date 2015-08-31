/*!
 * author:jieyou
 * see https://github.com/jieyou/lazyload
 * part of the code fork from tuupola's https://github.com/tuupola/jquery_lazyload
 */
;(function(factory){
    if(typeof define === 'function' && define.amd){ // AMD
        // you may need to change `define([------>'jquery'<------], factory)` 
        // if you use zepto, change it rely name, such as `define(['zepto'], factory)`
        // if your jquery|zepto lib is in other path, change it such as `define(['lib\jquery.min'], factory)`
        define(['jquery'], factory)
    }else{ // Global
        factory(window.jQuery || window.Zepto)
    }
})(function($,undefined){
    var w = window,
        $window = $(w),
        defaultOptions = {
            // 默认情况下，图像会在出现在屏幕上时被加载。如果你想的图像更早地加载，
            // 可以使用threshold参数。设置threshold为200，将导致图像在它离视窗边缘还有200px时开始加载。
            threshold                   : 0,
            // 在页面滚动后，该插件将所有未加载的图像循环一遍。并在循环检查图像是否在视窗中。默认情况下，
            // 发现第一个位于视窗外的图片时，循环停止。这是基于以下的假设：页面上图像的顺序与它们在HTML代码中的顺序是一致的。
            // 然而对于某些布局，这可能是错误的。你可以通过设置failure_limit参数来控制循环终止的行为（failure_limit参数的数值为最多允许多少张图片被检查出位于视窗外后停止检查循环中剩余未检查的图片）。
            failure_limit               : 0,
            // 指定触发什么事件时，开始加载真实的图片。你可以使用jQuery中已有的事件，如click或mouseover。
            // 你也可以使用自定义的事件如sporty或foobar。当事件是`scroll`或类似事件类型时，还需要检查图像是否已出现在视窗中。
            event                       : 'scroll',
            // 默认情况下插件在等待图片完全加载后调用show()。你可以使用想要的任何效果。下面的代码使用了fadeIn效果。你可以在demo页面中查看该效果。
            effect                      : 'show',
            // 上述效果（`effect`）函数的参数数组。举两个例子，如果`effect`参数设置为`show`且`effect_params`参数设置为[400]，将会调用`$element.show(400)`，
            // 即在400ms后显示图片；如果`effect`参数设置为`fadein`且`effect_params`参数设置为[400,completeFunction]，将会调用`fadein(400,completeFunction)`，即在400ms内渐入显示图片，并在渐入动画完成时调用`completeFunction`。
            effect_params               : null,
            // 你可以将改插件运用在某个容器内，如一个有滚动条的div。只需要传递容器的jQuery对象。我们有在纵向和横向滚动的容器中使用插件的两个demo。
            container                   : w,
            // 默认情况下，图片的真实url被设置在`data-original`属性内，你可以通过修改下面这个值来改变这个属性名
            //（如`url`，这样插件将在`data-url`属性中查找图片的真实地址）注意下面这个值是不用包含`data-`头的。
            data_attribute              : 'original',
            // 当你将图片懒加载技术与`srcset`一起使用时，你不能将`srcset`的值直接写在`srcset`内，否则会导致图片立即加载。
            // 默认情况下，你应该写在属性`data-original-srcset`内，这样lazyload插件会帮你在合适的时候将它的赋值到`srcset`上。
            // 你可以通过修改下面这个值来改变这个属性名。注意下面这个值是不用包含`data-`头的。
            // http://www.webkit.org/demos/srcset/
            data_srcset_attribute       : 'original-srcset',
            // 由于display:none时，jQuery/Zepto中的$(selector).offset().top/left属性始终为0，(http://bugs.jquery.com/ticket/3037)
            // 因此该属性为false并且图片一开始display:none时，由于无法得到该标签距离文档顶部的实际像素数，
            // 图片在一开始就会被加载上来，违背了lazyload的初衷。因此该版本中删掉了该属性。
            // lazyload不会去管display:none的图片，可能会出现当将display:none改变为其它值，图片仍然没有被加载的情况，
            // 但是只要滑动滚轮触发scroll或event中设定的事件，图片还是可以被加载出来的，remove_invisible.html展示了这一场景
            //skip_invisible              : true,
            // 当图片在视窗中出现时回调。`this`指向出现的图片元素的节点，参数为尚未出现的图片的数量和配置参数对象。
            appear                      : emptyFn,
            // 当图片加载完毕时回调。`this`指向出现的图片元素的节点，参数为尚未出现的图片的数量和配置参数对象。
            load                        : emptyFn,
            // 在大多数情况下，页面只能纵向滚动。此时，只需要检查图片的竖直位置是否出现在视图中即可。如果这样做能提高性能。
            // 你可以在只能纵向滚动的页面中将`vertical_only`参数设置为true
            vertical_only               : false,
            // 在参数`event`设置为`scroll`的情况下，除了iOS以外的设备，用户一次滚屏会触发多次scroll事件，
            // 而实际上我们无需在每一次scroll事件中检查图片是否已经出现在视窗中，通过这个参数设置两次检查之间最少的间隔时间，
            // 用来提高性能。当设置为0时，则为没有最少间隔时间，每一次scroll事件触发时都检测
            minimum_interval            : 300,
            // 和上面那个参数相关，iOS设备上，用户一次滚屏只会触发一次scroll事件，于是没有必要规定最小的检查之间的间隔。
            // 设置为false将忽略上面的检查间隔参数`minimum_interval`，设置为true则会处理上面的间隔参数
            use_minimum_interval_in_ios : false,
            // 重写图片的原始url。回调函数中，`this`指向出现的图片元素的节点，参数第一项为当前元素的jQuery|Zepto对象，第二项为当前元素的图片的原始url
            url_rewriter_fn             : emptyFn,
            // 不使用假图片预加载（详见上面“高级”中的“不使用假图片预加载”）
            no_fake_img_loader          : false,
            // 如果一个img元素没有指定src属性，我们使用这个placeholder。
            // https://css-tricks.com/data-uris/
            placeholder_data_img        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC',
            // for IE6\7 that does not support data image
            placeholder_real_img        : 'http://ditu.baidu.cn/yyfm/lazyload/0.0.1/img/placeholder.png'
            // todo : 将某些属性用global来配置，而不是每次在$(selector).lazyload({})内配置
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
            fold = options._$container.offset().top + options._$container.height()
        }
        return fold <= $element.offset().top - options.threshold
    }

    function rightoffold($element, options){
        var fold
        if(options._$container == $window){
            // Zepto do not support `$window.scrollLeft()` yet.
            fold = $window.width() + ($.fn.scrollLeft?$window.scrollLeft():w.pageXOffset)
        }else{
            fold = options._$container.offset().left + options._$container.width()
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
            if(($element.width() <= 0 && $element.height() <= 0) || $element.css('display') === 'none'){
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

    if(!$.fn.hasOwnProperty('lazyload')){

        $.fn.lazyload = function(options){
            var $elements = this,
                isScrollEvent,
                isScrollTypeEvent,
                scrollTimer = null,
                hasMinimumInterval

            if(!$.isPlainObject(options)){
                options = {}
            }

            $.each(defaultOptions,function(k,v){
                if($.inArray(k,['threshold','failure_limit','minimum_interval']) != -1){ // these params can be a string
                    if(type(options[k]) == 'String'){
                        options[k] = parseInt(options[k],10)
                    }else{
                        options[k] = v
                    }
                }else if(k == 'container'){ // options.container can be a seletor string \ dom \ jQuery object
                    if(options.hasOwnProperty(k)){   
                        if(options[k] == w || options[k] == document){
                            options._$container = $window
                        }else{
                            options._$container = $(options[k])
                        }
                    }else{
                        options._$container = $window
                    }
                    delete options.container
                }else if(defaultOptions.hasOwnProperty(k) && (!options.hasOwnProperty(k) || (type(options[k]) != type(defaultOptions[k])))){
                    options[k] = v
                }
            })

            isScrollEvent = options.event == 'scroll'

            // isScrollTypeEvent. contains custom scrollEvent . Such as 'scrollstart' & 'scrollstop'
            isScrollTypeEvent = isScrollEvent || options.event == 'scrollstart' || options.event == 'scrollstop'

            $elements.each(function(i,e){
                var element = this,
                    $element = $elements.eq(i),
                    placeholderSrc = $element.attr('src'),
                    originalSrcInAttr = $element.attr('data-'+options.data_attribute), // `data-original` attribute value
                    originalSrc = options.url_rewriter_fn == emptyFn?
                        originalSrcInAttr:
                        options.url_rewriter_fn.call(element,$element,originalSrcInAttr),
                    originalSrcset = $element.attr('data-'+options.data_srcset_attribute),
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
                            // attr srcset first
                            if(originalSrcset){
                                $element.attr('srcset', originalSrcset)
                            }
                            if(originalSrc){
                                $element.attr('src', originalSrc)
                            }
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
                        if(options.no_fake_img_loader || originalSrcset){
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
                options._$container.on(options.event, function(){
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
    }
})