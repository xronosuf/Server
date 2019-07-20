/* 

This contain the javascript necessary to activate/deactivate the problems on the page according to a provided time limit.

*/

/*
Variables
*/

/*
Functions
*/

// Function to turn a problems off after the provided time limit.
function deactivateProblems() {

    // Old way was using a class with desired attributes. For whatever reason we are currently using CSS and doing it a slightly different way.
    //$(".problemClassDisplay").toggleClass("problemClass problemClassDisplay");

    problem.find('.problem-environment').not('.hint').each( function() {
		// Turn all problems off. No need to check if they are proper "children" since we actually want to turn them all off.
        $(this).persistentData( 'available', false );
	    }
      );
    
    // Old debug Code:
    // document.getElementById("debugElement").innerHTML = "Testing worked up to executing delayed code";

}

function deactivateOnDelay(delayTime) {// This function calls the deactivate function after "delayTime" seconds.
        // Old Debug Code
        // document.getElementById("debugElement").innerHTML = "Testing worked up to executing deactivateOnDelay code";
        
        setTimeout(deactivateProblems, 1000*delayTime);  // sets a timer which calls function deactivateProblems after delayTime milliseconds.
	
}

