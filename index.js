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

function isGreencargoUser( request, reply) {

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
}

let config = {};

// Route handler
config.create = {
    pre: [
        { method: isGreencargoUser},
        { method: verifyUniqueUser },
        { method: encryptPassword },
    ],
    validate: {
        payload: {
            user: Joi.string().email().required().description( 'User name' ),
            password: Joi.string().required().description( 'User password' ),
            scope: Joi.array().items( Joi.string().description( 'a scope' ) ).description( 'User scopes' )
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
            user: Joi.string().required(),
            password: Joi.string().required()
        }
    },
    description: 'Login frontend',
    notes: 'Login to use for frontend',
    tags: ['api', 'account'],
    handler: function ( request, reply ) {


        _options.account.findOne( { user: request.payload.user } ).then( account => {

            let secret=bcrypt.hashSync(account.salt, _options.secret)


            let jwt = Jwt.sign( , secret, {
                algorithm: 'HS256',
                expiresIn: "72h"
            } );


        } )


        let account = {

            login: true,

        };

        let Account = request.server.getModel( 'account' );
        Account.update( { user: request.payload.user }, account ).exec( ( err, account ) => {
            const new_token = {
                uuid: uuid.v4(),
                user_id: account.id,
                email: request.payload.email,
                status: 'auth',
                scope: account.scope,
            };

            const Token = request.server.getModel( 'token' );

            Token.create( new_token ).exec( ( err, token ) => {
                if ( err ) {
                    return reply( Boom.badImplementation( err.message ) );
                }

                reply( { jwt: jwt } );

            } );
        } );
    }
};

