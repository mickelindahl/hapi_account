/**
 * Created by Mikael Lindahl (s057wl) on 2016-11-29.
 */

'use strict';

'use strict';

const uuid = require( 'uuid' );
const bcrypt = require( 'bcryptjs' );
const Boom = require( 'boom' );
const Joi = require( 'joi' );
const Hapi_auth_bearer_token=require( 'hapi-auth-bearer-token' );
const debug = require( 'debug' )( 'account' );

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

    _options.db.account.findOne( { email: request.payload.email } ).then( account=> {

        if ( account ) {

            return reply( Boom.badRequest( 'Account exists' ) );

        }

        reply( request.payload )

    } )

}

function generateToken( account, status, expires ) {

    const token={
        account_id: account.id,
        uuid: uuid.v1(),
        status: status,
        expiresAt: expires || new Date(new Date().valueOf()+5*3600*24)
    };

    return _options.db.token.create(token)
}

function verifyToken(request, reply) {

    const Token = request.server.getModel('token');

    _options.db.token.findOne({uuid: request.payload.token}).then(token => {
        if (!token) {
            return reply(Boom.badRequest('Invalid token'));
        } else if (token.status=='!auth'){
            return reply(Boom.badRequest('No authenticated token'));
        }

        request.payload.user_id=token.user_id;
        
        return request.payload
        
    }).then(payload=>{
        
        reply(request.payload);
        
    });
}

function verifyUser( request, reply ) {

    _options.db.account.findOne( { email: request.payload.email } ).then( account=> {

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

    _options.db.account.findOne( { user: request.payload.user } ).then( account => {

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

    _options.db.account.create( account ).then( account=> {

        return _options.onPostCreate( account, request ).then( ()=> {

            return account

        } )

    } ).then(account=>{

        return generateToken(account, 'new');

    } ).then(token=>{

        reply( 'Account created' ).code( 201 );

    }).catch( err=> {

        reply( Boom.badImplementation( err.message ) );

    } );
};

function handlerLogin( request, reply ) {

    _options.db.account.findOne( { user: request.payload.user } ).then( account => {

        return _options.db.token.findOne({account_id:account.id}).then(token=>{

            if (!token){

                return generateToken(account, 'login')

            }else return token

        })
    } ).then(token=>{

        reply( { token: token.uuid } );


    }).catch(err=>{

        reply( Boom.badImplementation( err.message ) );

    });
};

function handlerLogout( request, reply ) {

    _options.db.token.destroy({uuid: request.credentials.token}).then(()=>{

        reply( 'logged out' );

    });
}

function handlerForgotPassword( request, reply ) {


    _options.db.account.findOne( { user: request.payload.user }, account ).then( account => {

        let expires = new Date(new Date().valueOf()+3600*24);

        return generateToken(account, 'forgot', expires);

    } ).then( ( token )=> {

        return _options.onPostForgotPassword( token, request );

    } ).then( ()=> {

        reply( 'Forgot token created' )

    } ).catch( ( err )=> {

        reply( Boom.badImplementation( err ) )

    } );

}

function handlerChangePassword( request, reply ) => {

    let Account = request.server.getModel( 'account' );

    Account.update( { user: request.payload.user },
        { password: request.payload.password } ).then( account  => {

        if ( !account ) {
            return reply( Boom.notFound( 'account not found' ) );
        }

        reply( 'password updated' );
    } );

}


let config = {};

// Route handler
config.create = {
    pre: [
        { method: isGreencargoUser },
        { method: isAccount },
        { method: encryptPassword },
    ],
    validate: {
        payload: {
            user: Joi.string().required().description( 'User id' ),
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
    auth: 'simple',
    pre: [
        {  method: verifyUser},
        {method: encryptPassword }
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
    handler: handlerChangePassword
};

exports.register = function ( server, options, next ) {

    _options = options;

    // First register hapi auth bearer token plugin and strategyt
    server.register( {

        register: Hapi_auth_bearer_token,

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

        ] );

        debug( 'Routes registered' );

        next();
    } )
};

exports.register.attributes = {
    name: 'account',
    version: '1.0.0'
};