/**
 * Created by Mikael Lindahl (s057wl) on 2016-11-29.
 */

'use strict';

const boom = require( 'boom' );
const bcrypt = require( 'bcryptjs' );
const debug = require( 'debug' )( 'account:index' );
const hapi_auth_bearer_token = require( 'hapi-auth-bearer-token' );
const joi = require( 'joi' );
const uuid = require( 'uuid' );
const Promise = require( 'bluebird' );

let _options;

function isGreencargoUser( request, reply ) {

    _options.db.greencargoUser.findOne( { email: request.payload.email } ).then( user=> {

        if ( !user ) {

            return reply( boom.badRequest( 'Not a greencargo user' ) );

        }

        reply( request.payload )

    } )
}

function encryptPassword( request, reply ) {

    let salt = bcrypt.genSaltSync( 10 );
    let hash = bcrypt.hashSync( request.payload.password, salt );
    request.payload.password = hash;
    reply( request.payload );

}

function isAccount( request, reply ) {

    _options.db.account.findOne( { email: request.payload.email } ).then( account=> {

        if ( account ) {

            return reply( boom.badRequest( 'Account exists' ) );

        }

        reply( request.payload )

    } )

}

function generateToken( account, status, expires ) {

    const token = {
        account_id: account.id,
        uuid: uuid.v4(),
        status: status,
        expiresAt: expires || new Date( new Date().valueOf() + 5 * 3600 * 24 )
    };

    return token
}

function verifyToken( request, reply ) {

    _options.db.token.findOne( { uuid: request.payload.token } ).then( token => {

        if ( !token ) {
            return reply( boom.badRequest( 'Invalid token' ) );
        }

        // TODO: Is it really necessary? Accordingly to documentation the reply value are aasigned to request.pre with key defined by assign

        return reply( request.payload )

    } )
}

function verifyUser( request, reply ) {

    _options.db.account.findOne( { email: request.payload.email } ).then( account=> {

        if ( !account ) {
            return reply( boom.notFound( 'Account not found' ) );
        }

        if ( account.verified === false ) {
            return reply( boom.badRequest( 'Email not verified' ) );
        }

        reply( request.payload );

    } ).catch( err=> {

        reply( boom.badImplementation( err.message ) );

    } );
}

function verifyPassword( request, reply ) {

    _options.db.account.findOne( { user: request.payload.user } ).then( account => {

        bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

            if ( res !== true ) {
                return reply( boom.forbidden( 'Wrong password' ) );
            }

            reply( request.payload )

        } );
    } );
}

function getDatabaseAccount( request, reply) {

        reply(request.server.getModel('account'));

}

function getDatabaseToken( request, reply) {

    reply(request.server.getModel('token'));

}

function handlerCreate( request, reply ) {

    let account = request.payload;
    account.verified = false;

    request.pre.account.create( account ).then( account=> {

        let token = generateToken( account, 'new' );

        return request.pre.token.create( {account: account, token:token} )

    } ).then( db=> {

        request.server.plugin['hapi-account'].result=db;

        return _options.onPostCreate( request )


    } ).then( ()=> {

        reply( 'Account created' ).code( 201 );

    } ).catch( err=> {

        reply( boom.badImplementation( err.message ) );

    } );
};

function handlerLogin( request, reply ) {

    _options.db.account.findOne( { user: request.payload.user } ).then( account => {

        return _options.db.token.findOne( { account_id: account.id } ).then( token=> {

            if ( !token ) {

                return generateToken( account, 'login' )

            } else return token

        } )
    } ).then( token=> {

        reply( { token: token.uuid } );


    } ).catch( err=> {

        reply( boom.badImplementation( err.message ) );

    } );
};

function handlerLogout( request, reply ) {

    _options.db.token.destroy( { uuid: request.credentials.token } ).then( ()=> {

        reply( 'logged out' );

    } );
}

function handlerForgotPassword( request, reply ) {


    _options.db.account.findOne( { user: request.payload.user }, account ).then( account => {

        let expires = new Date( new Date().valueOf() + 3600 * 24 );

        return generateToken( account, 'forgot', expires );

    } ).then( result => {

        new Promise(resolve=>{

            return _options.onPostForgotPassword( result, request, resolve );

        });

    } ).then( ()=> {

        reply( 'Forgot token created' )

    } ).catch( ( err )=> {

        reply( boom.badImplementation( err ) )

    } );

}

function handlerChangePassword( request, reply ) => {

    let Account = request.server.getModel( 'account' );

    Account.update( { user: request.payload.user },
        { password: request.payload.password } ).then( account => {

        if ( !account ) {
            return reply( boom.notFound( 'account not found' ) );
        }

        reply( 'password updated' );
    } );

}

function handlerVerifyAccount( request, reply ) {

    _options.db.token.destroy( { uuid: request.payload.token } ).then( token => {

        return _options.db.account.update( { id: token.account_id },
            { verified: true } )

    } ).then( account=> {

        return _options.onPostVerifyEmail( account, request )

    } ).then( ()=> {

        return reply( 'Account verified' )

    } );

};

let config = {};

// Route handler
config.create = {
    pre: [
        { method: isGreencargoUser },
        { method: isAccount },
        { method: encryptPassword },
        { method: getDatabaseAccount, assign:'account' },
        { method: getDatabaseToken , assign:'token'},
    ],
    validate: {
        payload: {
            user: joi.string().required().description( 'User id' ),
            password: joi.string().required().description( 'User password' ),
        }
    },
    description: 'Create account',
    notes: 'To create an account',
    tags: ['api', 'account'],
    handler: handlerCreate
};

