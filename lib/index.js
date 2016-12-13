/**
 * Created by Mikael Lindahl (s057wl) on 2016-11-29.
 */

'use strict';

const boom = require( 'boom' );
const bcrypt = require( 'bcryptjs' );
const debug = require( 'debug' )( 'account:index' );
const hapi_auth_bearer_token = require( 'hapi-auth-bearer-token' );
const Joi = require( 'Joi' );
const Cron=require('cron');
const uuid = require( 'uuid' );
const Promise = require( 'bluebird' );

let _options;

function doEvents(request, event){

    let events=[];

    request.server.plugins['hapi-account'].options.events.forEach(e=>{

        if (e.type!=event) return;

        events.push(new Promise( next => {

            e.method(request, next)

        }));
    });

    if (!events.length) return Promise.resolve();

    return Promise.all(events);

}

function destroyToken( request, reply) {

    debug('destroyToken', request.auth)

    let uuid;

    uuid=request.auth.credentials.token

    request.pre.token.destroy({ uuid:uuid}).then(token=>{

        debug('destroyToken', uuid)
        reply(request.payload)

    })

}

function encryptPassword( request, reply ) {

    debug('encryptPassword')

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

function getDatabaseAccount( request, reply) {

    debug('getDatabaseAccount')

    reply(request.server.getModel('account'));

}

function getDatabaseToken( request, reply) {

    debug('getDatabaseToken')

    reply(request.server.getModel('token'));

}

function handlerCreate( request, reply ) {

    debug('handlerCreate' );

    let account = request.payload;
    account.verified = request.server.plugins['hapi-account'].options.verifyAccount ?
        true:
        false;

    request.pre.account.create( account ).then( account=> {

        let expires=new Date( new Date().valueOf() + 5 * 3600 * 24 );
        let token = generateToken( account, 'new', expires);

        return request.pre.token.create( {token:token} ).then(token=>{

            return {account:account, token:token}

        })

    } ).then( db=> {

        request.server.plugins['hapi-account'].result=db;

        return doEvents(request, 'onPostCreate')

    } ).then( ()=> {

        reply( 'Account created' ).code( 201 );

    } ).catch( err=> {

        console.error('Bad implementation', err);
        reply( boom.badImplementation( err ) );

    } );
};

function handlerLogin( request, reply ) {

    debug('handlerLogin');

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    request.pre.account.findOne( { [keyId]: request.payload[keyId] } ).then( account => {

        return request.pre.token.findOne( { account_id: account.id } ).then( token=> {

            if ( !token ) {

                let expires = new Date( new Date().valueOf() + 5 * 3600 * 24 );
                token = generateToken( account, 'login', expires )

            }

            return {token:token, account:account}

        } )
    } ).then( db=> {

        return request.pre.token.create(db.token).then(token=>{

            return db

        })

    } ).then( db=> {

        request.server.plugins['hapi-account'].result=db;

        return doEvents(request, 'onPostLogin').then(()=>{
            return db.token;
        })


    } ).then( token=> {

        reply( { token: token.uuid } );

    } ).catch( err=> {

        console.error('Bad implementation', err);
        reply( boom.badImplementation( err.message ) );

    } );
};

function handlerLogout( request, reply ) {

        reply( 'Logged out' );

}

function handlerForgotPassword( request, reply ) {

    request.pre.account.findOne( {
        user: request.payload.user }, account ).then( account => {

        let expires = new Date( new Date().valueOf() + 3600 * 24 );

        return generateToken( account, 'forgot', expires );

    } ).then( result => {

        request.server.plugin['hapi-account'].result={
            account:account,
            token:request.pre.token
        };

        return doEvents(request, 'onPostVerifyAccount')

    } ).then( ()=> {

        reply( 'Forgot token created' )

    } ).catch( ( err )=> {

        reply( boom.badImplementation( err ) )

    } );

}

function handlerChangePassword( request, reply ){

    request.pre.account.update( { user: request.payload.user },
        { password: request.payload.password } ).then( account => {

        if ( !account ) {
            return reply( boom.notFound( 'account not found' ) );
        }

        reply( 'password updated' );
    } );

}

function handlerVerifyAccount( request, reply ) {

    request.pre.account.update( { id: request.pre.token.account_id },
            { verified: true } ).then( account=> {

        request.server.plugin['hapi-account'].result={
            account:account,
            token:request.pre.token
        };

        return doEvents(request, 'onPostVerifyAccount')

    } ).then( ()=> {

        return reply( 'Account verified' )

    } );

};

function isAccount( request, reply ) {

    debug('isAccount')

    request.pre.account.findOne( { email: request.payload.email } ).then( account=> {

        if ( account ) {

            return reply( boom.badRequest( 'Account exists' ) );

        }

        reply( request.payload )

    } )

}

function verifyToken( request, reply ) {

    debug('verifyToken')

    request.pre.token.findOne( { uuid: request.payload.token } ).then( token => {

        if ( !token ) {
            return reply( boom.badRequest( 'Invalid token' ) );
        }

        return reply(request.payload)

    } )
}

function verifyUser( request, reply ) {

    debug('verifyUser');

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    request.pre.account.findOne( { [keyId]: request.payload[keyId] } ).then( account=> {

        debug('verifyUser', account);

        if ( !account ) {
            return reply( boom.notFound( 'Account not found' ) );
        }
        if ( account.verified === false ) {
            return reply( boom.badRequest( 'Account not verified' ) );
        }


        reply( request.payload );

    } ).catch( err=> {

        reply( boom.badImplementation( err.message ) );

    } );
}

function verifyPassword( request, reply ) {

    debug('verifyPassword');

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    request.pre.account.findOne( { [keyId]: request.payload[keyId] } ).then( account => {

        bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

            if ( res !== true ) {
                return reply( boom.forbidden( 'Wrong password' ) );
            }

            reply( request.payload )

        } );
    } );
}

