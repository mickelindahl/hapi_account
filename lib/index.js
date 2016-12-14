/**
 * Created by Mikael Lindahl on 2016-11-29.
 */

'use strict';

const boom = require( 'boom' );
const bcrypt = require( 'bcryptjs' );
const debug = require( 'debug' )( 'account:index' );
const hapi_auth_bearer_token = require( 'hapi-auth-bearer-token' );
const Joi = require( 'Joi' );
const Cron = require( 'cron' );
const uuid = require( 'uuid' );
const Promise = require( 'bluebird' );

function changePassword( criteria, onPost, request, reply  ){

    let account = { password: request.payload.password };

    request.pre.accountDatabase.update( criteria, account ).then( account => {

        let result = { account: account, token: request.auth.credentials };

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, onPost )

    } ).then( ()=> {

        reply( 'Password updated' );

    } ).catch( ( err )=> {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );

}

function doEvents( request, event ) {

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

function destroyToken( request, reply ) {

    debug( 'destroyToken', request.auth.credentials)

    let uuid;

    if (request.auth.credentials){

        uuid=request.auth.credentials.uuid

    }else{

        uuid=request.pre.tokenEntry.uuid;
    }

    let criteria = { uuid: uuid };

    request.pre.tokenDatabase.destroy( criteria ).then( token=> {

        debug( 'destroyToken', uuid )
        reply()

    } )

}

function encryptPassword( request, reply ) {

    debug( 'encryptPassword' )

    let salt = bcrypt.genSaltSync( 10 );
    let hash = bcrypt.hashSync( request.payload.password, salt );
    request.payload.password = hash;
    reply( request.payload );

}

function generateToken( account, status, expires ) {

    const token = {
        account_id: account.id,
        uuid: uuid.v4(),
        status: status,
        expiresAt: expires
    };

    return token
}

function getDatabaseAccount( request, reply ) {

    debug( 'getDatabaseAccount' )

    reply( request.server.getModel( 'account' ) );

}

function getDatabaseToken( request, reply ) {

    debug( 'getDatabaseToken' )

    reply( request.server.getModel( 'token' ) );

}

function handlerChangePassword( request, reply ) {

    debug( 'handlerChangePassword' );

    let criteria = { id: request.auth.credentials.account_id };
    let onPost='onPostChangePassword';

    changePassword(criteria, onPost, request, reply)
}

function handlerCreate( request, reply ) {

    debug( 'handlerCreate' );

    let account = request.payload;
    account.verified = request.server.plugins['hapi-account'].options.accountVerified ?
        true :
        false;

    request.pre.accountDatabase.create( account ).then( account=> {

        let token=null;
        if (!account.verified) {
            let duration = request.server.plugins['hapi-account'].options.expire.create ?
            request.server.plugins['hapi-account'].options.expire.create * 1000 :
            5 * 3600 * 24 * 1000;

            let expires = new Date( new Date().valueOf() + duration );

            token = generateToken( account, 'new', expires );
        }
        debug('handlerCreate createToken')

        if (token){
            return request.pre.tokenDatabase.create( token ).then( token=> {

                return { account: account, token: token }

            })
        }else{

            return { account: account }
        }

    } ).then( result=> {

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostCreate' )

    } ).then( ()=> {

        reply( 'Account created' ).code( 201 );

    } ).catch( err=> {

        console.error( 'Bad implementation', err );
        reply( boom.badImplementation( err ) );

    } );
};

function handlerForgotPassword( request, reply ) {

    debug( 'handlerForgotPassword' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'handlerForgotPassword account', account );

        let duration = request.server.plugins['hapi-account'].options.expire.forgotPassword ?
        request.server.plugins['hapi-account'].options.expire.forgotPassword*1000 :
        1 * 3600 * 24  * 1000;

        let expires = new Date( new Date().valueOf() + duration );

        let token = generateToken( account, 'forgot', expires );

        return { account: account, token: token }

    } ).then( result => {

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostForgotPassword' )

    } ).then( ()=> {

        reply( 'Forgot token created' )

    } ).catch( ( err )=> {

        console.error( err )
        reply( boom.badImplementation( err ) )

    } );

}

