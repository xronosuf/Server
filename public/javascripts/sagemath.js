var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('mathjax');
var database = require('./database');

$(function() {
    // If there are any sage cells on the page
    if ( ($( ".sage" ).length > 0) || ($( ".sageOutput" ).length > 0)) {
	// Creating a kernel incidentally processes sagecells
	exports.createKernel();
    }
});

var seeded = false;
var seedCallbacks = [];
var setSeed = function(callback) {
    if (seeded) {
	callback();
    } else {
	seedCallbacks.push( callback );
	getSeed();
    }
};

var seed = null;
var sendSeed = function(newSeed) {
    if ((seed == newSeed) && (seed !== null))
	return;

    seed = newSeed;
    
    if (newSeed !== undefined) {
	exports.sage("set_random_seed(" + newSeed + ")");
    } else {
	if ($('main.activity').length > 0) {
	    var activityPath = $('main.activity').attr( 'data-path' );
	    var currfilebase = activityPath.split('/').slice(-1)[0];
	
	    var code = 'jobname="' + currfilebase + '"' + "\n";
	    code = code + "import hashlib\n";
	    code = code + "set_random_seed(int(hashlib.sha256(jobname.encode('utf-8')).hexdigest(), 16))\n";
	    exports.sage(code);
	}
    }
};

var reprocessMathjax = _.debounce(function() {
    MathJax.Hub.Queue(["Reprocess", MathJax.Hub]);    
}, 250);

var getSeed = _.once( function() {
    var seedDiv;
    if ($("#seed").length > 0) {
	seedDiv = $("#seed").first();
    } else {
	seedDiv = $('<div id="seed" style="display: none;"></div>');
	$('main.activity').append( seedDiv );
    }
	
    seedDiv.fetchData( function() {
	seeded = true;
	    
	var seed = seedDiv.persistentData('seed');
	sendSeed(seed);

	seedDiv.persistentData( function() {
	    var newSeed = seedDiv.persistentData('seed');
	    if (newSeed == seed) {
		return;
	    }
	    sendSeed(newSeed);

	    executedSageSilents = false;
	    executeSageSilents();
	    
	    reprocessMathjax();
	});
	
	seedCallbacks.forEach( function(callback) {
	    callback();
	});
	seedCallbacks = [];
    });
});

var stopSpinning = _.debounce(function() {
    $("#show-me-another-button i").css('animation-play-state', 'paused');    
}, 250);

MathJax.Hub.signal.Interest(function (message) {
    if (message[0] == "End Reprocess") {
	stopSpinning();
    }
    if (message[0] == "End Rerender") {
	stopSpinning();
    }    
});

$(function() {
    $("#show-me-another-button").click( function() {
	$("i", this).addClass("fa-spin");
	$("#show-me-another-button i").css('animation-play-state', 'running');
	
	// A different seed algorithm would be better here, just so
	// students get different problems
	var oldSeed = $("#seed").persistentData( 'seed' );
	    
	seed = undefined;	
	database.resetWork();
	
	if (oldSeed !== undefined) {
	    $("#seed").persistentData( 'seed', oldSeed + 1 );
	} else {
	    $("#seed").persistentData( 'seed', 0 );	    
	}
    });
});

var executedSageSilents = false;
var executeSageSilents = function() {
    if (executedSageSilents == false) {
	executedSageSilents = true;
	// Execute any sagesilent blocks
	$('script[type="text/sagemath"]').each( function() {
	    var code = $(this).text();
	    // Remove any CDATA
	    code = code.replace(/[\s\S]*#<!\[CDATA\[\s*\n((.|\n)*)\s*#\]\]>/m,"$1");
	    
	    // The snippet "rand" is enough to trigger the "Another..." button
	    if (code.match('rand')) {
		$("#show-me-another-button").show();
	    }
	    
	    exports.sage(code);
	});
    }
};

exports.createKernel = _.once(function() {
    return new Promise(function(resolve, reject) {
	// There's a race condition here: window.sagecell may not be
	// set quickly enough.  So we wait until window.sagecell is
	// set
	var walkback = 10;
	function sagecellReady() {
	    if ((typeof window.sagecell !== typeof undefined) &&
		(typeof window.sagecell.kernels !== typeof undefined)) {
		// Create a sagecell in order to trigger the creation of a kernel
		var arrayChangeHandler = {
		    set: function(target, property, value, receiver) {
			if (property == 0) {
			    if (value != null) {
				window.setTimeout( function() {
				    resolve(value);
				}, 0);
			    }
			}
			target[property] = value;
			return true;
		    }
		};
		window.sagecell.kernels = new Proxy( window.sagecell.kernels, arrayChangeHandler );
		
		var d = document.createElement('div');    
		window.sagecell.makeSagecell({inputLocation: d, linked: true});
		// console.log(d);
		var observer = new MutationObserver(function(mutations, observer) {
  		  if (d.children && d.children[0] && d.children[0].children[1]) {
    		     d.children[0].children[1].click();
    		     observer.disconnect();
  		  }
		});
		observer.observe(d, { childList: true, subtree: true });
		// Make sage cells---but make them linked so there's just one kernel.
		window.sagecell.makeSagecell({"inputLocation": ".sage", linked: true});
		window.sagecell.makeSagecell({"inputLocation": ".sageOutput", "hide": ["editor","evalButton"], "autoeval": true, linked: true });
	    }
	    else{
		walkback = walkback * 1.05;
		console.log("Walking back", walkback );
		window.setTimeout(sagecellReady, walkback);
	    }
	}
	sagecellReady();
    });
});

exports.sage = function(code) {
    // Perversely, these are presented out of order -- and despite
    // that fact, the code from setSeed will actually be executed
    // first.
    executeSageSilents();
    return new Promise(function(resolve, reject) {
	setSeed(function() {
	    
	    var output = function(msg) {
		if (msg.msg_type == "error") {
		    reject(msg.content);
		}
		if (msg.msg_type == "execute_result") {
		    resolve( msg.content.data["text/plain"] );
		}
	    };
	    
	    var callbacks = {iopub: {"output": output}};

	    exports.createKernel().then( function(kernel) {
		console.log("sage: ",code);
		
		kernel.execute(code, callbacks, {
		    "silent": false,
		    "user_expressions": {"_sagecell_files": "sys._sage_.new_files()"}
		});
	    });
	});
    });
};

window.sage = function(code) {
    exports.sage(code).then(
	function(result) { console.log(result); },
	function(err) { console.log("err=",err); }
    );
};

