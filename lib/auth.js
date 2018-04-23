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

        v = v.split( '=' )
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

    // With return {isValid: true, credentials:a_token[0]} sets
    // a_token -> auth.credentials

    debug( '_tokenBearerValidation uuid', uuid );

    // const request = this;

    let Token = request.server.getModelHapiAccount( 'token' );

    return Token.findOne( { uuid: uuid } ).then( a_token => {

        if ( a_token ) {
            let criteria = { uuid: a_token.uuid };
            let update = { last_usage_at: new Date() };

            debug( '_tokenBearerValidation token',a_token.status, a_token.uuid );

            return Token.update( criteria, update ).fetch().then( a_token => {

                return {isValid: true, credentials:a_token[0]};

            } );
        } else {

            debug('\'_tokenBearerValidation not valid')

            return {isValid: false, credentials:{} };
        }
    } )
}

/**
 * Token validation function see [hapi-auth-bearer-token](https://www.npmjs.com/package/hapi-auth-bearer-token)
 *
 * - `request` Hapijs request object
 * - `uuid` Token uuid
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 */
module.exports=function (server){

    server.auth.strategy( 'simple', 'bearer-access-token', {
        validate: _tokenBearerValidation
    } );

    // To set auth header if Bearer token comes in a cookie
    server.ext( {
        type: 'onPreAuth',
        method: _onPreAuth
    } );

};