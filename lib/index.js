/**
 * Created by Mikael Lindahl on 2016-11-29.
 */

'use strict';

const boom = require( 'boom' );
const bcrypt = require( 'bcryptjs' );
const debug = require( 'debug' )( 'account:index' );
const hapi_auth_bearer_token = require( 'hapi-auth-bearer-token' );
const Joi = require( 'joi' );
const Cron = require( 'cron' );
const uuid = require( 'uuid' );
const Promise = require( 'bluebird' );
const Util = require('util');

function _attachMethods(m1,m2){

    debug('_attachMethods', m1)

    for(let key in m1){
        m2[key]=m1[key]
    }

    return m2

}

function _attachPreEvents( config, events ) {

    debug( 'attachPreEvents', events );

    events.forEach( e=> {

        if ( e.type.slice( 0, 5 ) == 'onPre' ) {

            debug('attaching', e.type, 'to')

            let firstLetter = e.type.slice( 5, 6 ).toLowerCase();
            let key = firstLetter + e.type.slice( 6 );

            delete e.type;

            config[key].pre.push( e )

        }
    } );

    return config

}

function _addPostEmailEvents( emails, events ) {

    if ( emails ) {

        emails.events.forEach( e=> {

            debug('_addPostEmailEvents', e)

            events.push( {
                type: e.type,
                method: ( request, next )=> {

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

function _changePassword( criteria, onPost, request, reply ) {

    let account = { password: request.payload.password };

    request.pre.accountDatabase.update( criteria, account ).then( account => {

        let result = { account: account, token: request.auth.credentials };

        request.server.plugins['hapi-account'].result = result;

        return _doEvents( request, onPost )

    } ).then( ()=> {

        reply( 'Password updated' );

    } ).catch( ( err )=> {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );

}

function _doEvents( request, event ) {

    let events = [];

    request.server.plugins['hapi-account'].options.events.forEach( e=> {

        if ( e.type != event ) return;

        events.push( new Promise( next => {

            e.method( request, next )

        } ) );
    } );

    if ( !events.length ) return Promise.resolve();

    return Promise.all( events );

}

/**
 *  Destroys a token
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function destroyToken( request, reply ) {

    debug( 'destroyToken' )

    let uuid;

    if ( request.auth.credentials ) {

        uuid = request.auth.credentials.uuid

    } else {

        uuid = request.pre.tokenEntry.uuid;
    }

    let criteria = { uuid: uuid };

    request.pre.tokenDatabase.destroy( criteria ).then( token=> {

        debug( 'destroyToken', uuid )
        reply()

    } )

}

/**
 *  Encrypts incoming password
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function encryptPassword( request, reply ) {

    debug( 'encryptPassword' )

    let salt = bcrypt.genSaltSync( 10 );
    let hash = bcrypt.hashSync( request.payload.password, salt );
    request.payload.encrypted_password = hash;
    reply( request.payload );

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
    this.destroy( { expireAt: { '<': new Date() } } ).then(t=>{

        // debug( 'expiredTokenCollector' , t)

    })

}

function extendExpirationDate() {

    debug( 'extendExpirationDate' )

    let duration = this.options.expire.login;
    let expireAt = Date( new Date().valueOf() + duration );
    let oneDayBack = new Date( new Date().valueOf() - 1 * 24 * 3600 * 1000 );

    let criteria = { lastUsageAt:{'>=':  oneDayBack } };
    let update = { expireAt: expireAt };

    this.token.update( criteria, update ).then(token=>{

        // debug('extendExpirationDate token',token)

    })

}

function _formatBasePath(basePath){
    if ( basePath[0] == '/' ) {

        basePath = basePath.slice( 1, basePath.length )

    }

    if ( basePath[basePath.length - 1] == '/' ) {

        basePath = basePath.slice( 0, basePath.length - 1 )

    }

    return basePath
}

/**
 *  Generates a token
 *
 * - `account` object with account details
 * - `status` token status to set
 * - `expires` date the token is valid to
 *
 * @param {account|object} object with account details
 * @param {status|datetime} token status to set
 * @param {expires|integer} date the token is valid to
 * @api public
 */
function generateToken( account, status, expires ) {

    const token = {
        accountId: account.id,
        uuid: uuid.v4(),
        status: status,
        expireAt: expires,
        scope: account.scope

    };

    debug('generateToken', token)

    return token
}

function _get_config( method ) {
    let config = {};

    // Route configs

    config.changePassword = {
        auth: 'simple',
        pre: [
            { method: method.getDatabaseAccount, assign: 'accountDatabase' },
            { method: method.encryptPassword }
        ],
        validate: {
            payload: {
                password: Joi.string().required().description( 'New password' ),
            }
        },
        tags: ['api', 'account'],
        description: 'Change a password',
        notes: 'To change a password',
        handler: method.handlerChangePassword
    };

    config.create = {
        pre: [
            { method: method.getDatabaseAccount, assign: 'accountDatabase' },
            { method: method.isAccount },
            { method: method.encryptPassword },
            { method: method.getDatabaseToken, assign: 'tokenDatabase' },
        ],
        validate: {
            payload: Joi.object().keys( {
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
                password: Joi.string().required().description( 'User password' ),
                scope: Joi.array().items( Joi.string() ).description( 'List of valid scopes for user' )

            } ).xor( 'user', 'email' )

        },
        description: 'Create account',
        notes: 'To create an account',
        tags: ['api', 'account'],
        handler: method.handlerCreate
    };

    config.login = {
        pre: [
            { method: method.getDatabaseAccount, assign: 'accountDatabase' },
            { method: method.verifyUser, assign: 'accountEntry' },
            // { method: method.encryptPassword },
            { method: method.verifyPassword },
            { method: method.getDatabaseToken, assign: 'tokenDatabase' },
        ],
        validate: {
            payload: Joi.object().keys( {
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
                password: Joi.string().required().description( 'User password' ),
            } ).xor( 'user', 'email' )

        },
        description: 'Login with an account',
        notes: 'Login with an account',
        tags: ['api', 'account'],
        handler: method.handlerLogin
    };

    config.logout = {
        auth: 'simple',
        pre: [
            { method: method.getDatabaseToken, assign: 'tokenDatabase' },
            { method: method.destroyToken }],
        description: 'Logout from an account',
        notes: 'Logout from an account',
        tags: ['api', 'account'],
        handler: method.handlerLogout
    };

    config.forgotPassword = {
        pre: [
            { method: method.getDatabaseAccount, assign: 'accountDatabase' },
            { method: method.verifyUser }],
        validate: {
            payload: Joi.object().keys( {
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
            } ).xor( 'user', 'email' )
        },
        description: 'Password forgotten',
        notes: 'To trigger password changed when it has been misplaced',
        tags: ['api', 'account'],
        handler: method.handlerForgotPassword
    };

    config.resetPassword = {
        pre: [
            { method: method.getDatabaseToken, assign: 'tokenDatabase' },
            { method: method.verifyToken, assign: 'tokenEntry' },
            { method: method.destroyToken },
            { method: method.encryptPassword },
            { method: method.getDatabaseAccount, assign: 'accountDatabase' }],
        validate: {
            payload: {
                password: Joi.string().required().description( 'New password' ),
                token: Joi.string().required().description( 'Reset password token' )
            }
        },
        description: 'Reset a password',
        notes: 'Resets a password',
        tags: ['api', 'account'],
        handler: method.handlerResetPassword
    };

    config.resetPasswordGet = {
        pre: [
            { method: method.getDatabaseToken, assign: 'tokenDatabase' },
            { method: method.verifyToken, assign: 'tokenEntry' },
            { method: method.destroyToken },
            { method: method.encryptPassword },
            { method: method.getDatabaseAccount, assign: 'accountDatabase' }],
        validate: {
            payload: {
                password: Joi.string().required().description( 'New password' ),
                token: Joi.string().required().description( 'Reset password token' )
            }
        },
        description: 'Reset a password',
        notes: 'Resets a password',
        tags: ['api', 'account'],
        handler: method.handlerResetPassword
    };

    config.verifyAccount = {
        pre: [
            { method: method.getDatabaseToken, assign: 'tokenDatabase' },
            { method: method.verifyToken, assign: 'tokenEntry' },
            { method: method.destroyToken },
            { method: method.getDatabaseToken, assign: 'accountDatabase' },
        ],
        description: 'Validate account',
        notes: 'Validate a user connected to a created account',
        tags: ['api', 'account'],
        validate: {
            payload: {
                token: Joi.string().required().description( 'Unique token' )
            }
        },
        handler: method.handlerVerifyAccount
    };

    return config

}

function _getCronJobs(server, options){

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

/**
 *  Returns account database object
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @return
 * @api public
 */
function getDatabaseAccount( request, reply ) {

    debug( 'getDatabaseAccount' )

    reply( request.server.getModel( 'account' ) );

}

/**
 *  Returns token database object
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function getDatabaseToken( request, reply ) {

    debug( 'getDatabaseToken' )

    reply( request.server.getModel( 'token' ) );

}

/**
 *  Handler for change password route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerChangePassword( request, reply ) {

    debug( 'handlerChangePassword' );

    let criteria = { id: request.auth.credentials.accountId };
    let onPost = 'onPostChangePassword';

    _changePassword( criteria, onPost, request, reply )
}

/**
 *  Handler for create route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerCreate( request, reply ) {

    debug( 'handlerCreate' );

    let account = request.payload;
    account.password=account.encrypted_password;
    delete account.encrypted_password;

    account.verified = request.server.plugins['hapi-account'].options.accountVerified ?
        true :
        false;

    debug( 'handlerCreate' ,account)

    request.pre.accountDatabase.create( account ).then( account=> {

        let token = null;
        if ( !account.verified ) {
            let duration = request.server.plugins['hapi-account'].options.expire.create;

            let expires = new Date( new Date().valueOf() + duration );

            token = generateToken( account, 'new', expires );
        }
        debug( 'handlerCreate createToken' )

        if ( token ) {
            return request.pre.tokenDatabase.create( token ).then( token=> {

                return { account: account, token: token }

            } )
        } else {

            return { account: account }
        }

    } ).then( result=> {

        request.server.plugins['hapi-account'].result = result;

        return _doEvents( request, 'onPostCreate' )

    } ).then( ()=> {

        reply( 'Account created' ).code( 201 );

    } ).catch( err=> {

        console.error( 'Bad implementation', err );
        reply( boom.badImplementation( err ) );

    } );
};

/**
 *  Handler for forgotPassword route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerForgotPassword( request, reply ) {

    debug( 'handlerForgotPassword' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'handlerForgotPassword account', account );

        let duration = request.server.plugins['hapi-account'].options.expire.forgotPassword;

        let expires = new Date( new Date().valueOf() + duration );

        let token = generateToken( account, 'forgotPassword', expires );

        return { account: account, token: token }

    } ).then( result => {

        request.server.plugins['hapi-account'].result = result;

        return _doEvents( request, 'onPostForgotPassword' )

    } ).then( ()=> {

        reply( 'Forgot token created' )

    } ).catch( ( err )=> {

        console.error( err )
        reply( boom.badImplementation( err ) )

    } );

}

/**
 *  Handler for login route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerLogin( request, reply ) {

    debug( 'handlerLogin' );

    let criteria = { accountId: request.pre.accountEntry.id };

    request.pre.tokenDatabase.findOne( criteria ).then( token=> {

        debug('handlerLogin', token);

        if ( token==undefined ) {

            let duration = request.server.plugins['hapi-account'].options.expire.login;

            let expires = new Date( new Date().valueOf() + duration );

            token = generateToken( request.pre.accountEntry, 'login', expires )

            return request.pre.tokenDatabase.create( token ).then( token=> {

                return token

            } )

        }else{
            return token
        }

    } ).then( token=> {

        return { token: token, account: request.pre.accountEntry }

    } ).then( result=> {

        request.server.plugins['hapi-account'].result = result;

        return _doEvents( request, 'onPostLogin' ).then( ()=> {
            return result.token;
        } )


    } ).then( token=> {

        var d = new Date();
        d.setTime(d.getTime() + (5*24*60*60*1000));
        var expires = d.toUTCString();

        // REMARK Domain=localhost does not seem to work in google chrome (2016-12-28)
        // in windows instead use Domain=127.0.0.1
        let cookie=Util.format('token=%s; Domain=%s; Path=%s; Expires=%s; HttpOnly',
            // id_token,
            token.uuid,
            request.info.host.split(':')[0], //important
            '/',
            expires
        );

        // Heroku terminates ssl at the edge of the network so your hapi site will
        // always be running with a http binding in it's dyno. If you wanted the external
        // facing site to be https then it's necessary to redirect to https. The
        // x-forwarded-proto header is set by heroku to specify the originating protocol
        // of the http request
        // See: https://devcenter.heroku.com/articles/http-routing#heroku-headers
        if (request.headers['x-forwarded-proto']=='https'){
            cookie+='; Secure'
        }

        debug(cookie);

        // Rules to set cookie via header in resonse. Appearantly, setting domain
        // to / then one can only change the cookie in the browser if on a page
        // stemming from / e.g. /login /view and /view/myPage will not be able to
        // change it from. Still it will be available.
        reply().header( 'Set-Cookie', cookie);

        // reply( { token: token.uuid } );

    } ).catch( err=> {

        console.error( 'Bad implementation', err );
        reply( boom.badImplementation( err.message ) );

    } );
};

/**
 *  Handler for logout route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerLogout( request, reply ) {

    debug('handlerLogout')

    _doEvents( request, 'onPostLogout' ).then( ()=> {

        reply( 'Logged out' );

    } ).catch( err=> {

        console.error( 'Bad implementation', err );
        reply( boom.badImplementation( err.message ) );

    } );
}

/**
 *  Handler for resetPassword route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerResetPassword( request, reply ) {

    debug( 'handlerResetPassword' );

    let criteria = { id: request.pre.tokenEntry.accountId };
    let onPost = 'onPostResetPassword'

    _changePassword( criteria, onPost, request, reply )
}

/**
 *  Handler for verifyAccount route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function handlerVerifyAccount( request, reply ) {

    debug( 'handlerVerifyAccount' );

    let criteria = { id: request.pre.tokenEntry.accountId };
    let account = { verified: true };

    request.pre.accountDatabase.update( criteria, account ).then( account=> {

        let result = { account: account, token: request.pre.tokenEntry };

        request.server.plugins['hapi-account'].result = result;

        return _doEvents( request, 'onPostVerifyAccount' )

    } ).then( ()=> {

        return reply( 'Account verified' )

    } ).catch( ( err )=> {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );

};

/**
 *  Check if account exist
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function isAccount( request, reply ) {

    debug( 'isAccount' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account=> {

        if ( account ) {

            return reply( boom.badRequest( 'Account exists' ) );

        }

        reply( account )

    } )
}

function _onPreAuth( request, reply ) {

    debug('_onPreAuth', request.headers)

    let cookies = {};

    if ( !request.headers.cookie || request.headers.authorization ) {
        return reply.continue();
    }

    request.headers.cookie.split( ';' ).forEach( ( v )=> {

        v=v.split( '=' )
        debug('_onPreAuth',v)
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

        debug('_tokenBearerValidation request.auth.credentials', a_token);

        if ( a_token ) {
            let criteria = { uuid: a_token.uuid };
            let update = { lastUsageAt: new Date() };

            Token.update( criteria, update ).then( a_token=> {

                callback( null, true, a_token[0] );

            } );
        } else {
            callback( null, false, a_token );
        }
    } )
}

/**
 *  Verify that provided token is valid
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function verifyToken( request, reply ) {

    debug( 'verifyToken' );

    let criteria = { uuid: request.payload.token };

    request.pre.tokenDatabase.findOne( criteria ).then( token => {

        if ( !token ) {
            return reply( boom.badRequest( 'Invalid token' ) );
        }

        return reply( token )

    } )
}

/**
 *  Verify that user are valid
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function verifyUser( request, reply ) {

    debug( 'verifyUser' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    debug('verifyUser', keyId, criteria)

    request.pre.accountDatabase.findOne( criteria ).then( account=> {

        debug('verifyUser', account)

        if ( !account ) {
            return reply( boom.notFound( 'Account not found' ) );
        }
        if ( account.verified === false ) {
            return reply( boom.badRequest( 'Account not verified' ) );
        }

        debug('verifyUser', account)

        reply( account );

    } )
}

/**
 *  Validate user password
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * @param {request|object} hapi server request object
 * @param {reply|object} server reply object
 * @api public
 */
function verifyPassword( request, reply ) {

    debug( 'verifyPassword' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'verifyPassword' ,request.payload.password, account.password)

        bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

            if ( res !== true ) {
                return reply( boom.forbidden( 'Wrong password' ) );
            }

            request.password=request.encrypted_password;

            delete request.encrypted_password;


            reply( request.payload )

        } );
    } );
}

let method = {
    'destroyToken': destroyToken,
    'encryptPassword': encryptPassword,
    'expiredTokenCollector': expiredTokenCollector,
    'generateToken': generateToken,
    'getDatabaseAccount': getDatabaseAccount,
    'getDatabaseToken': getDatabaseToken,
    'handlerChangePassword': handlerChangePassword,
    'handlerCreate': handlerCreate,
    'handlerForgotPassword': handlerForgotPassword,
    'handlerLogin': handlerLogin,
    'handlerLogout': handlerLogout,
    'handlerResetPassword': handlerResetPassword,
    'handlerVerifyAccount': handlerVerifyAccount,
    'isAccount': isAccount,
    'verifyToken': verifyToken,
    'verifyUser': verifyUser,
    'verifyPassword': verifyPassword,
};

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
 * - next Continue registration
 *
 *   @param {object} options
 *   @api public
 */
exports.register = function ( server, options, next ) {

    options.basePath=options.basePath || '';
    options.cronTime=options.cronTime || {};
    options.events=options.events || [];
    options.expire = options.expire || {};
    options.expire= {
            create: options.expire.create || 5 * 3600 * 24 * 1000,
            forgotPassword: options.expire.forgotPassword || 1 * 3600 * 24 * 1000,
            login: options.expire.login || 5 * 3600 * 24 * 1000
        };
    
    options.basePath=_formatBasePath(options.basePath);
    options.events = _addPostEmailEvents( options.emails, options.events )

    debug('exports.register options', options);

    let config = _get_config( _attachMethods(options.method, method) );
    config = _attachPreEvents( config, options.events );

    
    // Expose server to options, result variable and cron job. Added
    // to server.plugins['hapi-account']
    server.expose( 'options', options ); // ushc that post evetns e.g. are available
    server.expose( 'result', {} );
    server.expose( 'cronTimeExtendExpirationDate', _getCronJobs(server,options) );

    // First register hapi auth bearer token plugin and its strategy
    server.register( {

        register: hapi_auth_bearer_token,

    } ).then( ()=> {

        debug( 'server.auth.strategy' );

        return server.auth.strategy( 'simple', 'bearer-access-token', {
            validateFunc: _tokenBearerValidation
        } )

    } ).then( ()=> {

        let pre = options.basePath == '' ? '' : '/';

        // Register routes
        server.route( [

            { method: 'POST', path: pre + options.basePath + '/create', config: config.create },
            { method: 'POST', path: pre + options.basePath + '/login', config: config.login },
            { method: 'POST', path: pre + options.basePath + '/logout', config: config.logout },
            { method: 'POST', path: pre + options.basePath + '/forgotPassword', config: config.forgotPassword },
            { method: 'POST', path: pre + options.basePath + '/resetPassword', config: config.resetPassword },
            { method: 'POST', path: pre + options.basePath + '/changePassword', config: config.changePassword },
            { method: 'POST', path: pre + options.basePath + '/verifyAccount', config: config.verifyAccount },
        ] );

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