config.loginBackend = {

    pre: [
        { method: verifyUser },
        { method: verifyPassword },
        { method: verifyAdmin }
    ],
    validate: {
        payload: {
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    },
    description: 'Login backend',
    notes: 'Login to use for backend',
    tags: ['api', 'account'],
    handler: function ( request, reply ) {

        let Account = request.server.getModel( 'account' );
        Account.findOne( { email: request.payload.email } ).exec( ( err, account ) => {

            let data = {
                user_id: account.id,
                email: account.email,
            }

            let id_token = Jwt.sign( data, process.env.JWT_SECRET, {
                algorithm: 'HS256',
                expiresIn: "12h"
            } );


            debug( request.info.host );

            var d = new Date();
            d.setTime( d.getTime() + (0.5 * 24 * 60 * 60 * 1000) );
            var expires = "expires=" + d.toUTCString();

            let cookie = Util.format( 'loredge_jwt=%s; Domain=%s; Path=%s; Expires=%s; HttpOnly',
                id_token,
                request.info.host.split( ':' )[0], //important
                '/',
                expires
            );

            // Heroku terminates ssl at the edge of the network so your hapi site will
            // always be running with a http binding in it's dyno. If you wanted the external
            // facing site to be https then it's necessary to redirect to https. The
            // x-forwarded-proto header is set by heroku to specify the originating protocol
            // of the http request
            // See: https://devcenter.heroku.com/articles/http-routing#heroku-headers
            if ( request.headers['x-forwarded-proto'] == 'https' ) {
                cookie += '; Secure'
            }

            debug( cookie );

            // Rules to set cookie via header in resonse. Appearantly, setting domain
            // to / then one can only change the cookie in the browser if on a page
            // stemming from / e.g. /login /view and /view/myPage will not be able to
            // change it from. Still it will be available.
            reply( { id_token: id_token } ).header( 'Set-Cookie', cookie ).code( 201 );

        } )
    }
};

if ( process.env.ACCESS_CONTROL_ALLOW_ORIGINS ) {

    config.loginBackend.cors = {
        origin: process.env.ACCESS_CONTROL_ALLOW_ORIGINS.split( ',' )
    }
}

config.logout = {
    auth: 'simple',
    description: 'Logout from frontend account',
    notes: 'Logout from frontend account',
    tags: ['api', 'account'],
    handler: function ( request, reply ) {

        const Token = request.server.getModel( 'token' );

        Token.destroy( { uuid: request.auth.credentials.uuid } ).exec( function ( err, token ) {
            if ( err ) {
                console.log( err.message );
            }

            reply( 'logged out' );
        } );
    }
};

config.resendVerificationEmail = {
    description: 'Resend a verification email',
    notes: 'Resends a verification email',
    tags: ['api', 'account'],
    validate: {
        payload: {
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    },
    handler: function ( request, reply ) {

        let Account = request.server.getModel( 'account' );

        Account.findOne( { email: request.payload.email } ).exec( ( err, account ) => {
            if ( err ) {
                return reply( Boom.badImplementation( err.message ) );
            }

            if ( !account ) {
                return reply( Boom.notFound( 'Account not found' ) );
            }

            if ( account.verified === true ) {
                return reply( Boom.badRequest( 'Already verified' ) );
            }

            request.server.methods.email.sendVerificationEmail( request.payload.email );

            reply( 'Email sent' );
        } );

    }
};

config.forgotPassword = {
    validate: {
        payload: {
            email: Joi.string().email().required()
        }
    },
    description: 'Password forgotten',
    notes: 'To change password when it has been forgotten',
    tags: ['api', 'account'],
    handler: function ( request, reply ) {

        let Account = request.server.getModel( 'account' );

        Account.findOne( { email: request.payload.email } ).exec( ( err, account ) => {
            if ( err ) {
                return reply( Boom.badImplementation( err.message ) );
            }

            if ( !account ) {
                return reply( Boom.notFound( 'Account not found' ) );
            }

            //const token = uuid.v1(); //Jwt.sign( { email: account.email }, account.password );
            //
            let Token = request.server.getModel( 'token' );

            const new_token = {
                uuid: uuid.v4(),
                user_id: account.id,
                email: account.email,
                status: 'auth'
            };

            Token.create( new_token ).then( ()=> {

                const mail_data = {
                    email: account.email,
                    token: new_token.uuid
                };

                request.server.methods.email.sendPasswordResetEmail( mail_data );

                reply( 'email sent' );

            } ).catch( ( err )=> {

                reply( Boom.badImplementation( err ) )
            } );


        } );

    }
};

config.accountCreated = {
    description: 'Account created view',
    notes: 'Show after account have been created',
    tags: ['api'],
    handler: function ( request, reply ) {
        reply.view( 'user', {
            email: request.url.query.email,
            type_user_created: true
        } )
    }
};

config.verifyEmail = {
    description: 'Validate token',
    notes: 'Validate a token connected to an email address',
    tags: ['api', 'account'],
    validate: {
        params: {
            token: Joi.string().required().description( 'Unique token' )
        }
    },
    handler: function ( request, reply ) {

        const token_id = request.params.token;

        const Token = request.server.getModel( 'token' );

        Token.findOne( { uuid: token_id } ).exec( ( err, token ) => {
            if ( err ) {
                return reply( Boom.badImplementation( err.message ) );
            }
            if ( !token ) {
                return reply( Boom.notFound( 'Invalid token' ) );
            }

            // TODO: destroy token instead of handling state...

            const used = token.status === 'used' ? true : false;

            if ( !used ) {
                Token.update( { uuid: token_id }, { status: 'used' } ).exec( function ( err, token ) {
                    if ( err ) {
                        console.log( err.message );
                    }
                } );

                let Account = request.server.getModel( 'account' );

                Account.update( { email: token.email }, { verified: true } ).exec( ( err, account ) => {
                    if ( err ) {
                        console.log( err.message );
                    }

                    var User = request.server.getModel( 'user' );

                    User.create( {
                        user_id: account[0].id,
                        emails: account[0].email,
                        invites: 4
                    } ).exec( ( err, user ) => {
                        if ( err ) {
                            console.log( err.message );
                        }
                    } );
                } );

            }

            reply.view( 'user', {
                done: used,
                link_app: request.server.app.uri + '/downloadapp',
                type_account_verified: true
            } );
        } );

    }
};

config.resetPassword = {
    validate: {
        params: {
            token: Joi.string().required().description( 'Unique jwt token' )
        }
    },
    description: 'Reset a password',
    notes: 'Resets a password, called with signed JWT token',
    tags: ['api', 'account'],
    handler: function ( request, reply ) {

        reply.view( 'user', {
            type_reset_password: true
        } );

    }
};

config.changePassword = {
    pre: [
        { method: verifyToken },
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