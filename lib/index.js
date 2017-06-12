/**
 * Created by Mikael Lindahl on 2016-11-29.
 */

'use strict';

/**@module index */

const debug = require( 'debug' )( 'account:lib:index' );
const hapi_auth_bearer_token = require( 'hapi-auth-bearer-token' );
const Cron = require( 'cron' );

const Config=require('./config');
const Routes=require('./routes');

function _attachMethods( m1, m2 ) {

    debug( '_attachMethods', m1 )

    for ( let key in m1 ) {
        m2[key] = m1[key]
    }

    return m2

}


function _attachPreEvents( config, events ) {

    debug( 'attachPreEvents', events );

    events.forEach( e => {

        if ( e.type.slice( 0, 5 ) == 'onPre' ) {

            debug( 'attaching', e.type, 'to' )

            let firstLetter = e.type.slice( 5, 6 ).toLowerCase();
            let key = firstLetter + e.type.slice( 6 );

            delete e['type'];

            config[key].pre.push( e )

        }
    } );

    return config

}

function _addPostEmailEvents( emails, events ) {

    if ( emails ) {

        emails.events.forEach( e => {

            debug( '_addPostEmailEvents', e )

            events.push( {
                type: e.type,
                method: ( request, next ) => {

                    let transporter = emails.transporter;

                    let toEmail = request.server.plugins['hapi-account'].result.account.email;

                    transporter.sendMail( {
                        from: e.from,
                        to: toEmail,
                        subject: e.subject,
                        text: typeof e.text == 'function'
                            ? e.text( request )
                            : e.text,
                        html: typeof e.html == 'function'
                            ? e.html( request )
                            : e.html
                    }, function ( err, info ) {
                        if ( err ) {
                            console.error( err );
                        }

                        next()

                    } );
                }
            } )
        } )
    }

    return events

}

/**
 *  Function called at cron job collecting expired tokens
 *
 * @return promise
 * @api public
 */
function expiredTokenCollector() {

    debug( 'expiredTokenCollector' )

    // Need to have then to work
    this.destroy( { expireAt: { '<': new Date() } } ).then( t => {

        // debug( 'expiredTokenCollector' , t)

    } )

}

function extendExpirationDate() {

    debug( 'extendExpirationDate' )

    let duration = this.options.expire.login;
    let expireAt = Date( new Date().valueOf() + duration );
    let oneDayBack = new Date( new Date().valueOf() - 1*24*3600*1000 );

    let criteria = { lastUsageAt: { '>=': oneDayBack } };
    let update = { expireAt: expireAt };

    this.token.update( criteria, update ).then( token => {

        // debug('extendExpirationDate token',token)

    } )

}

function _formatBasePath( basePath ) {
    if ( basePath[0] == '/' ) {

        basePath = basePath.slice( 1, basePath.length )

    }

    if ( basePath[basePath.length - 1] == '/' ) {

        basePath = basePath.slice( 0, basePath.length - 1 )

    }

    return basePath
}

function _getCronJobs( server, options ) {

    let _cronTime = options.cronTime.ExpiredTokenCollector || '00 */10 * * * *';
    var CronJob = Cron.CronJob;
    let cronJob = new CronJob( _cronTime,
        expiredTokenCollector.bind( server.getModel( 'token' ) ),
        null, true, 'Europe/Stockholm' );
    server.expose( 'cronTimeExipredTokenCollector', cronJob );

    _cronTime = options.cronTime.ExtendExpirationDate || '00 00 00 * * *';
    CronJob = Cron.CronJob;
    cronJob = new CronJob( _cronTime,
        extendExpirationDate.bind( { token: server.getModel( 'token' ), options: options } ),
        null, true, 'Europe/Stockholm' );

    return cronJob

}

