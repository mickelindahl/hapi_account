/**
 *Created by Mikael Lindahl on 2018-01-03
 */

"use strict";

/**@module pre-social */

const debug = require('debug')('hapi-account:lib:pre-social');
const fetch = require('node-fetch');

/**
 *  Verify that provided facebook token is valid
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolki](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
async function addCreatedByFacebookToPayload(request, h) {

    request.payload.created_by = 'facebook';

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
async function addCreatedByGoogleToPayload(request, h) {

    request.payload.created_by = 'google';

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
async function verifyFacebookToken(request, h) {

    debug('verifyFacebookToken access_token', request.payload.access_token);

    const token = request.payload.access_token;

    let res = await fetch(`https://graph.facebook.com/me?access_token=${token}&fields=name,email`);
    res = await res.json();

    debug('verifyFacebookToken response', res);

    if (res.error) {

        console.error(res.error);
        throw res.error

    } else {

        // Add facebook user id (email) for account validation/creation
        request.payload.user = res.email;

        // Account verified
        request.payload.verified = true;

        // Add name to meta data
        request.payload.meta = {name: res.name};

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
async function verifyGoogleToken(request, h) {

    debug('verifyGoogleToken');

    const token = request.payload.access_token;
    const options = { headers: { Authorization: `Bearer ${token}` }};

    let res = await fetch('https://www.googleapis.com/userinfo/v2/me', options);
    res = await res.json();

    debug('verifyFacebookToken response', res);

    if (res.error) {

        console.error(res.error);
        throw res.error

    } else {

        // Add facebook user id (email) for account validation/creation
        request.payload.user = res.email;

        // Account verified
        request.payload.verified = true;

        // Add name to meta data
        request.payload.meta = {name: res.name};

        return res

    }
}

module.exports = {
    addCreatedByFacebookToPayload,
    addCreatedByGoogleToPayload,
    verifyFacebookToken,
    verifyGoogleToken,

}