function expiredTokenCollector() {

    this.destroy({expiredAt:{'>':new Date()}});

}

let config = {};

// Route handler
config.create = {
    pre: [
        { method: getDatabaseAccount, assign:'account' },
        { method: isAccount },
        { method: encryptPassword },
        { method: getDatabaseToken , assign:'token'},
    ],
    validate: {
        payload: 
            Joi.object().keys({
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
                password: Joi.string().required().description( 'User password' ),
                scope: Joi.array().items(Joi.string()).description('List of valid scopes for user')

            }).xor('user', 'email')

    },
    description: 'Create account',
    notes: 'To create an account',
    tags: ['api', 'account'],
    handler: handlerCreate
};

config.login = {
    pre: [
        { method: getDatabaseAccount, assign:'account' },
        { method: verifyUser },
        { method: verifyPassword },
        { method: getDatabaseToken , assign:'token'},
    ],
    validate: {
        payload: Joi.object().keys({
            user: Joi.string().description( 'User id' ),
            email: Joi.string().description( 'User email' ),
            password: Joi.string().required().description( 'User password' ),
        }).xor('user', 'email')

    },
    description: 'Login with an account',
    notes: 'Login with an account',
    tags: ['api', 'account'],
    handler: handlerLogin
};

config.logout = {
    auth: 'simple',
    pre: [
        { method: getDatabaseToken, assign:'token' },
        { method: destroyToken }],
    description: 'Logout from an account',
    notes: 'Logout from an account',
    tags: ['api', 'account'],
    handler: handlerLogout
};

config.forgotPassword = {
    pre: [
        { method: verifyUser }],
    validate: {
        payload: {
            user: Joi.string().required().description( 'User id' )
        }
    },
    description: 'Password forgotten',
    notes: 'To change password when it has been forgotten.',
    tags: ['api', 'account'],
    handler: handlerForgotPassword
};

config.resetPassword = {
    pre: [
        { method: getDatabaseToken, assign:'token' },
        { method: verifyToken },
        { method: getDatabaseAccount, assign:'account' },
        { method: destroyToken},
        { method: encryptPassword }],
    validate: {
        params: {
            password: Joi.string().required().description( 'New password' ),
            payload: Joi.string().required().description( 'Bearer uuid token' )
        }
    },
    description: 'Reset a password',
    notes: 'Resets a password',
    tags: ['api', 'account'],
    handler: handlerChangePassword
};

config.changePassword = {
    auth: 'simple',
    pre: [
        { method: verifyUser },
        { method: getDatabaseAccount, assign:'account' },
        { method: encryptPassword }
    ],
    validate: {
        payload: {
            password: Joi.string().required().description( 'New password' ),
            token: Joi.string().required().description( 'Bearer uuid token' )
        }
    },
    tags: ['api', 'account'],
    description: 'Change a password',
    notes: 'To change a password',
    handler: handlerChangePassword
};

