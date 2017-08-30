/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module pre */


const bcrypt = require( 'bcryptjs' );
const boom = require( 'boom' );
const controller = require('lib/controller');
const debug = require( 'debug' )( 'account:lib:pre' );
const Promise = require( 'bluebird' );
const Request = require( 'request' );


/**
 *  Destroys a token
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function destroyToken( request, reply ) {

    debug( 'destroyToken' )

    let uuid;

    if ( request.auth.credentials ) {

        uuid = request.auth.credentials.uuid

    } else {

        uuid = request.pre.tokenEntry.uuid;
    }

    let criteria = { uuid: uuid };

    request.pre.tokenDatabase.destroy( criteria ).then( token => {

        debug( 'destroyToken', uuid )
        reply()

    } )

}

/**
 *  Encrypts incoming password
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function encryptPassword( request, reply ) {

    debug( 'encryptPassword' )

    let salt = bcrypt.genSaltSync( 10 );
    let hash = bcrypt.hashSync( request.payload.password, salt );
    request.payload.encrypted_password = hash;
    reply( request.payload );

}

/**
 *  Returns account database object
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function getDatabaseAccount( request, reply ) {

    debug( 'getDatabaseAccount' )

    reply( request.server.getModel( 'account' ) );

}

/**
 *  Returns token database object
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function getDatabaseToken( request, reply ) {

    debug( 'getDatabaseToken' )

    reply( request.server.getModel( 'token' ) );

}


/**
 *  Check if account exist
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function isAccount( request, reply ) {

    debug( 'isAccount' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        if ( account ) {

            return reply( boom.badRequest( 'Account exists' ) );

        }

        reply( account )

    } )
}

/**
 *  Verify that provided facebook token is valid
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyFacebookToken( request, reply ) {


    let options = request.server.plugins['hapi-account'].options;

    debug('verifyFacebookToken', options)

    let url = {}
    url.access = ('https://graph.facebook.com/oauth/access_token'
    + '?client_id=' + options.facebook.app_id
    +'&client_secret=' + options.facebook.app_secret
    + '&grant_type=client_credentials')


    let p = new Promise( ( resolve, reject ) => {

        debug('verifyFacebookToken', url.access)

        Request(url.access, function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.

            if (error){
                reject(error)

            }else{


                resolve(JSON.parse(body))
            }



        });


    } ).then( response => {

        url.debug = ('https://graph.facebook.com/debug_token?'
        + 'input_token=' + request.payload.token
        + '&access_token=' + response.access_token)

        debug('  url.debug ',  response, url.debug )

        return new Promise( ( resolve, reject ) => {
            Request( url.debug, function ( error, response, body ) {
                console.log( 'error:', error ); // Print the error if one occurred
                console.log( 'statusCode:', response && response.statusCode ); // Print the response status code if a response was received
                console.log( 'body:', body ); // Print the HTML for the Google homepage.

                if ( error ) {
                    reject( error )

                } else {

                    resolve( JSON.parse(body) )
                }

            } );
        })

    } ).then( response => {

        if (response.error){

            return reply( boom.badRequest(response.error.message ) );

        }

        //debug('response debug', response)

        if ( !response.data.is_valid ) {
            return reply( boom.badRequest( 'Not valid facebook access token' ) );
        }

        reply(response.data)

    } ).catch( err => {

        console.error( err )
        reply( boom.badRequest( err ) )

    } )

}


/**
 *  Verify that provided google token is valid
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyGoogleToken( request, reply ) {


    let options = request.server.plugins['hapi-account'].options;

    debug('verifyGoogleToken', options)

    let url = {}
    url.access = ('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+request.payload.token)


    let p = new Promise( ( resolve, reject ) => {

        debug('verifyGoogleToken', url.access)

        Request(url.access, function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.

            if (error){
                reject(error)

            }else{



                resolve(JSON.parse(body) )
            }



        });


    } ).then( response => {


        if (response.aud!=options.google.client_id){

            return reply( boom.unauthorized( response.err ) )

        }

        //Add email
        request.payload.email=response.email;

        reply(response)

    } ).catch( err => {

        console.error( err )
        reply( boom.badRequest( err ) )

    } )

}


/**
 *  Verify that provided token is valid
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyToken( request, reply ) {

    debug( 'verifyToken' );

    let criteria = { uuid: request.payload.token };

    request.pre.tokenDatabase.findOne( criteria ).then( token => {

        if ( !token ) {
            return reply( boom.badRequest( 'Invalid token' ) );
        }

        return reply( token )

    } )
}

/**
 *  Verify that user are valid
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyUser( request, reply ) {

    debug( 'verifyUser' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'verifyUser', account )

        if ( !account ) {
            return reply( boom.notFound( 'Account not found' ) );
        }
        if ( account.verified === false ) {
            return reply( boom.badRequest( 'Account not verified' ) );
        }

        debug( 'verifyUser', account )

        reply( account );

    } )
}


/**
 *  Verify that user is facebook user. Create user if missing
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyOrCreateFacebookUser( request, reply ) {

    debug( 'verifyOrCreateFacebookUser' );

    verifyOrCreateExternalUser( 'facebook', request, reply )

}


/**
 *  Verify that user is google user. Create user if missing
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyOrCreateGoogleUser( request, reply ) {

    debug( 'verifyOrCreateGoogleUser' );

    verifyOrCreateExternalUser( 'google', request, reply )

}

/**
 *  Verify that user is google user. Create user if missing
 *
 * - `type` {string} Type of external verification facebook | google
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyOrCreateExternalUser( type, request, reply ) {

    debug( 'verifyOrCreateExternalUser' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'verifyOrCreateExternalUser', account );

        if ( !account ) {


            let new_account={

                [keyId]: request.payload[keyId],
                type:type,
                verified:true,
                external:request.pre.externalData

            };


            request.payload = new_account;

            debug('verifyOrCreateExternalUser', new_account);


            request.pre.accountDatabase.create(new_account).then(account=> {

                debug( 'verifyOrCreateExternalUser account created' );

                request.server.plugins['hapi-account'].result = account;

                return doEvents( request, 'onPostCreate' )

            }).then(()=>{

                let account = request.server.plugins['hapi-account'].result;

                return reply( account );

            })


        }else{

            if ( account.type != 'facebook' ) {

                return reply( boom.badRequest( 'Not a '+type+' account, account already taken' ) );

            }

            debug( 'verifyUser', account );

            reply( account );


        }


    } )
}



/**
 *  Validate user password
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 */
function verifyPassword( request, reply ) {

    debug( 'verifyPassword' );

    let keyId = request.server.plugins['hapi-account'].options.keyId;

    let criteria = { [keyId]: request.payload[keyId] };

    request.pre.accountDatabase.findOne( criteria ).then( account => {

        debug( 'verifyPassword', request.payload.password, account.password )

        bcrypt.compare( request.payload.password, account.password, function ( err, res ) {

            if ( res !== true ) {
                return reply( boom.forbidden( 'Wrong password' ) );
            }

            request.password = request.encrypted_password;

            delete request.encrypted_password;

            reply( request.payload )

        } );
    } );
}


module.exports={

    'destroyToken':destroyToken,
    'encryptPassword':encryptPassword,
    'getDatabaseAccount':getDatabaseAccount,
    'getDatabaseToken':getDatabaseToken,
    'isAccount':isAccount,
    'verifyFacebookToken':verifyFacebookToken,
    'verifyGoogleToken':verifyGoogleToken,
    'verifyToken':verifyToken,
    'verifyUser':verifyUser,
    'verifyOrCreateFacebookUser':verifyOrCreateFacebookUser,
    'verifyOrCreateGoogleUser':verifyOrCreateGoogleUser,
    'verifyPassword':verifyPassword

}