function handlerLogin( request, reply ) {

    debug( 'handlerLogin' );

    let criteria = { account_id: request.pre.accountEntry.id };

    request.pre.tokenDatabase.findOne( criteria ).then( token=> {

        if ( !token ) {

            let duration = request.server.plugins['hapi-account'].options.expire.login ?
            request.server.plugins['hapi-account'].options.expire.login*1000 :
            5 * 3600 * 24  * 1000;

            let expires = new Date( new Date().valueOf() + duration );

            token = generateToken( request.pre.accountEntry , 'login', expires )

        }

        return { token: token, account: request.pre.accountEntry }

    } ).then( result=> {

        return request.pre.tokenDatabase.create( result.token ).then( token=> {

            return result

        } )

    } ).then( result=> {

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostLogin' ).then( ()=> {
            return result.token;
        } )


    } ).then( token=> {

        reply( { token: token.uuid } );

    } ).catch( err=> {

        console.error( 'Bad implementation', err );
        reply( boom.badImplementation( err.message ) );

    } );
};

function handlerLogout( request, reply ) {

    doEvents( request, 'onPostLogout' ).then( ()=> {

        reply( 'Logged out' );

    } ).catch( err=> {

        console.error( 'Bad implementation', err );
        reply( boom.badImplementation( err.message ) );

    } );
}

function handlerResetPassword( request, reply ) {

    debug( 'handlerResetPassword' );

    let criteria = { id: request.pre.tokenEntry.account_id };
    let onPost='onPostResetPassword'

    changePassword(criteria, onPost, request, reply)
}

function handlerVerifyAccount( request, reply ) {

    debug( 'handlerVerifyAccount' );

    let criteria = { id: request.pre.tokenEntry.account_id };
    let account = { verified: true };

    request.pre.accountDatabase.update( criteria, account ).then( account=> {

        let result = { account: account, token: request.pre.tokenEntry };

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostVerifyAccount' )

    } ).then( ()=> {

        return reply( 'Account verified' )

    } ).catch( ( err )=> {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );

};

function isAccount( request, reply ) {

    debug( 'isAccount' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account=> {

        if ( account ) {

            return reply( boom.badRequest( 'Account exists' ) );

        }

        reply( request.payload )

    } )

}

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

function verifyUser( request, reply ) {

    debug( 'verifyUser' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account=> {

        if ( !account ) {
            return reply( boom.notFound( 'Account not found' ) );
        }
        if ( account.verified === false ) {
            return reply( boom.badRequest( 'Account not verified' ) );
        }

        reply( account );

    } )
}

function verifyPassword( request, reply ) {

    debug( 'verifyPassword' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

            if ( res !== true ) {
                return reply( boom.forbidden( 'Wrong password' ) );
            }

            reply( request.payload )

        } );
    } );
}

function expiredTokenCollector() {

    debug('expiredTokenCollector')

    this.destroy( { expiredAt: { '>': new Date() } } );

}

let config = {};

