/**
 *Created by Mikael Lindahl on 2018-01-04
 */

"use strict"

let config = {
    error: null,
    facebook: {
        app_id: 'facebook-app-id',
        app_secret: 'facebook-app-secret',
        input_token: 'fb-input-token',
        access_token: 'fb-access-token'
    },
    google: {
        access_token: 'google-access-token',
        client_id: 'google-client-id',

    }
}

config.facebook.url = {
    access: ('https://graph.facebook.com/oauth/access_token'
        + '?client_id=' + config.facebook.app_id
        + '&client_secret=' + config.facebook.app_secret
        + '&grant_type=client_credentials'),
    debug: ('https://graph.facebook.com/debug_token?'
        + 'input_token=' + config.facebook.input_token
        + '&access_token=' + config.facebook.access_token)
};

config.body = {
    facebook: {
        data: {is_valid: true},
        access_token: config.facebook.access_token
    },
    google: {
        email: 'me@mail.com',
        aud: config.google.client_id
    }
};

config.google.url = {
    access: ('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + config.google.access_token)

};

let request = (url, cb) => {

    if (url == config.facebook.url.access) {

        return cb(null, {}, JSON.stringify(config.body.facebook))

    }

    if (url == config.facebook.url.debug) {

        return cb(null, {}, JSON.stringify(config.body.facebook))

    }

    let access = 'https://graph.facebook.com/oauth/access_token';
    if (url.slice(0, access.length) == access) {

        return cb(new Error('Bad access'), {}, '')

    }

    let debug = 'https://graph.facebook.com/debug_token';
    if (url.slice(0, debug.length) == debug) {

        return cb(new Error('Bad debug'), {}, '')

    }

    if (url == config.google.url.access) {

        return cb(null, {}, JSON.stringify(config.body.google))

    }

    //Google https://www.googleapis.com/oauth2/v3/tokeninfo';
    return cb(new Error('Bad access'), {}, '')

}
module.exports = {
    config,
    request
}