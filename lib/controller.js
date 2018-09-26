/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module controller*/

const boom = require( 'boom' );
const debug = require( 'debug' )( 'hapi-account:lib:controller' );
const Util = require( 'util' );
const uuid = require( 'uuid' );

/**
 *  Change password in database
 *
 * - `criteria` {object} database criteria for password change'
 * - `event_type` {string} event type
 * - `request` {object} hapijs request object
 *
 * return {promise}
 *
 */
async function _changePassword( criteria, event_type, request ) {

    let account = { password: request.payload.password };

    return request.pre.accountDatabase.update( criteria, account ).then( account => {

        let result = { account: account, token: request.auth.credentials };

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, event_type )

    } ).then( () => {

        return 'Password updated';

    } ).catch( ( err ) => {

        // console.error( 'Bad implementation', err );
        throw boom.badImplementation( err );

    } );

}

/**
 *  Run methods associated with an event type
 *
 * - `request` {object} hapijs request object
 * - `event_type` {string} event type
 *
 * return {promise}
 *
 */
async function doEvents( request, event_type ) {

    let events = [];

    request.server.plugins['hapi-account'].options.events.forEach( e => {

        if ( e.type != event_type ) {
            return;
        }

        events.push( e.method( request));

    } );

    if ( !events.length ) {
        return Promise.resolve();
    }

    return Promise.all( events )

}


/**
 *  Generates a token
 *
 * - `account` {object} object with account details
 * - `status` {datetime} token status to set
 * - `expires`{integer} date the token is valid to
 *
 * return {promise}
 *
 */
function _generateToken( account, status, expires ) {

    const token = {
        account_id: account.id,
        uuid: uuid.v4(),
        status: status,
        expire_at: expires,
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
 * return {promise}
 *
 */
async function changePassword( request ) {

    debug( 'changePassword' );

    let criteria = { id: request.auth.credentials.account_id };
    let event_type = 'onPostChangePassword';

    return _changePassword( criteria, event_type, request )
}

/**
 *  Handler for create route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function create( request, h ) {

    debug( 'create' );

    let account = request.payload;
    account.verified = account.verified || request.server.plugins['hapi-account'].options.accountVerified ? true : false;

    return request.pre.accountDatabase.create( account ).fetch().then( account => {

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
            return request.pre.tokenDatabase.create( token ).fetch().then( token => {

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

        return h.response(account).code(201)

    } ).catch( err => {

        // debug( 'Bad implementation', err );
        throw boom.badImplementation( err );

    } );
};


/**
 *  Handler for forgotPassword route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function forgotPassword( request, h ) {

    debug( 'forgotPassword' );

    let criteria = { user: request.payload.user };

    try{

        const account = await request.pre.accountDatabase.findOne( criteria )

        let duration = request.server.plugins['hapi-account'].options.expire.forgotPassword;

        let expires = new Date( new Date().valueOf() + duration );

        let token = _generateToken( account, 'forgotPassword', expires );

        await request.server.getModel('token').create(token)

        let result =  { account, token}

        request.server.plugins['hapi-account'].result = result;

        await doEvents( request, 'onPostForgotPassword' )



        return'Forgot token created'

    }catch(err){

        debug('err',err)

        return boom.badImplementation( err )

    }

    // return request.pre.accountDatabase.findOne( criteria ).then( account => {
    //
    //     debug( 'forgotPassword account', account.user );
    //
    //
    //     return { account: account, token: token }
    //
    // } ).then( result => {
    //
    //     request.server.plugins['hapi-account'].result = result;
    //
    //     return
    //
    // } ).then( () => {
    //
    //     return'Forgot token created'
    //
    // } ).catch( err => {
    //
    //     // console.error( 'Bad implementation', err );
    //     throw boom.badImplementation( err )
    //
    // } );

}

/**
 *  Handler for login route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function login( request, h ) {

    let criteria = { account_id: request.pre.accountEntry.id };

    debug( 'login account id', criteria.account_id );

    return request.pre.tokenDatabase.findOne( criteria ).then( token => {


        if ( token == undefined ) {

            let duration = request.server.plugins['hapi-account'].options.expire.login;

            let expires = new Date( new Date().valueOf() + duration );

            token = _generateToken( request.pre.accountEntry, 'login', expires );

            debug( 'login token uuid', token.uuid);

            return request.pre.tokenDatabase.create( token ).fetch().then( token => {

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
        return h.response('ok').header( 'Set-Cookie', cookie );

        // reply( { token: token.uuid } );

    } ).catch( err => {

        debug( 'Bad implementation', err );
        throw boom.badImplementation( err.message );

    } );
};

/**
 *  Handler for logout route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function logout( request, h ) {

    debug( 'logout' )

    return doEvents( request, 'onPostLogout' ).then( () => {

        return 'Logged out';

    } ).catch( err => {

        // console.error( 'Bad implementation', err );
        throw boom.badImplementation( err.message );

    } );
}

/**
 *  Handler for resetPassword route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function resetPassword( request, h ) {

    debug( 'resetPassword' );

    let criteria = { id: request.pre.tokenEntry.account_id };
    let onPost = 'onPostResetPassword';

    return _changePassword( criteria, onPost, request )
}

/**
 *  Handler to set an account scope
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function updateScope( request, h ) {

    debug( 'updateScope' );

    let criteria = { id: request.auth.credentials.account_id };
    let config = request.payload;
    let Account = request.pre.accountDatabase;

    return Account.find( criteria ).then( account => {

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

        return 'Scope updated'

    } ).catch( ( err ) => {

        // console.error( 'implementation', err );
        throw boom.badImplementation( err )

    } );

}

/**
 *  Handler for verifyAccount route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyAccount( request, reply ) {

    debug( 'verifyAccount' );

    let criteria = { id: request.pre.tokenEntry.account_id };
    let account = { verified: true };

    return request.pre.accountDatabase.update( criteria, account ).then( account => {

        let result = { account: account, token: request.pre.tokenEntry };

        request.server.plugins['hapi-account'].result = result;

        return doEvents( request, 'onPostVerifyAccount' )

    } ).then( () => {

        return 'Account verified'

    } ).catch( ( err ) => {

        // console.error('Bad implementation', err );
        throw boom.badImplementation( err )

    } );
}

module.exports={

    doEvents,
    changePassword,
    create,
    forgotPassword,
    login,
    logout,
    resetPassword,
    updateScope,
    verifyAccount

}