// Route handler
config.create = {
    pre: [
        { method: getDatabaseAccount, assign: 'accountDatabase' },
        { method: isAccount },
        { method: encryptPassword },
        { method: getDatabaseToken, assign: 'tokenDatabase' },
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
    handler: handlerCreate
};

config.login = {
    pre: [
        { method: getDatabaseAccount, assign: 'accountDatabase' },
        { method: verifyUser, assign: 'accountEntry' },
        { method: verifyPassword },
        { method: getDatabaseToken, assign: 'tokenDatabase' },
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
    handler: handlerLogin
};

config.logout = {
    auth: 'simple',
    pre: [
        { method: getDatabaseToken, assign: 'tokenDatabase' },
        { method: destroyToken }],
    description: 'Logout from an account',
    notes: 'Logout from an account',
    tags: ['api', 'account'],
    handler: handlerLogout
};

config.forgotPassword = {
    pre: [
        { method: getDatabaseAccount, assign: 'accountDatabase' },
        { method: verifyUser }],
    validate: {
        payload: Joi.object().keys( {
            user: Joi.string().description( 'User id' ),
            email: Joi.string().description( 'User email' ),
        } ).xor( 'user', 'email' )
    },
    description: 'Password forgotten',
    notes: 'To trigger password changed when it has been misplaced',
    tags: ['api', 'account'],
    handler: handlerForgotPassword
};

config.resetPassword = {
    pre: [
        { method: getDatabaseToken, assign: 'tokenDatabase' },
        { method: verifyToken, assign: 'tokenEntry' },
        { method: destroyToken },
        { method: encryptPassword },
        { method: getDatabaseAccount, assign: 'accountDatabase' }],
    validate: {
        payload: {
            password: Joi.string().required().description( 'New password' ),
            token: Joi.string().required().description( 'Reset password token' )
        }
    },
    description: 'Reset a password',
    notes: 'Resets a password',
    tags: ['api', 'account'],
    handler: handlerResetPassword
};

config.changePassword = {
    auth: 'simple',
    pre: [
        { method: getDatabaseAccount, assign: 'accountDatabase' },
        { method: encryptPassword }
    ],
    validate: {
        payload: {
            password: Joi.string().required().description( 'New password' ),
        }
    },
    tags: ['api', 'account'],
    description: 'Change a password',
    notes: 'To change a password',
    handler: handlerChangePassword
};

config.verifyAccount = {
    pre: [
        { method: getDatabaseToken, assign: 'tokenDatabase' },
        { method: verifyToken, assign: 'tokenEntry' },
        { method: destroyToken },
        { method: getDatabaseToken, assign: 'accountDatabase' },
    ],
    description: 'Validate account',
    notes: 'Validate a user connected to a created account',
    tags: ['api', 'account'],
    validate: {
        payload: {
            token: Joi.string().required().description( 'Unique token' )
        }
    },
    handler: handlerVerifyAccount
};

function attachPreEvents( config, events ) {

    debug('attachPreEvents');

    events.forEach( e=> {

        if ( e.type.slice(0,5) == 'onPre' ) {

            let firstLetter=e.type.slice(5,6).toLowerCase();
            let key = firstLetter + e.type.slice(6);

            delete e.type;

            config[key].pre.push( e )

        }
    } );

    return config

}

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
 *   - `cronTime` The time to fire off your job. This can be in the
 *   form of cron syntax or a JS Date object (see https://www.npmjs.com/package/cron).
 *   - `events` an object or array of objects with the following:
 *     - `type` the extension point event. Pre events uses the signature
 *     `function(request, reply)`and post events 'function(request, next)`.
 *     `Request` is the sever request object. `Reply` and `next` is called
 *     to give the control back to the framework. `Reply` can be called with
 *     a object which is assigned to request.pre with key defined in `assign`.
 *     See https://hapijs.com/api#route-handler.
 *       - `onPreChangedPassword` Called before changePassword handler is triggered.
 *       - `onPreCreate` Called before created handler is triggered.
 *       - `onPreForgotPassword` Called before forgetPassword handler is triggered.
 *       - `onPreLogin` Called before login handler is triggered.
 *       - `onPreLogout` Called before logout handler is triggered.
 *       - `onPreResetPassword` Called before resetPassword handler is triggered.
 *       - `onPreVerifyAccount` Called before verifyAccount handler is triggered.
 *       - `onPostChangePassword` Called after `changePassword` route has been
 *       triggered with `account` and `token` objects are available in
 *       'request.plugins['hapi-account'].result'.
 *       - `onPostCreate` Called after an account is created with
 *       `account` and `token` (token is onlye created whith `options.accountVerified=true`)
 *       objects are available in 'request.plugins['hapi-account'].result'.
 *       - `onPostForgotPassword` Called after forgot password route has been
 *       triggered  `account` and `token` objects are available in 'request.plugins['hapi-account'].result'.
 *       Have to provide a way for the user to trigger `resetPassword` route in
 *       order to reset a password.
 *       - `onPostLogin` Called after login with `account` and `token` objects are available in
 *       'request.plugins['hapi-account'].result'.
 *       - `onPostLogout` Called after logout
 *       - `onPostResetPassword` Called after `resetPassword` route has been
 *       triggered with `account` and `token` objects are available in
 *       'request.plugins['hapi-account'].result'.
 *       - `onPostVerifyAccount` Called after `verifyAccount` route has been
 *       triggered with `account` and `token` objects are available in
 *       'request.plugins['hapi-account'].result'.
 *   - `expire` Object where the duration (in seconds) in tokens created in different
 *       routes are valid.
 *     - `create` Duration (in seconds) the  token created in `create` route is valid
 *     - `login` Duration (in seconds) the  token created in `login` route is valid
 *     - `forgotPassword` Duration (in seconds) the  token created in `forgotPassword`
 *     route is valid
 * - next Continue registration
 *
 *   @param {object} options
 *   @api public
 */
exports.register = function ( server, options, next ) {

    options.events = options.events ?
        options.events :
        [];

    options.basePath = options.basePath ?
        options.basePath :
        '';

    if (options.basePath[0]=='/'){

        options.basePath=options.basePath.slice(1,options.basePath.length)

    }

    if (options.basePath[options.basePath.length-1]=='/'){

        options.basePath=options.basePath.slice(0,options.basePath.length-1)

    }

    options.expire = options.expire ?
        options.expire :
        {};

    config=attachPreEvents( config, options.events );
    // _options = options;

    // Expose plugin options
    server.expose( 'options', options );

    // Expose variable to store route result data
    server.expose( 'result', {} );

    // Expose cron jon
    let cronTime=options.cronTime || '00 */10 * * * *';
    var CronJob = Cron.CronJob;
    let cronJob = new CronJob( cronTime,
        expiredTokenCollector.bind( server.getModel( 'token' ) ),
        null, true, 'Europe/Stockholm' );
    server.expose( 'cronJob', cronJob );

    // First register hapi auth bearer token plugin and its strategy
    server.register( {

        register: hapi_auth_bearer_token,

    } ).then( ()=> {

        debug( 'server.auth.strategy' )

        return server.auth.strategy( 'simple', 'bearer-access-token', {
            validateFunc: function ( uuid, callback ) {

                debug( 'strategy validateFunc uuid', uuid );

                const request = this;


                debug( 'strategy validateFunc request.auth.credentials', request.auth.credentials );

                request.server.getModel( 'token' ).findOne( { uuid: uuid } ).then( a_token => {

                    // request.auth.credentials is set to a_token

                    if ( a_token ) {
                        callback( null, true, a_token );
                    } else {
                        callback( null, false, a_token );
                    }
                } )
            }
        } )

    } ).then( ()=> {

        let pre = options.basePath=='' ? '' : '/';

        // Register routes
        server.route( [

            { method: 'POST', path: '/'+options.basePath , config: config.create },
            { method: 'POST', path: pre+options.basePath + '/login', config: config.login },
            { method: 'POST', path: pre+options.basePath + '/logout', config: config.logout },
            { method: 'POST', path: pre+options.basePath + '/forgotPassword', config: config.forgotPassword },
            { method: 'POST', path: pre+options.basePath + '/resetPassword', config: config.resetPassword },
            { method: 'POST', path: pre+options.basePath + '/changePassword', config: config.changePassword },
            { method: 'POST', path: pre+options.basePath + '/verifyAccount', config: config.verifyAccount },
        ] );

        debug( 'Routes registered' );

        next();
    } )
};

exports.register.attributes = {
    pkg: require( '../package.json' )
};