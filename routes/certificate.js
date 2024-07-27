var mdb = require('../mdb'),
    async = require('async'),
    _ = require('underscore'),    
    path = require('path'),
    dirname = require('path').dirname,
    normalize = require('path').normalize,    
    extname = require('path').extname,
    pathJoin = require('path').join,
    winston = require('winston');
var crypto = require("crypto");
var path = require("path");
var fs = require("fs");
var zlib = require("zlib");
var querystring = require('querystring');
var url = require('url');

var privateKey = undefined;
var publicKey = undefined;

var absolutePathToPrivateKey = path.resolve("private_key.pem");
if(fs.existsSync(absolutePathToPrivateKey)) {
    privateKey = fs.readFileSync(absolutePathToPrivateKey, "utf8").toString();
} else {
    console.log( "Missing private key file",absolutePathToPrivateKey );
}

var absolutePathToPublicKey = path.resolve("public_key.pem");
if(fs.existsSync(absolutePathToPublicKey)) {
    publicKey = fs.readFileSync(absolutePathToPublicKey, "utf8").toString();
} else {
    console.log( "Missing pubilc key file",absolutePathToPublicKey );
}

function renderError( res, err ) {
    res.status(500).render('fail', { title: "Internal Error", message: err });
}

function certificateToCode(certificate, callback) {
    if (privateKey === undefined) {
	callback( 'Missing private key.' );
    } else {
	var p = JSON.stringify(certificate);
    
	zlib.gzip(p, {level: zlib.Z_BEST_COMPRESSION}, (err, buffer) => {
	    if (err) {
		callback(err);
	    } else {
		const sign = crypto.createSign('RSA-SHA256');
		
		sign.write(buffer);
		sign.end();
		
		var signature = sign.sign(privateKey);
		console.log( signature );
		callback( null,
			  buffer.toString('base64'),
			  signature.toString('base64') );
	    }
	});
    }

    return;
}

function codeToCertificate(code, signature, callback) {
    if (publicKey === undefined) {
	callback( 'Missing public key.' );
    } else {
	const verify = crypto.createVerify('RSA-SHA256');
	var buffer = new Buffer(code, 'base64');

	verify.write(buffer);
	verify.end();
	
	if (verify.verify(publicKey, signature, 'base64')) {
	    zlib.gunzip(buffer, (err, buffer) => {
		if (err) {
		    callback(err);
		} else {
		    var result = {};
		    try {
			result = JSON.parse(buffer.toString("utf8"));
		    } catch (e) {
		    }
		    
		    callback( null, result );
		}
	    });
	} else {
	    callback( 'Invalid signature.' );
	}
    }
}

exports.xourse = function(req, res) {
    var user = req.user;
    var xourse = req.activity;
    console.log(xourse);
    // I need to basically do use
    xourse.path = req.activity.path;
    xourse.locator = '/' + req.repositoryName + '/' + xourse.path;
    xourse.locator = xourse.locator.replace( '.html', '' );
    
    mdb.Completion.find({user: req.user._id, repositoryName: req.repositoryName}).exec(
	function( err, completions ) {
	    if (err) {
		renderError( res, err );
	    } else {
		var activityCount = 0;
		var completionTotal = 0;

		xourse.activityList.forEach( function(activityPath) {
		    var url = pathJoin( xourse.locator,
					activityPath
				      );

		    if (xourse.activities === undefined)
			xourse.activities = {};
		    
		    if (xourse.activities[activityPath] === undefined) {
			xourse.activities[activityPath] = {};
			xourse.activities[activityPath].title = url;
		    }
		    
		    xourse.activities[activityPath].url = '/course/' + normalize(url);

		    xourse.activities[activityPath].completion = 
			_.max( _.filter( completions,
					 function(c) { return c.activityPath == activityPath } )
			       .map(
				   function(c) { return c.complete; } ) );

		    if (xourse.activities[activityPath].completion < 0)
			xourse.activities[activityPath].completion = 0.0;
		    
		    if (!(activityPath.match(/^#/))) {
			activityCount++;
			completionTotal += xourse.activities[activityPath].completion;
		    }
		});

		var score = Math.round(10000*completionTotal / activityCount)/100;
		
		var certificate = {
		    name: req.user.name,
		    email: req.user.email,
		    user: "ximera.osu.edu/users/" + req.user._id,
		    date: new Date(),
		    course: xourse.locator,
		    title: xourse.title,
		    score: score
		};

		certificateToCode( certificate, function(err, code, signature) {
		    if (err) {
			res.render('certificate/xourse', { xourse: xourse,
							   certificate: certificate,
							   score: score
							 });		    
		    } else {
			res.render('certificate/xourse', { xourse: xourse,
							   certificate: certificate,
							   score: score,
							   escapedCode: querystring.escape(code),
							   escapedSignature: querystring.escape(signature)
							 });
		    }
		});
	    }
	});
};

exports.view = function(req, res) {
    var code = querystring.unescape( req.params.certificate );
    var signature = querystring.unescape( req.params.signature );

    codeToCertificate( code, signature, function(err, certificate) {
	if (err) {
	    renderError( res, err );	    
	} else {
	    var escaped = 
		res.render('certificate/view', {escapedCode: querystring.escape(code),
						escapedSignature: querystring.escape(signature),
						publicKey: publicKey,
						certificate: certificate});
	}
    });
    

}