config.login = {
    pre: [
        { method: verifyUser },
        { method: verifyPassword },
    ],
    validate: {
        payload: {
            user: joi.string().required().description( 'User id' ),
            password: joi.string().required().description( 'User password' )
        }
    },
    description: 'Login frontend',
    notes: 'Login to use for frontend',
    tags: ['api', 'account'],
    handler: handlerLogin
};

config.logout = {
    auth: 'simple',
    description: 'Logout from frontend account',
    notes: 'Logout from frontend account',
    tags: ['api', 'account'],
    handler: handlerLogout
};

config.forgotPassword = {
    pre: [
        { method: verifyUser }],
    validate: {
        payload: {
            user: joi.string().required().description( 'User id' )
        }
    },
    description: 'Password forgotten',
    notes: 'To change password when it has been forgotten. Need to send email'
    + ' in onPostForgotPassword that provides a link to a reset page. Then '
    + 'resetPassword can be used to reset the password. It can be used '
    + 'during the period the jwt in account field passwordChangeRequest is valid',
    tags: ['api', 'account'],
    handler: handlerForgotPassword
};

config.changePassword = {
    auth: 'simple',
    pre: [
        { method: verifyUser },
        { method: encryptPassword }
    ],
    validate: {
        payload: {
            password: joi.string().required().description( 'New password' ),
            token: joi.string().required().description( 'Token table uuid' )
        }
    },
    tags: ['api', 'account'],
    description: 'Change a password',
    notes: 'To change a password',
    handler: handlerChangePassword
};

config.verifyAccount = {
    pre: [
        { method: verifyToken }
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


/**
 * - `server` Hapi server object
 * - `options` Plugin options object with the following keys:
 *   - `db` Databases
 *      - `account` Account hapi-waterline database object
 *      - `token` Hapi-waterline database to store tokens in
 *      - `greencargoUser` Hapi-waterline database object

 *   - `events` an object or array of objects with the following:
 *      - `type` the extension point event
 *         - `onPreCreate` Called before an account is created.
 *         - `onPostCreate` Called after an account is created. Called in the
 *         order defined in events.
 *         - `onPostCreateVerifyAccount` Called after an account is created. If defined
 *         then verified property in account is set to false and a event chain have
 *         to be triggered such that verifyAccount route is called with valid token.
 *         For example by sending and email with a link to a url that that triggers
 *         the verifyAccount route.
 *         - `onPostForgotPassword` (optional) Function called once token for forgot
 *   password have been generated. Needs to return a promise
 *   - `onPostForgotPassword` (optional) Function called once token for forgot
 *   password have been generated. Needs to return a promise
 *   - `info` Specific info about type of data being progressed
 *   - `total` Total number of ticks to complete
 *   - `append` If true show accumulated tick text separated with comma
 *   - `show` Show configuration object with the following keys:
 *      - `date` Include date before label
 *      - `active` Which bar items to show
 *          - `date` true|false
 *          - `bar` true|false
 *          - `percent` true|false
 *          - `count` true|false
 *          - `time` true|false
 *      - `overwrite` If bar should do line overwrite true|false
 *      - `only_at_completed_rows` If bar ony should be written when a row have completed. Good option
 *         when each print out generates a new row when bar is written to a file stream (e.g. logfile).
 *      - `date` Include date before label
 *          - `color` ANSI color as string
 *      - `label` Object with the following keys:
 *          - `color` ANSI color as string
 *      - `bar` Object with the following keys:
 *          - `color` ANSI color
 *          - `length` bar length
 *          - `completed` character to show fro complete bar tick
 *          - `incompleted` character to show fro incompleted bar
 *          - `tick_per_progress` number of tick one progress step represents (only applicable with overwrite=false)
 *      - `percent` Object with the following keys:
 *          - `color` ANSI color
 *      - `count` Object with the following keys:
 *          - `color` ANSI color
 *      - `time` Object with the following keys:
 *          - `color` ANSI color
 *      - `tick` Object with the following keys:
 *          - `color` ANSI color
 *      - `stream` Stream to write to (process.stdout default)
 * - `draw` Custom draw function `(bar, stream)=>{ The magic ... )`
 *
 *   @param {object} options
 *   @api public
 */
exports.register = function ( server, options, next ) {

    _options = options;

    // Expose plugin options
    server.expose('options', options);

    // Expose variable to store route result data
    server.expose('result', {});

    // First register hapi auth bearer token plugin and its strategy
    server.register( {

        register: hapi_auth_bearer_token,

    } ).then( ()=> {

        return server.auth.strategy( 'simple', 'bearer-access-token', {
            validateFunc: function ( uuid, callback ) {

                debug( 'uuid', uuid )

                const request = this;

                request.auth.credentials = { token: uuid }; // to be used at logout

                _options.db.token.findOne( { uuid: uuid } ).then( a_token => {

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

            { method: 'POST', path: _options.base_path, config: config.create },
            { method: 'POST', path: _options.base_path + '/login', config: config.login },
            { method: 'POST', path: _options.base_path + '/logout', config: config.logout },
            { method: 'POST', path: _options.base_path + '/forgotPassword', config: config.forgotPassword },
            { method: 'POST', path: _options.base_path + '/changePassword', config: config.changePassword },
            { method: 'POST', path: _options.base_path + '/verifyEmail', config: config.verifyEmail },
        ] );

        debug( 'Routes registered' );

        next();
    } )
};

exports.register.attributes = {
    pkg: require('../package.json')
};