/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module pre */


const bcrypt = require( 'bcryptjs' );
const boom = require( 'boom' );
const debug = require( 'debug' )( 'hapi-account:lib:pre' );

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
            throw boom.badRequest( 'Account not found' );
        }
        if ( account.verified === false ) {
            throw boom.badRequest( 'Account not verified' );
        }

        debug( 'verifyUser', account.user );

        return account;

    } )
}

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

                    debug('verifyPassword Wrong password')
                    return resolve( boom.forbidden( 'Wrong password' , res) );
                }

                debug('verifyPassword Password verified')

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
    'verifyToken':verifyToken,
    'verifyUser':verifyUser,
    'verifyPassword':verifyPassword

}