function _onPreAuth( request, reply ) {

    debug( '_onPreAuth', request.headers )

    let cookies = {};

    if ( !request.headers.cookie || request.headers.authorization ) {
        return reply.continue();
    }

    request.headers.cookie.split( ';' ).forEach( ( v ) => {

        v = v.split( '=' )
        debug( '_onPreAuth', v )
        cookies[v[0].trim()] = v[1]

    } );

    if ( cookies.token == undefined ) {
        return reply.continue();
    }

    request.headers.authorization = 'Bearer ' + cookies.token;

    reply.continue();

}

function _tokenBearerValidation( uuid, callback ) {

    // With callback(null, true, a_token) sets
    // a_token -> auth.credentials

    debug( '_tokenBearerValidation uuid', uuid );

    const request = this;

    debug( '_tokenBearerValidation request.auth.credentials', request.auth.credentials );

    let Token = request.server.getModel( 'token' );

    Token.findOne( { uuid: uuid } ).then( a_token => {

        debug( '_tokenBearerValidation request.auth.credentials', a_token );

        if ( a_token ) {
            let criteria = { uuid: a_token.uuid };
            let update = { lastUsageAt: new Date() };

            Token.update( criteria, update ).then( a_token => {

                callback( null, true, a_token[0] );

            } );
        } else {

            callback( null, false, a_token );
        }
    } )
}


//let method = {
//    'destroyToken': pre.destroyToken,
//    'encryptPassword': pre.encryptPassword,
//    'expiredTokenCollector': expiredTokenCollector,
//    //'generateToken': generateToken,
//    'getDatabaseAccount': pre.getDatabaseAccount,
//    'getDatabaseToken': pre.getDatabaseToken,
//    'handlerChangePassword': controller.changePassword,
//    'handlerCreate': controller.create,
//    'handlerForgotPassword': controller.forgotPassword,
//    'handlerLogin': controller.login,
//    'handlerLogout': controller.logout,
//    'handlerResetPassword': controller.resetPassword,
//    'handlerUpdateScope': controller.updateScope,
//    'handlerVerifyAccount': controller.verifyAccount,
//    'isAccount': pre.isAccount,
//    'verifyFacebookToken':pre.verifyFacebookToken,
//    'verifyToken': pre.verifyToken,
//    'verifyUser': pre.verifyUser,
//    'verifyPassword': pre.verifyPassword,
//};

