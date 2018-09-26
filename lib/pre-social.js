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

        return {
            client:request.payload.response,
            server: response
        }

    } )

}

/**
 *  Verify that user is facebook user. Create user if missing
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyOrCreateFacebookUser( request, h ) {

    debug( 'verifyOrCreateFacebookUser' );

    return verifyOrCreateExternalUser( 'facebook', request, h )

}


/**
 *  Verify that user is google user. Create user if missing
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyOrCreateGoogleUser( request, h ) {

    debug( 'verifyOrCreateGoogleUser' );

    return verifyOrCreateExternalUser( 'google', request, h )

}

/**
 *  Verify that user is google user. Create user if missing
 *
 * - `created_by` {string} Type of auth used for creating account facebook | google
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyOrCreateExternalUser( created_by, request, h ) {

    debug( 'verifyOrCreateExternalUser' );

    let criteria = { user: request.payload.user};

    return request.pre.accountDatabase.findOne( criteria ).then( account => {

        if ( !account ) {

            let new_account={

                user: request.payload.user,
                created_by:created_by,
                verified:true,
                response:request.pre.responseData

            };

            request.payload = new_account;

            debug('verifyOrCreateExternalUser new account', new_account.user);

            return request.pre.accountDatabase.create(new_account).fetch().then(account=> {

                debug( 'verifyOrCreateExternalUser created', account.user );
                request.server.plugins['hapi-account'].result.account = account;

                // Need to do post created here
                return controller.doEvents( request, 'onPostCreate' )

            }).then(()=>{

                let account = request.server.plugins['hapi-account'].result.account;

                return account;

            })

        }else{

            debug( 'verifyOrCreateExternalUser verified',  account.user );
            return account;

        }
    } )
}
module.exports={

    verifyFacebookToken,
    verifyGoogleToken,
    verifyOrCreateFacebookUser,
    verifyOrCreateGoogleUser,

}