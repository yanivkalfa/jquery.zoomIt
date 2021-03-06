/**
 * Author: Constantin Boiangiu, Modified by SK.
 * jQuery version: 1.6
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 */

;(function($){

    $.fn.jqZoomIt = function(options){
        if (this.length > 1){
            this.each(function() {
                $(this).jqZoomIt(options);
            });
            return this;
        };

        var defaults = {
            mouseEvent			: 'mouseenter', // click, mouseenter, mouseover
            zoomAreaMove		: 'mousemove', // drag or mousemove
            zoomPosition		: 'right', // left, right, top, bottom
            // CSS
            zoomClass			: 'zoomIt_zoomed', // additional styling on zoom container
            zoomLoadingClass	: 'zoomIt_loading', // css class to apply before the big image is fully loaded
            zoomAreaClass		: 'zoomIt_area', // additional styling on zoomed area
            zoomAreaColor		: '#FFF', // zoomed area bg color

            zoomAreaOpacity		: .5, // zoomed area opacity
            zoomDistance		: 10, // distance of the zoomer from the trigger
            // full image multipliers based on small preview image size
            multiplierX			: 1.05, // how much of the big image width will be displayed
            multiplierY			: 1.20, // how much of the big image height will be displayed
            // events
            init				: function(){},
            zoom				: function(){},
            close				: function(){},
            // conditional
            is_touch			: null // if left to null it will use an internal detection process. If bool, it will take the option and bypass internal functionality
        };

        var options  = $.extend({}, defaults, options),
            self 	 = this,
            bigImg   = $(this).attr('href'),
            smallImg = $('img', this);

        // if element doesn't have href attribute
        // or small image isn't within main element,
        // bail out
        if( '' == bigImg || 0 == smallImg.length ){
            return false;
        };

        // start the plugin
        var initialize = function(){
            // set the small image size
            set_small_size();
            // prepare the preview wrapper element
            add_preview_area();
            // add the events
            var enterEvent = is_touch() ? 'touchstart' : ( 'click' == options.mouseEvent ? 'click' : 'mouseenter' ),
                leaveEvent = is_touch() ? 'touchend' : 'mouseleave';

            $(self).bind( enterEvent, function(event){
                event.preventDefault();
                startZoom();
                options.zoom.call(self, {});
            });
            $(self).bind(leaveEvent, function(){
                closeZoom();
                options.close.call(self, {});
            });

            $(window).resize(reset_preview_area);// reset positions on window resize
            options.init.call(self, {});
            return self;
        };

        var startZoom = function(){
            var elems = get_preview_areas(), // returns object with keys zoomer and preview containing elements needed to create the zoom
                sizes = get_small_size();

            // Check if we have enough room on page to display the zoom.
            if ($(document).width()-(sizes.widthP+options.zoomDistance) < options.multiplierX*sizes.widthP+options.zoomDistance ){return;}

            $(elems.zoomer).show().css({
                'top' : sizes.zTop,
                'left' : sizes.zLeft
            });
            // if no zoom is needed stop here

            if( $.data( self, 'no_zoom') ){
                return;
            }

            // show and position preview area
            $(elems.preview).show();

            if( $.data( self, 'loaded' ) ){
                return;
            }

            // add loading class to big image container
            $( elems.zoomer ).addClass( options.zoomLoadingClass );
            // load the big image
            var fullImg = $('<img />', {
                'src' : bigImg
            }).load( function(){
                // remove loader from zoom area
                $( elems.zoomer ).removeClass( options.zoomLoadingClass );
                // inject full image
                fullImg.css({
                    'position'	: 'absolute',
                    'top'		: 0,
                    'left'		: 0,
                    'max-width' : 'inherit'
                }).appendTo( $(elems.zoomer) );

                $.data( self, 'loaded', true );

                var fullWidth 	= fullImg.width(),
                    fullHeight 	= fullImg.height(),
                    ratioX 		= fullWidth / sizes.width,
                    ratioY 		= fullHeight / sizes.height,
                    dw 			= sizes.width / ratioX * ( options.multiplierX  || 1 ),
                    dh 			= sizes.height / ratioY * ( options.multiplierY || 1 );

                // if image doesn't need zooming according to multiplier, set full img container size to image size
                if( options.multiplierX > ratioX && options.multiplierY > ratioY ){
                    $(elems.zoomer).css({
                        'width'	:fullWidth,
                        'height':fullHeight
                    });
                    $.data( self, 'no_zoom', true );
                    return;
                }

                if( 'drag' == options.zoomAreaMove && $.fn.draggable && !is_touch() ){
                    // start drag
                    $(self).removeAttr('href');

                    $(elems.preview).draggable({
                        containment : 'parent',
                        drag: function(event, ui){
                            var pos 	= $(elems.preview).position(),
                                left 	= -(pos.left * ratioX),
                                top 	= -(pos.top * ratioY);
                            fullImg.css({
                                'left':left,
                                'top':top
                            });
                        }
                    })

                }else{

                    var moveEvent = is_touch() ? 'touchmove' : 'mousemove';

                    $(self).bind( moveEvent, function( e ){
                        // used to store current mouse position
                        var mouseX = 0,
                            mouseY = 0;
                        // get position on touch
                        if( is_touch() ){
                            e.preventDefault();
                            event = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
                            mouseX = event.pageX;
                            mouseY = event.pageY;
                        }else{
                            // get position on non-touch
                            mouseX = e.pageX;
                            mouseY = e.pageY;
                        }

                        var sizes = get_small_size(),
                            padLeft = sizes.left-sizes.leftP,
                            padTop = sizes.top-sizes.topP,
                            mX = mouseX - sizes.left + (padLeft)-(dw/2),
                            mY = mouseY - sizes.top + (padTop)-(dh/2);

                        // horizontal left limit
                        if( mouseX < sizes.left + dw/2 ){
                            mX = padLeft;
                        }
                        // vertical top limit
                        if( mouseY < sizes.top + dh/2 ){
                            mY = padTop;
                        }
                        // horizontal right limit
                        if( mouseX > ( sizes.left + sizes.width - dw/2 )){
                            mX = sizes.left + sizes.width - dw - sizes.leftP;
                        }
                        // vertical bottom limit
                        if( mouseY > ( sizes.top + sizes.height - dh/2 )){
                            mY = sizes.top + sizes.height - dh - sizes.topP;
                        }


                        // move zoomed area
                        $(elems.preview).css({
                            'left':mX,
                            'top':mY
                        });

                        // move full image
                        fullImg.css({
                            'left'	: -((mX-padLeft) * ratioX),
                            'top'	: -((mY-padTop) * ratioY)
                        });
                    })
                }

                // resize drag area that shows the position on small image
                $(elems.preview).css({
                    'width' : dw,
                    'height' : dh
                });
            });
        };

        var closeZoom = function(){
            var elems = get_preview_areas();
            $(elems.zoomer).hide().css({
                'top' : -5000,
                'left': -5000
            });
            $(elems.preview).hide();
        };

        // set small image size
        var set_small_size = function(){

            var position = $(smallImg[0]).offset(),
                positionParent = $(smallImg[0]).parent().offset(),
                data = {
                    'width' 	: $(smallImg[0]).outerWidth(),
                    'height' 	: $(smallImg[0]).outerHeight(),
                    'top' 		: position.top,
                    'left' 		: position.left,
                    'widthP' 	: $(smallImg[0]).parent().outerWidth(),
                    'heightP' 	: $(smallImg[0]).parent().outerHeight(),
                    'topP' 		: positionParent.top,
                    'leftP' 	: positionParent.left,
                    'zTop' 		: positionParent.top,
                    'zLeft' 	: positionParent.left
                };

            // make some position calculations based on position option
            switch( options.zoomPosition ){
                case 'right':
                default:
                    data.zLeft += data.widthP + options.zoomDistance;
                    break;
                case 'left':
                    data.zLeft -= data.widthP * ( options.multiplierX || 1 ) + options.zoomDistance;
                    break;
                case 'bottom':
                    data.zTop += data.heightP + options.zoomDistance;
                    break;
                case 'top':
                    data.zTop -= data.heightP * ( options.multiplierY || 1 ) + options.zoomDistance;
                    break;
            }

            $.data( smallImg[0], 'size', data );
            return data;
        };

        // helper function to get small image size stored on element
        var get_small_size = function(){
            return $.data( smallImg[0], 'size' );
        };

        // creates an element that overlaps the image to highlight the area being zoomed
        var add_preview_area = function(){
            var dragger = $('<div />',{
                'class': options.zoomAreaClass,
                'css':{
                    'background-color'	: options.zoomAreaColor || '#999',
                    'opacity'			: options.zoomAreaOpacity || .7,
                    'display'			: 'none',
                    'position'			: 'absolute',
                    'top'				: 0,
                    'left'				: 0,
                    'cursor'			: 'move',
                    'z-index'			: 1000
                }
            }).appendTo( $(self) );

            var sizes = get_small_size();

            var zoomer = $('<div />', {
                'class'	: options.zoomClass,
                'css'	:{
                    'display'	: 'none',
                    'position'	: 'absolute',
                    'top'		: -1000,
                    'overflow'	: 'hidden',
                    'width' 	: sizes.widthP * ( options.multiplierX || 1 ),
                    'height' 	: sizes.heightP * ( options.multiplierY || 1 ),
                    'z-index'	: 1050
                }
            }).appendTo( $(document.body) );

            var data = {
                'zoomer' 	: zoomer,
                'preview' 	: dragger
            };
            $.data( smallImg[0], 'elems', data );
        };

        // helper function to return element that highlights the zoomed area
        var get_preview_areas = function(){
            return $.data( smallImg[0], 'elems');
        };

        var reset_preview_area = function(){
            closeZoom();
            $.data( self, 'loaded', false );
            var elems = get_preview_areas();
            $(elems.zoomer).remove();
            $(elems.preview).remove();
            set_small_size();
            add_preview_area();
        };

        /**
         * Verifies if browser has touch capabilities. Testing isn't bullet proof, you're encouraged
         * to override the functionality by setting the parameter is_touch in options to a value determined
         * by a third-party, more comprehensive browser testing script.
         */
        var is_touch = function(){
            if( options.is_touch !== null ){
                return options.is_touch;
            }
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
        };

        return initialize();
    }
})(jQuery);
