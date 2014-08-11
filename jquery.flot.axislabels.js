/*
Axis Labels Plugin for flot.
http://github.com/markrcote/flot-axislabels

Original code is Copyright (c) 2010 Xuan Luo.
Original code was released under the GPLv3 license by Xuan Luo, September 2010.
Original code was rereleased under the MIT license by Xuan Luo, April 2012.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function ($) {
    var options = { };

    function canvasSupported() {
        return !!document.createElement('canvas').getContext;
    }

    function canvasTextSupported() {
        if (!canvasSupported()) {
            return false;
        }
        var dummy_canvas = document.createElement('canvas');
        var context = dummy_canvas.getContext('2d');
        return typeof context.fillText == 'function';
    }

    function css3TransitionSupported() {
        var div = document.createElement('div');
        return typeof div.style.MozTransition != 'undefined'    // Gecko
            || typeof div.style.OTransition != 'undefined'      // Opera
            || typeof div.style.webkitTransition != 'undefined' // WebKit
            || typeof div.style.transition != 'undefined';
    }


    function AxisLabel(axisName, position, padding, plot, opts) {
        this.axisName = axisName;
        this.position = position;
        this.padding = padding;
        this.plot = plot;
        this.opts = opts;
        this.width = 0;
        this.height = 0;
    }

    AxisLabel.prototype.cleanup = function() {
    };


    CanvasAxisLabel.prototype = new AxisLabel();
    CanvasAxisLabel.prototype.constructor = CanvasAxisLabel;
    function CanvasAxisLabel(axisName, position, padding, plot, opts) {
        AxisLabel.prototype.constructor.call(this, axisName, position, padding,
                                             plot, opts);
    }

    // Adjust the label width in canvas (if the option axisLabelAdjustment for
    // this axis was set to true) to the max height/width of the axis 
    // by inserting line breaks as long as needed and possible
    CanvasAxisLabel.prototype.adjustLabel = function(box) {

        // we'll need those options and it's possible, that they
        // haven't yet been set to their default values if not present
        if (!this.opts.axisLabelFontSizePixels)
            this.opts.axisLabelFontSizePixels = 14;
        if (!this.opts.axisLabelFontFamily)
            this.opts.axisLabelFontFamily = 'sans-serif';

        var widthBox, labelMaxWidth;
        var ctx;
        var blMadeAdjustment = true;

        // if it's x-axis, take the height of the axis as the max width 
        // of the label, otherwise (y-axis) take the width of the axis
        // as the max width of the label
        if (this.position == 'left' || this.position == 'right') {
            widthBox = box.height;
        } else {
            widthBox = box.width;
        }

        // we need to calculate the label width, for that we'll need the canvas
        // and set the used font size and family
        ctx = this.plot.getCanvas().getContext('2d');
        ctx.font = this.opts.axisLabelFontSizePixels + 'px ' + this.opts.axisLabelFontFamily;

        // Now get the label width. If there is already more than one line: iterate through
        // them and find the line with the widest width.
        labelMaxWidth = this.getMaxWidthLabel(ctx);

        // now lets do adjustments to the label (inserting line breaks) as long as
        // the label width is wider than the height/width of the axis and as long
        // as we were able to do adjustments (or if we're just beginning the loop).
        while (labelMaxWidth.width > widthBox && blMadeAdjustment) {

            // is there a space somewhere in the most broadest line
            var idx = labelMaxWidth.lines[labelMaxWidth.index].lastIndexOf(' ');

            // If so, insert a line break into this most broadest line and
            // join the lines back together so we have our new axis label.
            // If we can't break the broadest line it doesn't make sense to
            // break any other line, so we would have to leave the loop
            // by declaring we haven't done any adjustments.
            if (idx > 0) {
                // now we insert the line break to the last space(s) of the broadest line
                labelMaxWidth.lines[labelMaxWidth.index] = labelMaxWidth.lines[labelMaxWidth.index].replace(/ *([^ ]*)$/, '\n$1');

                // and now we join the lines back together with line breaks (since that's how
                // we've splittet them into lines) and we have our new axis label
                this.opts.axisLabel = labelMaxWidth.lines.join('\n');

                // Now lets start all this over again and check if we have our perfect label
                // now by getting once more the label width. Since there is now for sure already 
                // more than one line: iterate through them and find the line with the widest width.
                labelMaxWidth = this.getMaxWidthLabel(ctx);
            }
            else
                blMadeAdjustment = false;
        }
    }

    // Lets get the width of the broadest line, 
    // we'll also need all the lines
    // and the index of the broadest line.
    // We need this for adjusting the axis label.
    CanvasAxisLabel.prototype.getMaxWidthLabel = function(ctx) {
        var arrAxisLabel = this.opts.axisLabel.split('\n');
        var countLines = arrAxisLabel.length;
        var widthLine, widthLabelMax = null, idx = 0;

        for (var i = 0; i < countLines; i++) {
            widthLine = ctx.measureText(arrAxisLabel[i]).width;
            if (widthLabelMax === null || widthLine > widthLabelMax) {
                widthLabelMax = widthLine;
                idx = i;
            }
        }

        return { width: widthLabelMax, index: idx, lines: arrAxisLabel };
    }

    CanvasAxisLabel.prototype.calculateSize = function() {
        // padding between lines if we have more than one
        if (!this.opts.axisLabelLinePadding)
            this.opts.axisLabelLinePadding = 5;
        if (!this.opts.axisLabelFontSizePixels)
            this.opts.axisLabelFontSizePixels = 14;
        if (!this.opts.axisLabelFontFamily)
            this.opts.axisLabelFontFamily = 'sans-serif';

        // How many lines are there in our label? Important if it's a multiline label.
        var countLines = this.opts.axisLabel.split('\n').length;
        var textWidth = this.opts.axisLabelFontSizePixels + this.padding;
        var textHeight = this.opts.axisLabelFontSizePixels + this.padding;

        // now calculate the height of line times the number of line adding the padding between lines and the padding to the axis
        if (this.position == 'left' || this.position == 'right') {
            this.width = this.opts.axisLabelFontSizePixels * countLines * 0.72 + this.opts.axisLabelLinePadding * (countLines - 1) + this.padding;
            this.height = 0;
        } else {
            this.width = 0;
            this.height = this.opts.axisLabelFontSizePixels * countLines * 0.72 + this.opts.axisLabelLinePadding * (countLines - 1) + this.padding;
        }
    };

    CanvasAxisLabel.prototype.draw = function(box) {
        // split our label in multiple lines if there are any line breaks inserted
        var arrAxisLabel = this.opts.axisLabel.split('\n');

        if (!this.opts.axisLabelColour)
            this.opts.axisLabelColour = 'black';

        // now set the default value of label alignment if none was given, 
        // or convert the value 'middle' to value 'center'. This will only
        // affect multiline labels.
        if (!this.opts.axisLabelAlignment || this.opts.axisLabelAlignment === 'middle')
            this.opts.axisLabelAlignment = 'center';

        // what is our line count?
        var countLines = arrAxisLabel.length;
        // array of canvases
        var arrCtx = new Array(countLines);
        // height of one line
        var height = this.opts.axisLabelFontSizePixels;
        // get the broadest line width of our multiline label,
        // we might need this for alignment.
        var ctx = this.plot.getCanvas().getContext('2d');
        ctx.font = this.opts.axisLabelFontSizePixels + 'px ' + this.opts.axisLabelFontFamily;
        ctx.save();
        var labelMaxWidth = this.getMaxWidthLabel(ctx);
        var angle = 0;

        // angle if this is a y-axis
        if (this.position == 'left') {
            angle = -Math.PI/2;
        } else if (this.position == 'right') {
            angle = Math.PI/2;
        }

        // now lets draw each label line on the chart
        for (var i = 0; i < countLines; i++) {
            // prepare the canvas for this label
            arrCtx[i] = this.plot.getCanvas().getContext('2d');
            arrCtx[i].save();
            arrCtx[i].font = this.opts.axisLabelFontSizePixels + 'px ' + this.opts.axisLabelFontFamily;
            arrCtx[i].fillStyle = this.opts.axisLabelColour;

            // measure width of this line
            var width = arrCtx[i].measureText(arrAxisLabel[i]).width;
            var x, y;

            // calculate position of this line
            if (this.position == 'top') {
                // align the text correct in multiline labels
                if (this.opts.axisLabelAlignment === 'left')
                    x = box.left + box.width/2 - labelMaxWidth.width/2;
                else if (this.opts.axisLabelAlignment === 'right')
                    x = box.left + box.width/2 + labelMaxWidth.width/2 - width;
                else
                    x = box.left + box.width/2 - width/2;
                // calculate the position of one label line
                y = box.top + height * (i + 1) * 0.72 + this.opts.axisLabelLinePadding * i;
            } else if (this.position == 'bottom') {
                // align the text correct in multiline labels
                if (this.opts.axisLabelAlignment === 'left')
                    x = box.left + box.width/2 - labelMaxWidth.width/2;
                else if (this.opts.axisLabelAlignment === 'right')
                    x = box.left + box.width/2 + labelMaxWidth.width/2 - width;
                else
                    x = box.left + box.width/2 - width/2;
                // calculate the position of one label line
                y = box.top + box.height - height * (countLines - i) * 0.72 - this.opts.axisLabelLinePadding * (countLines - i - 1);
            } else if (this.position == 'left') {
                // calculate the position of one label line
                x = box.left + height * (i + 1) * 0.72 + this.opts.axisLabelLinePadding * i;
                // align the text correct in multiline labels
                if (this.opts.axisLabelAlignment === 'left')
                    y = box.top + box.height/2 + labelMaxWidth.width/2;
                else if (this.opts.axisLabelAlignment === 'right')
                    y = box.top + box.height/2 - labelMaxWidth.width/2 + width;
                else
                    y = box.top + box.height/2 + width/2;
            } else if (this.position == 'right') {
                // calculate the position of one label line
                x = box.left + box.width - height * (i + 1) * 0.72 - this.opts.axisLabelLinePadding * i;
                // align the text correct in multiline labels
                if (this.opts.axisLabelAlignment === 'left')
                    y = box.top + box.height/2 - labelMaxWidth.width/2;
                else if (this.opts.axisLabelAlignment === 'right')
                    y = box.top + box.height/2 + labelMaxWidth.width/2 - width;
                else
                    y = box.top + box.height/2 - width/2;
            }
            // now draw the text of this line
            arrCtx[i].translate(x, y);
            arrCtx[i].rotate(angle);
            arrCtx[i].fillText(arrAxisLabel[i], 0, 0);
            arrCtx[i].restore();
        }
    };


    HtmlAxisLabel.prototype = new AxisLabel();
    HtmlAxisLabel.prototype.constructor = HtmlAxisLabel;
    function HtmlAxisLabel(axisName, position, padding, plot, opts) {
        AxisLabel.prototype.constructor.call(this, axisName, position,
                                             padding, plot, opts);
        this.elem = null;
    }

    HtmlAxisLabel.prototype.calculateSize = function() {
        var elem = $('<div class="axisLabels" style="position:absolute;">' +
                     this.opts.axisLabel + '</div>');
        this.plot.getPlaceholder().append(elem);
        // store height and width of label itself, for use in draw()
        this.labelWidth = elem.outerWidth(true);
        this.labelHeight = elem.outerHeight(true);
        elem.remove();

        this.width = this.height = 0;
        if (this.position == 'left' || this.position == 'right') {
            this.width = this.labelWidth + this.padding;
        } else {
            this.height = this.labelHeight + this.padding;
        }
    };

    HtmlAxisLabel.prototype.cleanup = function() {
        if (this.elem) {
            this.elem.remove();
        }
    };

    HtmlAxisLabel.prototype.draw = function(box) {
        this.plot.getPlaceholder().find('#' + this.axisName + 'Label').remove();
        this.elem = $('<div id="' + this.axisName +
                      'Label" " class="axisLabels" style="position:absolute;">'
                      + this.opts.axisLabel + '</div>');
        this.plot.getPlaceholder().append(this.elem);
        if (this.position == 'top') {
            this.elem.css('left', box.left + box.width/2 - this.labelWidth/2 +
                          'px');
            this.elem.css('top', box.top + 'px');
        } else if (this.position == 'bottom') {
            this.elem.css('left', box.left + box.width/2 - this.labelWidth/2 +
                          'px');
            this.elem.css('top', box.top + box.height - this.labelHeight +
                          'px');
        } else if (this.position == 'left') {
            this.elem.css('top', box.top + box.height/2 - this.labelHeight/2 +
                          'px');
            this.elem.css('left', box.left + 'px');
        } else if (this.position == 'right') {
            this.elem.css('top', box.top + box.height/2 - this.labelHeight/2 +
                          'px');
            this.elem.css('left', box.left + box.width - this.labelWidth +
                          'px');
        }
    };


    CssTransformAxisLabel.prototype = new HtmlAxisLabel();
    CssTransformAxisLabel.prototype.constructor = CssTransformAxisLabel;
    function CssTransformAxisLabel(axisName, position, padding, plot, opts) {
        HtmlAxisLabel.prototype.constructor.call(this, axisName, position,
                                                 padding, plot, opts);
    }

    CssTransformAxisLabel.prototype.calculateSize = function() {
        HtmlAxisLabel.prototype.calculateSize.call(this);
        this.width = this.height = 0;
        if (this.position == 'left' || this.position == 'right') {
            this.width = this.labelHeight + this.padding;
        } else {
            this.height = this.labelHeight + this.padding;
        }
    };

    CssTransformAxisLabel.prototype.transforms = function(degrees, x, y) {
        var stransforms = {
            '-moz-transform': '',
            '-webkit-transform': '',
            '-o-transform': '',
            '-ms-transform': ''
        };
        if (x != 0 || y != 0) {
            var stdTranslate = ' translate(' + x + 'px, ' + y + 'px)';
            stransforms['-moz-transform'] += stdTranslate;
            stransforms['-webkit-transform'] += stdTranslate;
            stransforms['-o-transform'] += stdTranslate;
            stransforms['-ms-transform'] += stdTranslate;
        }
        if (degrees != 0) {
            var rotation = degrees / 90;
            var stdRotate = ' rotate(' + degrees + 'deg)';
            stransforms['-moz-transform'] += stdRotate;
            stransforms['-webkit-transform'] += stdRotate;
            stransforms['-o-transform'] += stdRotate;
            stransforms['-ms-transform'] += stdRotate;
        }
        var s = 'top: 0; left: 0; ';
        for (var prop in stransforms) {
            if (stransforms[prop]) {
                s += prop + ':' + stransforms[prop] + ';';
            }
        }
        s += ';';
        return s;
    };

    CssTransformAxisLabel.prototype.calculateOffsets = function(box) {
        var offsets = { x: 0, y: 0, degrees: 0 };
        if (this.position == 'bottom') {
            offsets.x = box.left + box.width/2 - this.labelWidth/2;
            offsets.y = box.top + box.height - this.labelHeight;
        } else if (this.position == 'top') {
            offsets.x = box.left + box.width/2 - this.labelWidth/2;
            offsets.y = box.top;
        } else if (this.position == 'left') {
            offsets.degrees = -90;
            offsets.x = box.left - this.labelWidth/2 + this.labelHeight/2;
            offsets.y = box.height/2 + box.top;
        } else if (this.position == 'right') {
            offsets.degrees = 90;
            offsets.x = box.left + box.width - this.labelWidth/2
                        - this.labelHeight/2;
            offsets.y = box.height/2 + box.top;
        }
        return offsets;
    };

    CssTransformAxisLabel.prototype.draw = function(box) {
        this.plot.getPlaceholder().find("." + this.axisName + "Label").remove();
        var offsets = this.calculateOffsets(box);
        this.elem = $('<div class="axisLabels ' + this.axisName +
                      'Label" style="position:absolute; ' +
                      'color: ' + this.opts.color + '; ' +
                      this.transforms(offsets.degrees, offsets.x, offsets.y) +
                      '">' + this.opts.axisLabel + '</div>');
        this.plot.getPlaceholder().append(this.elem);
    };


    IeTransformAxisLabel.prototype = new CssTransformAxisLabel();
    IeTransformAxisLabel.prototype.constructor = IeTransformAxisLabel;
    function IeTransformAxisLabel(axisName, position, padding, plot, opts) {
        CssTransformAxisLabel.prototype.constructor.call(this, axisName,
                                                         position, padding,
                                                         plot, opts);
        this.requiresResize = false;
    }

    IeTransformAxisLabel.prototype.transforms = function(degrees, x, y) {
        // I didn't feel like learning the crazy Matrix stuff, so this uses
        // a combination of the rotation transform and CSS positioning.
        var s = '';
        if (degrees != 0) {
            var rotation = degrees/90;
            while (rotation < 0) {
                rotation += 4;
            }
            s += ' filter: progid:DXImageTransform.Microsoft.BasicImage(rotation=' + rotation + '); ';
            // see below
            this.requiresResize = (this.position == 'right');
        }
        if (x != 0) {
            s += 'left: ' + x + 'px; ';
        }
        if (y != 0) {
            s += 'top: ' + y + 'px; ';
        }
        return s;
    };

    IeTransformAxisLabel.prototype.calculateOffsets = function(box) {
        var offsets = CssTransformAxisLabel.prototype.calculateOffsets.call(
                          this, box);
        // adjust some values to take into account differences between
        // CSS and IE rotations.
        if (this.position == 'top') {
            // FIXME: not sure why, but placing this exactly at the top causes 
            // the top axis label to flip to the bottom...
            offsets.y = box.top + 1;
        } else if (this.position == 'left') {
            offsets.x = box.left;
            offsets.y = box.height/2 + box.top - this.labelWidth/2;
        } else if (this.position == 'right') {
            offsets.x = box.left + box.width - this.labelHeight;
            offsets.y = box.height/2 + box.top - this.labelWidth/2;
        }
        return offsets;
    };

    IeTransformAxisLabel.prototype.draw = function(box) {
        CssTransformAxisLabel.prototype.draw.call(this, box);
        if (this.requiresResize) {
            this.elem = this.plot.getPlaceholder().find("." + this.axisName +
                                                        "Label");
            // Since we used CSS positioning instead of transforms for
            // translating the element, and since the positioning is done
            // before any rotations, we have to reset the width and height
            // in case the browser wrapped the text (specifically for the
            // y2axis).
            this.elem.css('width', this.labelWidth);
            this.elem.css('height', this.labelHeight);
        }
    };


    function init(plot) {
        // This is kind of a hack. There are no hooks in Flot between
        // the creation and measuring of the ticks (setTicks, measureTickLabels
        // in setupGrid() ) and the drawing of the ticks and plot box
        // (insertAxisLabels in setupGrid() ).
        //
        // Therefore, we use a trick where we run the draw routine twice:
        // the first time to get the tick measurements, so that we can change
        // them, and then have it draw it again.
        var secondPass = false;

        var axisLabels = {};
        var axisOffsetCounts = { left: 0, right: 0, top: 0, bottom: 0 };

        var defaultPadding = 2;  // padding between axis and tick labels
        plot.hooks.draw.push(function (plot, ctx) {
            var hasAxisLabels = false;
            if (!secondPass) {
                // MEASURE AND SET OPTIONS
                $.each(plot.getAxes(), function(axisName, axis) {
                    var opts = axis.options // Flot 0.7
                        || plot.getOptions()[axisName]; // Flot 0.6

                    // Handle redraws initiated outside of this plug-in.
                    if (axisName in axisLabels) {
                        axis.labelHeight = axis.labelHeight -
                            axisLabels[axisName].height;
                        axis.labelWidth = axis.labelWidth -
                            axisLabels[axisName].width;
                        opts.labelHeight = axis.labelHeight;
                        opts.labelWidth = axis.labelWidth;
                        axisLabels[axisName].cleanup();
                        delete axisLabels[axisName];
                    }

                    if (!opts || !opts.axisLabel || !axis.show)
                        return;

                    hasAxisLabels = true;
                    var renderer = null;

                    if (!opts.axisLabelUseHtml &&
                        navigator.appName == 'Microsoft Internet Explorer') {
                        var ua = navigator.userAgent;
                        var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                        if (re.exec(ua) != null) {
                            rv = parseFloat(RegExp.$1);
                        }
                        if (rv >= 9 && !opts.axisLabelUseCanvas && !opts.axisLabelUseHtml) {
                            renderer = CssTransformAxisLabel;
                        } else if (!opts.axisLabelUseCanvas && !opts.axisLabelUseHtml) {
                            renderer = IeTransformAxisLabel;
                        } else if (opts.axisLabelUseCanvas) {
                            renderer = CanvasAxisLabel;
                        } else {
                            renderer = HtmlAxisLabel;
                        }
                    } else {
                        if (opts.axisLabelUseHtml || (!css3TransitionSupported() && !canvasTextSupported()) && !opts.axisLabelUseCanvas) {
                            renderer = HtmlAxisLabel;
                        } else if (opts.axisLabelUseCanvas || !css3TransitionSupported()) {
                            renderer = CanvasAxisLabel;
                        } else {
                            renderer = CssTransformAxisLabel;
                        }
                    }

                    var padding = opts.axisLabelPadding === undefined ?
                                  defaultPadding : opts.axisLabelPadding;

                    axisLabels[axisName] = new renderer(axisName,
                                                        axis.position, padding,
                                                        plot, opts);

                    // if the label should be adjusted (enters line breaks if needed)
                    // then do this now, provided the adjustLabel function exists
                    // for this kind of axis (currently only in canvas).
                    if (axisLabels[axisName].opts.axisLabelAdjustment &&
                         typeof axisLabels[axisName].adjustLabel === 'function')
                        axisLabels[axisName].adjustLabel(axis.box);

                    // flot interprets axis.labelHeight and .labelWidth as
                    // the height and width of the tick labels. We increase
                    // these values to make room for the axis label and
                    // padding.

                    axisLabels[axisName].calculateSize();

                    // AxisLabel.height and .width are the size of the
                    // axis label and padding.
                    // Just set opts here because axis will be sorted out on
                    // the redraw.

                    opts.labelHeight = axis.labelHeight +
                        axisLabels[axisName].height;
                    opts.labelWidth = axis.labelWidth +
                        axisLabels[axisName].width;
                });

                // If there are axis labels, re-draw with new label widths and
                // heights.

                if (hasAxisLabels) {
                    secondPass = true;
                    plot.setupGrid();
                    plot.draw();
                }
            } else {
                secondPass = false;
                // DRAW
                $.each(plot.getAxes(), function(axisName, axis) {
                    var opts = axis.options // Flot 0.7
                        || plot.getOptions()[axisName]; // Flot 0.6
                    if (!opts || !opts.axisLabel || !axis.show)
                        return;

                    axisLabels[axisName].draw(axis.box);
                });
            }
        });
    }


    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'axisLabels',
        version: '2.0'
    });
})(jQuery);