/**
 * - `server` Hapi server object
 * - `options` Plugin options object with the following keys:
 *   - `accountVerified` If true then verified property in account is set to false.
 *   Then user can not be login until account been verified. An event chain
 *   have to be triggered such that verifyAccount route is called with valid
 *   token. This can be accomplished by providing a `onPostCreate` `event`
 *   that for example sends an email url that that triggers the verifyAccount
 *   route with valid token.
 *   - `basePath`  base path for route.
 *   - `cronTimes`
 *     - `ExpiredTokenCollector` The time to fire off your job. This can be in the
 *     - `ExtendExpirationDate` The time to fire off your job. This can be in the
 *   form of cron syntax or a JS Date object (see https://www.npmjs.com/package/cron).
 *   - `email` an object with email setup
 *     - `transporter` a [nodemailer](https://www.npmjs.com/package/nodemailer) transporter
 *     - `event` an array of objects with the following
 *       - `type` Post events uses the signature `function(request, next)`.
 *         -  `onPostCreate` used to send verification emails. If defined then
 *          `options.accountVerified` should be false. Thus the email have to provide ulr
 *         that the user can click on to trigger `validateAccountPassword` route in with
 *         valid token. The token is available in
 *         `request.server.plugins['hapi-account'].result.token.uuid`.
 *         -  `onPostForgotPassword` Have to provide url that the user can
 *         click to trigger `resetPassword` route in with a valid  token and
 *         a new password in order to reset a password.
 *       - `from` sender email
 *       - `subject` email subject
 *       - `text` `function(request)` or string to create text body with
 *       - `html` `function(request)` or string to create html body with
 *   - `events` an oarray of objects with the following:
 *     - `type` the extension point event. Pre events uses the signature
 *     `function(request, reply)`and post events `function(request, next)`.
 *     `Request` is the sever request object. `Reply` and `next` is called
 *     to give the control back to the framework. `Reply` can be called with
 *     a object which is assigned to request.pre with key defined in `assign`
 *     (See https://hapijs.com/api#route-handler).
 *       - `onPreChangedPassword` Called before changePassword handler is triggered.
 *       - `onPreCreatePost` Called before `created` handler is triggered.
 *       - `onPreForgotPassword` Called before `forgetPassword` handler is triggered.
 *       - `onPreLogin` Called before `login` handler is triggered.
 *       - `onPreLogout` Called before `logout` handler is triggered.
 *       - `onPreResetPassword` Called before `resetPassword` handler is triggered.
 *       - `onPreVerifyAccount` Called before `verifyAccount` handler is triggered.
 *       - `onPostChangePassword` Called after `changePassword` handler was triggered.
 *       - `onPostCreate` Called after `created` handler was triggered.
 *       - `onPostForgotPassword` Called after `forgotPassword`hanlder was triggered.
 *       - `onPostLogin` Called after `login` handler was triggered.
 *       - `onPostLogout` Called after `logout`handler was triggered.
 *       - `onPostResetPassword` Called after `resetPassword` handler was triggered
 *       - `onPostVerifyAccountPOST` Called after `verifyAccount` route has been
 *       triggered with `account` and `token` objects are available in
 *       'request.plugins['hapi-account'].result'.
 *   - `expire` Object with durations from creation tokens are valid.
 *     - `create` Duration (in seconds) the  token created in `create` route is valid
 *     - `login` Duration (in seconds) the  token created in `login` route is valid
 *     - `forgotPassword` Duration (in seconds) the  token created in `forgotPassword` is valid
 *   - `method` Object user can provide custom function for plugin public methods
 *   e.g. `{isAccount:(request, reply)=>{..stuff}, encryptPassword:(request, reply)=>{...other stuff}}`.
 *   See below for method definitions
 *   - `scopesAllowed` Array with names off the allowed scopes
 * - next Continue registration
 *
 *   @param {object} options
 *   @api public
 */
exports.register = function ( server, options, next ) {

    options.basePath = options.basePath || '';
    options.cronTime = options.cronTime || {};
    options.events = options.events || [];
    options.expire = options.expire || {};
    options.expire = {
        create: options.expire.create || 5*3600*24*1000,
        forgotPassword: options.expire.forgotPassword || 1*3600*24*1000,
        login: options.expire.login || 5*3600*24*1000
    };
    options.scopesAllowed = options.scopesAllowed || ['user', 'admin'];

    options.basePath = _formatBasePath( options.basePath );
    options.events = _addPostEmailEvents( options.emails, options.events )

    debug( 'exports.register options', options );


    let config = Config(options)//_get_config( _attachMethods( options.method, method ), options );
    config = _attachPreEvents( config, options.events );

    // Expose server to options, result variable and cron job. Added
    // to server.plugins['hapi-account']
    server.expose( 'options', options ); // ushc that post evetns e.g. are available
    server.expose( 'result', {} );
    server.expose( 'cronTimeExtendExpirationDate', _getCronJobs( server, options ) );

    // First register hapi auth bearer token plugin and its strategy
    server.register( {

        register: hapi_auth_bearer_token,

    } ).then( () => {

        debug( 'server.auth.strategy' );

        return server.auth.strategy( 'simple', 'bearer-access-token', {
            validateFunc: _tokenBearerValidation
        } )

    } ).then( () => {

        let pre = options.basePath == '' ? '' : '/';

        // Register routes
        server.route( Routes(config, pre, options));

        // To set auth header if Bearer token comes in a cookie
        server.ext( {
            type: 'onPreAuth',
            method: _onPreAuth
        } );

        debug( 'Routes registered' );

        next();
    } )
};

exports.register.attributes = {
    pkg: require( '../package.json' )
};

