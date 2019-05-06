"Created by Mikael Lindahl on 1/1/18"

"use strict"

/**@module auth */

const debug = require('debug')('hapi-account:lib:auth');

/**
 * If cookie present convert it to auth object
 *
 * - `request` Hapijs request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 */
async function _onPreAuth( request, h ) {

    debug( '_onPreAuth' );

    let cookies = {};

    if ( !request.headers.cookie || request.headers.authorization ) {
        return h.continue;
    }

    request.headers.cookie.split( ';' ).forEach( ( v ) => {

        v = v.split( '=' );
        cookies[v[0].trim()] = v[1]

    } );

    if ( cookies.token == undefined ) {

        debug('_onPreAuth not valid cookie')

        return h.continue;
    }

    request.headers.authorization = 'Bearer ' + cookies.token;

    debug( '_onPreAuth auth', request.headers.authorization );

    return h.continue;

}

/**
 * Set server authentication strategy to hapi bearer
 *
 * - `server` Hapijs server object
 *
 */
async function _tokenBearerValidation( request, uuid, h ) {

    debug( '_tokenBearerValidation token to check', uuid );

    let Account = request.server.getModelHapiAccount( 'account' );
    let Token = request.server.getModelHapiAccount( 'token' );

    try{

        let a_token = await Token.findOne( { uuid: uuid } )

        if ( a_token ) {
            let criteria = { uuid: a_token.uuid };
            let update = { last_usage_at: new Date() };

            a_token = await Token.update( criteria, update ).fetch();

            let account = await Account.findOne({id:a_token[0].account_id});
            a_token[0].scope=account.scope;

            debug('_tokenBearerValidation valid');

            return {isValid: true, credentials:a_token[0]};


        } else {

            debug('_tokenBearerValidation not valid');

            return {isValid: false, credentials:{} };
        }

    }catch(err){

        console.error(err)
        throw err

    }
}

/**
 * Token validation function see [hapi-auth-bearer-token](https://www.npmjs.com/package/hapi-auth-bearer-token)
 *
 * - `request` Hapijs request object
 * - `uuid` Token uuid
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 */
module.exports=function (server, strategy_name){

    server.auth.strategy( strategy_name, 'bearer-access-token', {
        validate: _tokenBearerValidation
    } );

    // To set auth header if Bearer token comes in a cookie
    server.ext( {
        type: 'onPreAuth',
        method: _onPreAuth
    } );

};