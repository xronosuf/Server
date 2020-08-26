var $ = require('jquery');
var _ = require('underscore');
var gradebook = require('./gradebook');

exports.progress = function(n,d) {
    var percent = Math.round(n*100 / d);

    $('.navbar-progress-bar').show();
    
    var progressBar = $('div.progress.completion-meter div.progress-bar');
    
    progressBar.attr('aria-valuenow', n);
    progressBar.attr('aria-valuemax', d);
    progressBar.css('width', percent.toString() + '%' );

    // BADBAD: if'd be nicer if I only displayed the string when I knew it wouldn't overflow
    if (percent > 25)
	$('span', progressBar).text( n.toString() + ' of ' + d.toString() );
    else
	$('span', progressBar).text('');

    progressBar.toggleClass('progress-bar-striped', n == d);
};

exports.progressProportion = function(proportion) {
    var percent = Math.round(proportion*10000)/100;

    $('.navbar-progress-bar').show();

    // Progress bar on top of screen
    var progressBar = $('div.progress.completion-meter div.progress-bar');
    
    progressBar.attr('aria-valuenow', Math.round(percent));
    progressBar.attr('aria-valuemax', 100);
    progressBar.css('width', percent.toString() + '%' );
    $('span', progressBar).text('');

    progressBar.toggleClass('progress-bar-striped', proportion > 0.9999);

    // Progress bar in xourse
    var otherProgressBar = $('.activity-card.active div.progress-bar');
    
    otherProgressBar.attr('aria-valuenow', Math.round(percent));
    otherProgressBar.attr('aria-valuemax', 100);
    otherProgressBar.css('width', percent.toString() + '%' );
    $('span', otherProgressBar).text('');
    otherProgressBar.toggleClass('progress-bar-striped', proportion > 0.9999);    

    // the activity card get attribute 'max-completion' set
    var activityCard = $('.activity-card.active');
    activityCard.attr('data-max-completion', proportion );
};    


var calculateProgress = function(problem, depth) {
    if (depth === undefined)
	depth = 0;

    // Find immediate problem-environment children which aren't hints or feedback
    var children = $(problem).find('.problem-environment').not('.hint').not('.feedback').filter( function() {
	var parents = $(this).parent('.problem-environment');
	return (parents.length == 0) || (parents.first().is(problem)); } );

    // Non-root nodes also contribute to their value via their 'completion' flag
    var nodeValue = 0;
    var nodeMaxValue = 0;

    if (depth != 0) {
	if ($(problem).attr('data-blocking')) {
	    if ($(problem).persistentData('complete')) {
		nodeValue = 1;
		nodeMaxValue = 1;
	    } else {
		var answersNeeded = 0;
		var answersCorrect = 0;
		$(problem).data('answers-needed').forEach( function(answer) {
		    if ($(answer).persistentData('correct'))
			answersCorrect++;
		    answersNeeded++;

		});

		if (answersNeeded == 0) {
		    nodeValue = 1;
		    nodeMaxValue = 1;
		} else {
		    nodeValue = answersCorrect / answersNeeded;
		    nodeMaxValue = 1;
		}
	    }
	} else {
	    nodeValue = 1;
	    nodeMaxValue = 1;
	}
    }

    // Each node's value is the average of its children's values and its own completion flag
    var total = 0;
    children.each( function() {
	total = total + calculateProgress( this, depth + 1 );
    });
    
    return (total + nodeValue) / (children.length + nodeMaxValue);
};

var activityToMonitor = undefined;

var update = _.debounce( function() {
    var value = calculateProgress( activityToMonitor );

    // Top level videos are also counted
    var videoCount = 0;
    var totalViewed = 0.0;
    $('.youtube-player').each( function() {
	videoCount = videoCount + 1;
	var fraction = $(this).persistentData( 'fractionViewed' );
	if (fraction) {
	    totalViewed = totalViewed + fraction;
	}
    });

    // Activities that have NO problems will have total progress
    // NaN because of the 0 denominator; let's give credit to
    // students who simply look at such activities
    if (isNaN(value)) {
	if (videoCount > 0) {	
	    value = totalViewed / videoCount;
	} else {
	    value = 1;
	}
    } else {
	if (videoCount > 0) {
	    value = (value + totalViewed) / (1 + videoCount);
	}
    }

    exports.progressProportion( value );
    
    // Store the progress as the "score" in the database
    $(activityToMonitor).persistentData( 'score', value );
    
    // and in a separate "completion" table
    $(activityToMonitor).recordCompletion( value );

    // total the points in the course (if there is one)
    gradebook.update();

    if (value == 1) {
	$('#next-activity .page-link').addClass('pulsate');
    }
    
}, 217 );

var MathJax = require('./mathjax');

exports.monitorActivity = function( activity ) {
    activityToMonitor = activity;

    // BADBAD: Is this really always called after the math is done
    // being processed?
    MathJax.Hub.Register.StartupHook("End",function () {
	update();
    
	$('.problem-environment', activity).each( function() {
	    $(this).persistentData( update );
	});

	$('.youtube-player', activity).each( function() {
	    $(this).persistentData( update );
	});
    });
    
};


