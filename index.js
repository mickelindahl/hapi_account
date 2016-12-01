/**
 * Created by Mikael Lindahl (s057wl) on 2016-11-29.
 */

'use strict';

'use strict';

const uuid = require( 'uuid' );
const bcrypt = require( 'bcryptjs' );
const Boom = require( 'boom' );
const Joi = require( 'joi' );
const Jwt = require( 'jsonwebtoken' );
const debug = require( 'debug' )( 'account' );
const Util = require( 'util' );

let _options;

function isGreencargoUser( request, reply ) {

    _options.greencargoUser.findOne( { email: request.payload.email } ).then( user=> {

        if ( !user ) {

            return reply( Boom.badRequest( 'Not a greencargo user' ) );

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

    _options.account.findOne( { email: request.payload.email } ).then( account=> {

        if ( account ) {

            return reply( Boom.badRequest( 'Account exists' ) );

        }

        reply( request.payload )

    } )

}

function verifyJWT( request, reply ) {

    _options.account.findOne( { email: request.payload.email } ).then( account=> {

        let secret = bcrypt.hashSync( _secret, account.salt );

        Jwt.verify( request.headers.authorization, secret,
            ( err, decoded )=> {

                if ( err ) {
                    reply( Boom.badRequest( 'Invalid JWT' ) );
                }

                request.auth.credentials = decoded;

                reply.continue();

            }
        );

        reply( request.payload )

    } );
}

function verifyUser( request, reply ) {

    _options.account.findOne( { email: request.payload.email } ).then( account=> {

        if ( !account ) {
            return reply( Boom.notFound( 'Account not found' ) );
        }

        if ( account.verified === false ) {
            return reply( Boom.badRequest( 'Email not verified' ) );
        }

        reply( request.payload );

    } ).catch( err=> {

        reply( Boom.badImplementation( err.message ) );

    } );
}

function verifyPassword( request, reply ) {

    _options.account.findOne( { user: request.payload.user } ).then( account => {

        bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

            if ( res !== true ) {
                return reply( Boom.forbidden( 'Wrong password' ) );
            }

            reply( request.payload )

        } );
    } );
}


function handlerCreate( request, reply ) {

    let account = request.payload;
    account.verified = _options.verified;
    account.salt = bcrypt.genSaltSync( 10 );

    _options.account.create( account ).then( account=> {

        return _options.onPostCreate( account, request ).then( ()=> {

            reply( account ).code( 201 );

        } )

    } ).catch( err=> {

        reply( Boom.badImplementation( err.message ) );

    } );
};

function handlerLogin( request, reply ) {

    _options.account.findOne( { user: request.payload.user } ).then( account => {

        let secret = bcrypt.hashSync( account.salt, _options.secret );

        return Jwt.sign( {}, secret, {
            algorithm: 'HS256',
            expiresIn: "72h"
        } );
    } ).then( jwt=> {

        return _options.account.update( { user: request.payload.user }, { login: true } ).then( ()=> {

            reply( { jwt: jwt } );

        } );
    } );
};

function handlerLogout( request, reply ) {


    let account = {

        login: true,
        salt: bcrypt.genSaltSync( 10 )

    };

    _options.account.update( { user: request.payload.user }, account ).then( ()=> {

        reply( 'logged out' );

    } );
}

function handlerForgotPassword( request, reply ) {


    _options.account.findOne( { user: request.payload.user }, account ).then( account => {

        let secret = bcrypt.hashSync( account.salt, _options.secret );

        let jwt = Jwt.sign( {}, secret, {
            algorithm: 'HS256',
            expiresIn: "72h"
        } );

        account.passwordChangeRequested = jwt;

        return _options.account.update( { user: request.payload.user }, account );

    } ).then( ( account )=> {

        return _options.onPostForgotPassword( account, request );

    } ).then( ()=> {

        reply( 'email sent' )

    } ).catch( ( err )=> {

        reply( Boom.badImplementation( err ) )

    } );

}

let config = {};

// Route handler
config.create = {
    pre: [
        { method: isGreencargoUser },
        { method: verifyUniqueUser },
        { method: encryptPassword },
    ],
    validate: {
        payload: {
            user: Joi.string().email().required().description( 'User id' ),
            password: Joi.string().required().description( 'User password' ),
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
            user: Joi.string().required().description( 'User id' ),
            password: Joi.string().required().description( 'User password' )
        }
    },
    description: 'Login frontend',
    notes: 'Login to use for frontend',
    tags: ['api', 'account'],
    handler: handlerLogin
};

config.logout = {
    auth: 'jwt',
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
            user: Joi.string().required().description( 'User id' )
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
    auth: 'jwt',
    pre: [
        { method: encryptPassword }
    ],
    validate: {
        payload: {
            password: Joi.string().required().description( 'New password' ),
            token: Joi.string().required().description( 'Token table uuid' )
        }
    },
    tags: ['api', 'account'],
    description: 'Change a password',
    notes: 'To change a password',
    handler: ( request, reply ) => {

        let Account = request.server.getModel( 'account' );

        Account.findOne( { id: request.payload.user_id } ).exec( ( err, account ) => {
            if ( err ) {
                return reply( Boom.badImplementation( err.message ) );
            }

            if ( !account ) {
                return reply( Boom.notFound( 'account not found' ) );
            }

            Account.update( { id: request.payload.user_id }, { password: request.payload.password } ).exec( ( err, account ) => {
                if ( err ) {
                    return reply( Boom.notFound( 'account not found' ) );
                }

                if ( !account || account.length !== 1 ) {
                    return reply( Boom.notFound( 'account not found' ) );
                }

                reply( 'password updated' );
            } );
        } );
    }
};

var after = function ( server, next ) {

    // Register routes
    server.route( [
        { method: 'POST', path: '/account/invite', config: config.createWithInvite },
        { method: 'POST', path: '/account', config: config.create },
        { method: 'POST', path: '/account/login', config: config.login },
        { method: 'POST', path: '/account/loginBackend', config: config.loginBackend },
        { method: 'POST', path: '/account/logout', config: config.logout },
        { method: 'POST', path: '/account/forgotPassword', config: config.forgotPassword },
        { method: 'GET', path: '/account/created', config: config.accountCreated },
        { method: 'GET', path: '/account/verifyEmail/{token}', config: config.verifyEmail },
        {
            method: 'POST',
            path: '/account/resendVerificationEmail',
            config: config.resendVerificationEmail
        },
        { method: 'GET', path: '/account/resetPassword/{token}', config: config.resetPassword },
        { method: 'POST', path: '/account/changePassword', config: config.changePassword },

        // Old routes keep for old versions of Loredge
        //{ method: 'POST', path: '/account/invite', config: config.createWithInvite }, // Need to change?
        { method: 'POST', path: '/login', config: config.login },
        { method: 'POST', path: '/logout', config: config.logout },
        { method: 'POST', path: '/forgotPassword', config: config.forgotPassword },
        { method: 'GET', path: '/resetPassword/{token}', config: config.resetPassword },
        { method: 'POST', path: '/changePassword', config: config.changePassword }

    ] );

    debug( 'Routes registered' );

    next();
};

exports.register = function ( server, options, next ) {

    _options = options;

    // auth strategy for logout
    if ( options.auth ) {
        config.logout.auth = options.auth;
    }

    // Dependencies
    server.dependency( 'hapi-auth-bearer-token', after );

    next();
};

exports.register.attributes = {
    name: 'account',
    version: '1.0.0'
};