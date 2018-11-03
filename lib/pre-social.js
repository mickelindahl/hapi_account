/**
 *Created by Mikael Lindahl on 2018-01-03
 */

"use strict";

/**@module pre-social */

const boom = require('boom');
const controller = require('./controller');
const debug = require('debug')('hapi-account:lib:pre-social');
const Request = require('request');

/**
 *  Verify that provided facebook token is valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function addCreatedByFacebookToPayload( request, h ) {

    request.payload.created_by='facebook'

    return h.continue

}


/**
 *  Verify that provided facebook token is valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function addCreatedByGoogleToPayload( request, h ) {

    request.payload.created_by='google'

    return h.continue

}


/**
 *  Verify that provided facebook token is valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyFacebookToken( request, h ) {

    let options = request.server.plugins['hapi-account'].options;

    debug('verifyFacebookToken app_id', options.facebook.app_id, 'app_secret', options.facebook.app_secret);

    let url = {};
    url.access = ('https://graph.facebook.com/oauth/access_token'
        + '?client_id=' + options.facebook.app_id
        +'&client_secret=' + options.facebook.app_secret
        + '&grant_type=client_credentials');

    return new Promise( ( resolve, reject ) => {

        debug('verifyFacebookToken url.access', url.access);

        Request(url.access, function (error, response, body) {

            if (error){

                reject(boom.badRequest(error))

            }else{

                resolve(JSON.parse(body))

            }
        });
    } ).then( body => {

        url.debug = ('https://graph.facebook.com/debug_token?'
            + 'input_token=' + request.payload.token
            + '&access_token=' + body.access_token);

        debug('verifyFacebookToken url.debug ', url.debug );

        return new Promise( ( resolve, reject ) => {
            Request( url.debug, function ( error, response, body ) {

                if ( error ) {

                    reject( boom.badRequest(error))

                } else {

                    resolve( JSON.parse(body) )
                }

            } );
        })

    } ).then( response => {

        if (response.error){

            throw boom.badRequest(response.error.message ) ;

        }

        if ( !response.data.is_valid ) {
            throw boom.badRequest( 'Invalid facebook access token' );
        }

        request.payload.verified=true
        request.payload.response= {
            client:request.payload.response,
            server:response.data
        }

        return {
            client:request.payload.response,
            server:response.data
        }

    } )
}


/**
 *  Verify that provided google token is valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyGoogleToken( request, h ) {

    let options = request.server.plugins['hapi-account'].options;

    debug('verifyGoogleToken');

    let url = {};
    url.access = ('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+request.payload.token);

    return new Promise( ( resolve, reject ) => {

        debug('verifyGoogleToken', url.access);

        Request(url.access, function (error, response, body) {

            if (error){

                reject(boom.badRequest(error))

            }else{

                resolve(JSON.parse(body) )
            }
        });


    } ).then( response => {


        if (response.aud!=options.google.client_id){

            throw boom.unauthorized( response.err )

        }

        //Add user
        request.payload.user=response.email;

        // Account verified
        request.payload.verified=true
        request.payload.response= {
            client:request.payload.response,
            server:response
        }
        return {
            client:request.payload.response,
            server: response
        }

    } )

}

module.exports={
    addCreatedByFacebookToPayload,
    addCreatedByGoogleToPayload,
    verifyFacebookToken,
    verifyGoogleToken,

}