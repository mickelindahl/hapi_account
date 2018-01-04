/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module pre */


const bcrypt = require( 'bcryptjs' );
const boom = require( 'boom' );
// const controller = require('./controller');
const debug = require( 'debug' )( 'hapi-account:lib:pre' );
// const Promise = require( 'bluebird' );
// const Request = require( 'request' );


/**
 *  Destroys a token
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function destroyToken( request, h ) {

    debug( 'destroyToken' );

    let uuid;

    if ( request.auth.credentials ) {

        uuid = request.auth.credentials.uuid

    } else {

        uuid = request.pre.tokenEntry.uuid;
    }

    let criteria = { uuid: uuid };

    return request.pre.tokenDatabase.destroy( criteria ).then( () => {

        debug( 'destroyToken', uuid );
        return h.continue

    } )

}

/**
 *  Returns account database object
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function getDatabaseAccount( request, h ) {

    debug( 'getDatabaseAccount' );

    return request.server.getModelHapiAccount( 'account' );

}

/**
 *  Returns token database object
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function getDatabaseToken( request, h ) {

    debug( 'getDatabaseToken' );

    return request.server.getModelHapiAccount( 'token' );

}


/**
 *  Check if account exist
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function isAccount( request, h ) {

    debug( 'isAccount' );

     let criteria = { user: request.payload.user };

    let p= request.pre.accountDatabase.findOne( criteria ).then( account => {

        if ( account ) {

            throw boom.badRequest( 'Account exists' );

        }

        return h.continue

    } )

    return p
}

// /**
//  *  Verify that provided facebook token is valid
//  *
//  * - `request` hapi server request object
//  * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
//  *
//  * return {promise}
//  *
//  */
// async function verifyFacebookToken( request, h ) {
//
//     let options = request.server.plugins['hapi-account'].options;
//
//     debug('verifyFacebookToken app_id', options.facebook.app_id, 'app_secret', options.facebook.app_secret);
//
//     let url = {};
//     url.access = ('https://graph.facebook.com/oauth/access_token'
//     + '?client_id=' + options.facebook.app_id
//     +'&client_secret=' + options.facebook.app_secret
//     + '&grant_type=client_credentials')
//
//
//     return new Promise( ( resolve, reject ) => {
//
//         debug('verifyFacebookToken', url.access);
//
//         Request(url.access, function (error, response, body) {
//
//             if (error){
//                 console.error(error);
//                 reject(error)
//
//             }else{
//
//                 resolve(JSON.parse(body))
//
//             }
//         });
//
//
//     } ).then( response => {
//
//         url.debug = ('https://graph.facebook.com/debug_token?'
//         + 'input_token=' + request.payload.token
//         + '&access_token=' + response.access_token);
//
//         debug('verifyFacebookToken url.debug ',  response, url.debug );
//
//         return new Promise( ( resolve, reject ) => {
//             Request( url.debug, function ( error, response, body ) {
//
//                 if ( error ) {
//                     console.error( error );
//                     reject( error )
//
//                 } else {
//
//                     resolve( JSON.parse(body) )
//                 }
//
//             } );
//         })
//
//     } ).then( response => {
//
//         if (response.error){
//
//             throw boom.badRequest(response.error.message ) ;
//
//         }
//
//         if ( !response.data.is_valid ) {
//             throw boom.badRequest( 'Not valid facebook access token' );
//         }
//
//         return {
//             client:request.payload.response,
//             server:response.data
//         }
//
//     } ).catch( err => {
//
//         // console.error( 'Bad request', err );
//         throw boom.badImplementation( err )
//
//     } )
// }
//
//
// /**
//  *  Verify that provided google token is valid
//  *
//  * - `request` hapi server request object
//  * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
//  *
//  * return {promise}
//  *
//  */
// async function verifyGoogleToken( request, h ) {
//
//     let options = request.server.plugins['hapi-account'].options;
//
//     debug('verifyGoogleToken');
//
//     let url = {};
//     url.access = ('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+request.payload.token);
//
//     return new Promise( ( resolve, reject ) => {
//
//         debug('verifyGoogleToken', url.access);
//
//         Request(url.access, function (error, response, body) {
//
//             if (error){
//
//                 reject(error)
//
//             }else{
//
//                 resolve(JSON.parse(body) )
//             }
//         });
//
//
//     } ).then( response => {
//
//
//         if (response.aud!=options.google.client_id){
//
//             throw boom.unauthorized( response.err )
//
//         }
//
//         //Add email
//         request.payload.email=response.email;
//
//         return {
//             client:request.payload.response,
//             server: response
//         }
//
//     } ).catch( err => {
//
//         console.error( err );
//         throw boom.badRequest( err )
//
//     } )
//
// }