config.verifyAccount = {
    pre: [
        { method: getDatabaseToken, assign:'token' },
        { method: verifyToken },
        { method: destroyToken, assign:'token'  }
    ],
    description: 'Validate account',
    notes: 'Validate a user connected to a created account',
    tags: ['api', 'account'],
    validate: {
        params: {
            token: Joi.string().required().description( 'Unique token' )
        }
    },
    handler: handlerVerifyAccount
};


function attachPreEvents(events){

    events.forEach(e=>{

        if (e.type=='onPreCreate'){

            config.pre.push(e)

        }
    })
}

/**
 * - `server` Hapi server object
 * - `options` Plugin options object with the following keys:
 *   - `basePath`  base path for route.
 *   - `events` an object or array of objects with the following:
 *     - `type` the extension point event. Pre events uses the signature
 *     `function(request, reply)`and post events 'function(request, next)`.
 *     `Request` is the sever request object. `Reply` and `next` is called
 *     to give the control back to the framework. `Reply` can be called with
 *     a object which is assigned to request.pre with key defined in `assign`.
 *     See https://hapijs.com/api#route-handler.
 *       - `onPreCreate` Called before an account is created.
 *       - `onPostCreate` Called after an account is created with
 *       `account` and `token` objects are available in
 *       'request.plugins['hapi-account'].result'.
 *       - onPostLogin Called after login
 *       - `onPostForgotPassword` Called after forgot password route has been
 *       triggered. Have to be provide a way for the user to trigger `resetPassword`
 *       route in order to reset a password.
 *       - `onPostVerifyAccount` Called after verifyAccount` route has been
 *       triggered.
 *   - `verifyAccount` If true then verified property in account is set to false.
 *   Then user can not be login until account been verified. An event chain
 *   have to be triggered such that verifyAccount route is called with valid
 *   token. This can be accomplished by providing a `onPostCreate` `event`
 *   that for example sends an email url that that triggers the verifyAccount
 *   route with valid token.
 * - next Continue registration
 *
 *   @param {object} options
 *   @api public
 */
exports.register = function ( server, options, next ) {

    options.events=options.events ?
        options.events :
        [];

    options.basePath=options.basePath ?
        options.basePath:
        '';

    attachPreEvents(options.events);
    // _options = options;

    // Expose plugin options
    server.expose('options', options);

    // Expose variable to store route result data
    server.expose('result', {});

    // Expose cron jon
    var CronJob = Cron.CronJob;
    let cronJob = new CronJob('00 */10 * * * *',
        expiredTokenCollector.bind(server.getModel('token')),
        null, true, 'Europe/Stockholm');
    server.expose('cronJob', cronJob);

    // First register hapi auth bearer token plugin and its strategy
    server.register( {

        register: hapi_auth_bearer_token,

    } ).then( ()=> {

        debug('server.auth.strategy')

        return server.auth.strategy( 'simple', 'bearer-access-token', {
            validateFunc: function ( uuid, callback ) {

                debug( 'strategy validateFunc uuid', uuid );

                const request = this;

                request.auth.credentials = { token: uuid }; // to be used at logout

                request.server.getModel('token').findOne( { uuid: uuid } ).then( a_token => {

                    if ( a_token ) {
                        callback( null, true, a_token );
                    } else {
                        callback( null, false, a_token );
                    }
                } ).catch( err=> {

                    callback( err )

                } );
            }
        } )

    } ).then( ()=> {

        // Register routes
        server.route( [

            { method: 'POST', path: options.basePath + '/', config: config.create },
            { method: 'POST', path: options.basePath + '/login', config: config.login },
            { method: 'POST', path: options.basePath + '/logout', config: config.logout },
            { method: 'POST', path: options.basePath + '/forgotPassword', config: config.forgotPassword },
            { method: 'POST', path: options.basePath + '/changePassword', config: config.changePassword },
            { method: 'POST', path: options.basePath + '/verifyAccount', config: config.verifyAccount },
        ] );

        debug( 'Routes registered' );

        next();
    } )
};

exports.register.attributes = {
    pkg: require('../package.json')
};