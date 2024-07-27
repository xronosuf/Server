var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('./mathjax');
var Expression = require('math-expressions');

exports.bindPopover = function(element) {
    var update = function() {
	var text = $(element).find( "input" ).val();
	exports.displayPopover( text, element );
    };

    $(element).popover({
	animation: false,
	placement: 'right',
	container: 'body',		
	//animation: false,
	trigger: 'manual',
	content: function() {
	    return '';
	}});
    
    var inputBox = $(element).find( "input.form-control" );
    
    inputBox.on( 'input', update );

    inputBox.focus( update );

    inputBox.blur( function () {
	$(element).popover('hide');
    });

    inputBox.focusout( function () {
	$(element).popover('hide');
    });    
}

// Binds latex popover occur next to element when watched variable changes.
exports.displayPopover = function(answer, element) {
    if (answer.trim().length == 0) {
	$(element).popover('hide');
	return;
    }

    if (answer.trim().length == 0) {
	$(element).popover('hide');
	return;
    }
    
    try {
	var format = $(element).attr('data-format');

	if (format == 'string') {
	    return;
	}
	
	if ((format == 'integer') && (answer.trim().match( /[^0-9-]/ ))) {
	    throw 'Expecting an integer.';
	}

	// Don't need to give a preview for numeric answers
	if (answer.trim().match( /^-?[0-9\.]+$/ )) {
	    $(element).popover('hide');
	    return;
	}
	
	var latex = Expression.fromText(answer).tex();

	$(element).data('bs.popover').config.title = '';	    
	$(element).data('bs.popover').config.content = '\\(' + latex + '\\)';
	$(element).popover('show');
	MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(element).data('bs.popover').tip[0]]);
    }
    // display errors as popovers, too
    catch (err) {
	$(element).data('bs.popover').config.title = 'Error';	    
	$(element).data('bs.popover').config.content = err;
	$(element).popover('show');
    }
}



