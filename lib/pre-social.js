/**
 *Created by Mikael Lindahl on 2018-01-03
 */

"use strict";

/**@module pre-social */

const boom = require('boom');
const debug = require('debug')('hapi-account:lib:pre-social');
const fetch = require('node-fetch');
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

    request.payload.created_by='facebook';

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

    request.payload.created_by='google';

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

    debug('verifyFacebookToken access_token', request.payload.access_token);

    const token = request.payload.access_token;

    const res = (await fetch(`https://graph.facebook.com/me?access_token=${token}&fields=name,email`)).json();

    debug('verifyFacebookToken response', res);

    if (res.error){

        console.error(res.error);
        throw res.error

    }else{

        // Add facebook user id (email) for account validation/creation
        request.payload.user=res.email;

        // Account verified
        request.payload.verified=true;

        // Add name to meta data
        request.payload.meta={name:res.name};

        return res

    }
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