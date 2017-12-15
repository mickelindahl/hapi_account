/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module controller*/

const boom = require( 'boom' );
const debug = require( 'debug' )( 'account:lib:controller' );
const Promise = require( 'bluebird' );
const Util = require( 'util' );
const uuid = require( 'uuid' );


function _changePassword( criteria, onPost, request, reply ) {

    let account = { password: request.payload.password };

    request.pre.accountDatabase.update( criteria, account ).then( account => {

        let result = { account: account, token: request.auth.credentials };

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, onPost )

    } ).then( () => {

        reply( 'Password updated' );

    } ).catch( ( err ) => {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );

}


function doEvents( request, event ) {

    let events = [];

    request.server.plugins['hapi-account'].options.events.forEach( e => {

        if ( e.type != event ) {
            return;
        }

        events.push( new Promise( next => {

            e.method( request, next )

        } ) );
    } );

    if ( !events.length ) {
        return Promise.resolve();
    }

    return Promise.all( events );

}


/**
 *  Generates a token
 *
 * - `account` {object} object with account details
 * - `status` {datetime} token status to set
 * - `expires`{integer} date the token is valid to
 *
 */
function _generateToken( account, status, expires ) {

    const token = {
        accountId: account.id,
        uuid: uuid.v4(),
        status: status,
        expireAt: expires,
        scope: account.scope

    };

    debug( '_generateToken', token.uuid );

    return token
}

/**
 *  Handler for change password route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function changePassword( request, reply ) {

    debug( 'changePassword' );

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
 */
function create( request, reply ) {

    debug( 'create' );

    let account = request.payload;
    account.password = account.encrypted_password;
    delete account.encrypted_password;

    account.verified = request.server.plugins['hapi-account'].options.accountVerified ? true : false;

    request.pre.accountDatabase.create( account ).then( account => {

        let token = null;

        // If account is not verified create a token
        // that can be used for verification
        if ( !account.verified ) {
            let duration = request.server.plugins['hapi-account'].options.expire.create;

            let expires = new Date( new Date().valueOf() + duration );

            token = _generateToken( account, 'new', expires );
        }

        debug( 'handlerCreate createToken' );


        // Add new token to token database
        if ( token ) {
            return request.pre.tokenDatabase.create( token ).then( token => {

                return { account: account, token: token }

            } )
        } else {

            return { account: account }
        }

    } ).then( result => {

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostCreate' )

    } ).then( () => {

        let account = request.server.plugins['hapi-account'].result

        delete account.id; // Don't expose id

        reply( account ).code( 201 );

    } ).catch( err => {

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
 */
function forgotPassword( request, reply ) {

    debug( 'forgotPassword' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'forgotPassword account', keyId, account[keyId] );

        let duration = request.server.plugins['hapi-account'].options.expire.forgotPassword;

        let expires = new Date( new Date().valueOf() + duration );

        let token = _generateToken( account, 'forgotPassword', expires );

        return { account: account, token: token }

    } ).then( result => {

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostForgotPassword' )

    } ).then( () => {

        reply( 'Forgot token created' )

    } ).catch( ( err ) => {

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
 */
function login( request, reply ) {

    let criteria = { accountId: request.pre.accountEntry.id };

    debug( 'login account id', criteria.accountId );

    request.pre.tokenDatabase.findOne( criteria ).then( token => {


        if ( token == undefined ) {

            let duration = request.server.plugins['hapi-account'].options.expire.login;

            let expires = new Date( new Date().valueOf() + duration );

            token = _generateToken( request.pre.accountEntry, 'login', expires )

            debug( 'login token uuid', token.uuid );

            return request.pre.tokenDatabase.create( token ).then( token => {

                return token

            } )

        } else {

            debug( 'login token uuid', token.uuid );

            return token
        }

    } ).then( token => {

        return { token: token, account: request.pre.accountEntry }

    } ).then( result => {

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostLogin' ).then( () => {
            return result.token;
        } )

    } ).then( token => {

        var d = new Date();

        let duration = request.server.plugins['hapi-account'].options.expire.login;

        d.setTime( d.getTime() + duration );
        //d.setTime( d.getTime() + (5*24*60*60*1000) );
        var expires = d.toUTCString();

        // REMARK Domain=localhost does not seem to work in google chrome (2016-12-28)
        // in windows instead use Domain=127.0.0.1
        let cookie = Util.format( 'token=%s; Domain=%s; Path=%s; Expires=%s; HttpOnly',
            // id_token,
            token.uuid,
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

        debug( 'login cookie', cookie );

        // Rules to set cookie via header in resonse. Appearantly, setting domain
        // to / then one can only change the cookie in the browser if on a page
        // stemming from / e.g. /login /view and /view/myPage will not be able to
        // change it from. Still it will be available.
        reply().header( 'Set-Cookie', cookie );

        // reply( { token: token.uuid } );

    } ).catch( err => {

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
 */
function logout( request, reply ) {

    debug( 'logout' )

    doEvents( request, 'onPostLogout' ).then( () => {

        reply( 'Logged out' );

    } ).catch( err => {

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
 */
function resetPassword( request, reply ) {

    debug( 'resetPassword' );

    let criteria = { id: request.pre.tokenEntry.accountId };
    let onPost = 'onPostResetPassword';

    _changePassword( criteria, onPost, request, reply )
}

/**
 *  Handler to set an account scope
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function updateScope( request, reply ) {

    debug( 'updateScope' );

    let criteria = { id: request.auth.credentials.accountId };
    let config = request.payload;
    let Account = request.pre.accountDatabase;

    Account.find( criteria ).then( account => {

        let scope = account[0].scope;

        // Add to scope
        scope = config.add.reduce( ( tot, val ) => {

            debug( 'updateScope add', tot.indexOf( val ), val, tot )

            if ( tot.indexOf( val ) == -1 ) {

                tot.push( val )

            }

            return tot

        }, scope );

        //Remove from scope
        scope = scope.reduce( ( tot, val ) => {

            if ( config.remove.indexOf( val ) == -1 ) {

                tot.push( val )
            }

            return tot

        }, [] );

        return { scope: scope }

    } ).then( ( update ) => {

        return Account.update( criteria, update )

    } ).then( () => {

        return doEvents( request, 'onPostUpdateScope' )

    } ).then( () => {

        return reply( 'Scope updated' )

    } ).catch( ( err ) => {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );

}

/**
 *  Handler for verifyAccount route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyAccount( request, reply ) {

    debug( 'verifyAccount' );

    let criteria = { id: request.pre.tokenEntry.accountId };
    let account = { verified: true };

    request.pre.accountDatabase.update( criteria, account ).then( account => {

        let result = { account: account, token: request.pre.tokenEntry };

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostVerifyAccount' )

    } ).then( () => {

        return reply( 'Account verified' )

    } ).catch( ( err ) => {

        console.error( err );
        reply( boom.badImplementation( err ) )

    } );
}

module.exports={

    'doEvents':doEvents,
    'changePassword':changePassword,
    'create':create,
    'forgotPassword':forgotPassword,
    'login':login,
    'logout':logout,
    'resetPassword':resetPassword,
    'updateScope':updateScope,
    'verifyAccount':verifyAccount

}