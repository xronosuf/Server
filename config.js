'use strict';

/**
 * Module Dependencies
 */

var pkg               = require('./package.json');
var dotenv            = require('dotenv');  // https://www.npmjs.com/package/dotenv
var path              = require('path');

// *For Development Purposes*
// Read in environment vars from .env file

dotenv.load();

/**
 * Configuration File
 *
 * Why like this?
 *
 *  - All environmental variables documented in one place
 *  - If I use "." notation it's easy to cut/paste into code
 *  - Unlike JSON, javascript allows comments (which I like)
 *  - Reading package.json here centralizes all config info
 *
 */

var config            = {};

// From package.json
config.name           = pkg.name;
config.version        = pkg.version;
config.description    = pkg.description;
config.company        = pkg.company;
config.author         = pkg.author;
config.keywords       = pkg.keywords;
config.environment    = process.env.NODE_ENV || 'test';

config.port = process.env.PORT || 3000;
config.root = process.env.ROOT_URL || ('https://test.xronos.clas.ufl.edu');// + config.port);

config.logging = false;

config.rateLimit = 1000;

config.gpg               = {};
config.gpg.home          = process.env.GNUPGHOME || (path.join(__dirname, 'gnupg'));
config.repositories      = {};
config.repositories.root = process.env.GIT_REPOSITORIES_ROOT || (path.join(__dirname, 'repositories'));

/**
 * Database Configuration
 */

config.mongodb          = {};
config.mongodb.url      = process.env.XIMERA_MONGO_URL || '127.0.0.1';
config.mongodb.database = process.env.XIMERA_MONGO_DATABASE || 'ximera';

/**
 * Session Configuration
 */

var hour              = 3600000;
var day               = (hour * 24);
var week              = (day * 7);

// Session
config.session                 = {};
config.session.secret          = process.env.XIMERA_COOKIE_SECRET || 'my big secret';
config.session.name            = 'sid';  // Generic - don't leak information
config.session.proxy           = false;  // Trust the reverse proxy for HTTPS/SSL
config.session.resave          = false;  // Forces session to be saved even when unmodified
config.session.saveUninitialized = false; // forces a session that is "uninitialized" to be saved to the store
config.session.cookie          = {};
config.session.cookie.httpOnly = true;   // Reduce XSS attack vector
config.session.cookie.secure   = false;  // Cookies via HTTPS/SSL
config.session.cookie.maxAge   = process.env.SESSION_MAX_AGE || week;

/**
 * Mailing Configuration
 */

config.smtp                    = {};
config.smtp.name               = process.env.SMTP_FROM_NAME    || 'Xronos Team';
config.smtp.address            = process.env.SMTP_FROM_ADDRESS || 'XronosUF@GMail.com';

/**
 * Authorization Configuration
 */

config.localAuth = false;
if (config.environment == 'test') {
    config.localAuth = true;
}

// Github
config.githubAuth              = true;
config.github                  = {};
config.github.clientID         = process.env.GITHUB_CLIENT_ID    || '0a6c17bc5fcf0ecb3a50';
config.github.clientSecret     = process.env.GITHUB_CLIENT_SECRET || '8351323fff8d2295e543fc7e1adbd1b29c1ed864';

// Twitter
config.twitterAuth             = true;
config.twitter                 = {};
config.twitter.consumerKey     = process.env.TWITTER_CONSUMER_KEY    || 'Your Key';
config.twitter.consumerSecret  = process.env.TWITTER_CONSUMER_SECRET || 'Your Secret';

// Google
config.googleAuth              = true;
config.google                  = {};
config.google.clientID         = process.env.GOOGLE_CLIENT_ID    || '963783591793-vrq45adu2davr3a4pcg29g73053t6qde.apps.googleusercontent.com';
config.google.clientSecret     = process.env.GOOGLE_CLIENT_SECRET || 'BW4q3smjIUyJPyY6d8ShmccP';

// LTI
config.ltiAuth        = true;
config.lti            = {};
config.lti.key        = process.env.LTI_KEY    || 'YGuaEYuEKx6btPU6z5f4mk5s5H';
config.lti.secret     = process.env.LTI_SECRET || '9UPzoQFj8VSoCzYrWU0E8SypU2UkeoC2CJTzfFbqjC6sqv8JbQrXfk1HibtWSkJ';

module.exports = config;
