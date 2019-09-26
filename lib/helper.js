/**
 *Created by Mikael Lindahl on 2019-05-06
 */

"use strict";


const debug = require( 'debug' )( 'hapi-account:lib:helper' );
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
async function changePassword( criteria, event_type, request ) {

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
function generateToken( account, status, expires, device, current ) {

    let token;

    if (current){

        token={...current};

    }else{

        token = {
            account_id: account.id,
            device_id:device ? device.id : null,
            status: status,
            expire_at: expires ?expires: null,
            scope: account.scope

        };
    }

    token.uuid= uuid.v4(),

        debug( '_generateToken', token.uuid );

    return token
}


module.exports={
    changePassword,
    doEvents,
    generateToken
}