/**
 *  Verify that provided token is valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyToken( request, h ) {

    debug( 'verifyToken' );

    let criteria = { uuid: request.payload.token };

    return request.pre.tokenDatabase.findOne( criteria ).then( token => {

        if ( !token ) {
            throw boom.badRequest( 'Invalid token' );
        }

        return token

    } )
}

/**
 *  Verify that user are valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyUser( request, h ) {

    debug( 'verifyUser' );

    let criteria = { user: request.payload.user };

    return request.pre.accountDatabase.findOne( criteria ).then( account => {

        if ( !account ) {
            throw boom.notFound( 'Account not found' );
        }
        if ( account.verified === false ) {
            throw boom.badRequest( 'Account not verified' );
        }

        debug( 'verifyUser', account.user );

        return account;

    } )
}


// /**
//  *  Verify that user is facebook user. Create user if missing
//  *
//  * - `request` hapi server request object
//  * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
//  *
//  * return {promise}
//  *
//  */
// async function verifyOrCreateFacebookUser( request, h ) {
//
//     debug( 'verifyOrCreateFacebookUser' );
//
//     return verifyOrCreateExternalUser( 'facebook', request, h )
//
// }
//
//
// /**
//  *  Verify that user is google user. Create user if missing
//  *
//  * - `request` hapi server request object
//  * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
//  *
//  * return {promise}
//  *
//  */
// async function verifyOrCreateGoogleUser( request, h ) {
//
//     debug( 'verifyOrCreateGoogleUser' );
//
//     return verifyOrCreateExternalUser( 'google', request, h )
//
// }
//
// /**
//  *  Verify that user is google user. Create user if missing
//  *
//  * - `created_by` {string} Type of auth used for creating account facebook | google
//  * - `request` hapi server request object
//  * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
//  *
//  * return {promise}
//  *
//  */
// async function verifyOrCreateExternalUser( created_by, request, h ) {
//
//     debug( 'verifyOrCreateExternalUser' );
//
//     let criteria = { user: request.payload.user};
//
//     request.pre.accountDatabase.findOne( criteria ).then( account => {
//
//         if ( !account ) {
//
//             let new_account={
//
//                 user: request.payload.user,
//                 created_by:created_by,
//                 verified:true,
//                 response:request.pre.responseData
//
//             };
//
//             request.payload = new_account;
//
//             debug('verifyOrCreateExternalUser', new_account);
//
//             request.pre.accountDatabase.create(new_account).then(account=> {
//
//                 debug( 'verifyOrCreateExternalUser created', account.user );
//                 request.server.plugins['hapi-account'].result.account = account;
//
//                 // Need to do post created here
//                 return controller.doEvents( request, 'onPostCreate' )
//
//             }).then(()=>{
//
//                 let account = request.server.plugins['hapi-account'].result.account;
//
//                 return account;
//
//             })
//
//         }else{
//
//             debug( 'verifyOrCreateExternalUser verified',  account.user );
//             return account;
//
//         }
//     } )
// }



/**
 *  Validate user password
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function verifyPassword( request, h ) {

    debug( 'verifyPassword' );

    let criteria = { user: request.payload.user };

    return request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'verifyPassword', request.payload.password, account.password );

        return new Promise((resolve, reject)=>{

            bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

                if ( res !== true ) {
                    resolve( boom.forbidden( 'Wrong password' ) );
                }

                // request.password = request.encrypted_password;

                // delete request.encrypted_password;
                debug('Password verified')

                resolve(request.payload)

            } );
        })

    } );
}


module.exports={

    'destroyToken':destroyToken,
    'getDatabaseAccount':getDatabaseAccount,
    'getDatabaseToken':getDatabaseToken,
    'isAccount':isAccount,
    // 'verifyFacebookToken':verifyFacebookToken,
    // 'verifyGoogleToken':verifyGoogleToken,
    'verifyToken':verifyToken,
    'verifyUser':verifyUser,
    // 'verifyOrCreateFacebookUser':verifyOrCreateFacebookUser,
    // 'verifyOrCreateGoogleUser':verifyOrCreateGoogleUser,
    'verifyPassword':verifyPassword

}