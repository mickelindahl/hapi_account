/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module controller*/

const boom = require('boom');
const debug = require('debug')('hapi-account:lib:controller');
const helper = require('./helper');
const Util = require('util');


/**@module controller */

/**
 *  Handler for login, renewToken, loginFacebook and loginGoogle route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *   - `response` {json}
 *     - `token` token uuid
 *     - `expires_in` time to token expiration
 *   - `header`
 *     - `cookie` token uuid as cookie. If `x-forwarded-proto == https` then secure
 *
 */
async function auth(request, h) {


    try {

        debug('auth');

        let uuid=request.auth.credentials ? request.auth.credentials.uuid : undefined;
        let current;

        if (uuid){

            // Remove previous if exi
            current = request.pre.tokenDatabase.find({uuid});
            await request.pre.tokenDatabase.destroy({uuid});


        }

        let duration = request.server.plugins['hapi-account'].options.expire.login;

        let expires = new Date(new Date().valueOf() + duration);

        let token = helper.generateToken(request.pre.accountEntry, 'login', expires,
            request.pre.deviceEntry, current);

        debug('auth token uuid', token.uuid);

        token = await request.pre.tokenDatabase.create(token).fetch();

        let result = {token, account: request.pre.accountEntry};

        request.server.plugins['hapi-account'].result = result;

        await helper.doEvents(request, 'onPostLogin');

        // REMARK Domain=localhost does not seem to work in google chrome (2016-12-28)
        // in windows instead use Domain=127.0.0.1
        let cookie = Util.format('token=%s; Domain=%s; Path=%s; HttpOnly',
            // id_token,
            token.uuid,
            request.info.host.split(':')[0], //important
            '/',
        );

        // Heroku terminates ssl at the edge of the network so your hapi site will
        // always be running with a http binding in it's dyno. If you wanted the external
        // facing site to be https then it's necessary to redirect to https. The
        // x-forwarded-proto header is set by heroku to specify the originating protocol
        // of the http request
        // See: https://devcenter.heroku.com/articles/http-routing#heroku-headers
        if (request.headers['x-forwarded-proto'] == 'https') {
            cookie += '; Secure'
        }

        debug('login cookie', cookie);

        // Rules to set cookie via header in response. Appearantly, setting domain
        // to / then one can only change the cookie in the browser if on a page
        // stemming from / e.g. /login /view and /view/myPage will not be able to
        // change it from. Still it will be available.

        let data = {
            token: token.uuid,
            expires_in: duration / 60 * 1000
        };

        return h.response(data).header('Set-Cookie', cookie);


    } catch (err) {
        console.error(err);
        return boom.badImplementation(err);

    }
}

/**
 *  Handler for change password route
 *
 * - `request` hapi server request object
 * - `reply` hapi server reply object
 *
 * return {promise}
 *
 */
async function changePassword(request) {

    debug('changePassword');

    let criteria = {id: request.auth.credentials.account_id};
    let event_type = 'onPostChangePassword';

    return helper.changePassword(criteria, event_type, request)
}

/**
 *  Handler for create route. Used for routes create, createFacebook and createGoogle.
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {string} Created
 *    - `code` 201
 *
 */
async function create(request, h) {

    debug('create');

    let account = request.payload;

    if (account.token) {
        delete account.token
    }

    account.verified = account.verified || request.server.plugins['hapi-account'].options.accountVerified ? true : false;

    try {

        account = await request.pre.accountDatabase.create(account).fetch()

        let token = null;

        // If account is not verified create a token
        // that can be used for verification
        if (!account.verified) {
            let duration = request.server.plugins['hapi-account'].options.expire.create;

            let expires = new Date(new Date().valueOf() + duration);

            token = helper.generateToken(account, 'new', expires);

            await request.pre.tokenDatabase.create(token)
        }

        debug('handlerCreate createToken');

        // Set result
        request.server.plugins['hapi-account'].result = {account, token};

        await helper.doEvents(request, 'onPostCreate')

        return h.response('Created').code(201)

    } catch (err) {

        console.error(err);
        return boom.badImplementation(err);

    }
};


/**
 *  Handler for forgotPassword route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {string} Forgot token created
 *
 */
async function forgotPassword(request, h) {

    debug('forgotPassword');

    let criteria = {user: request.payload.user};

    try {

        const account = await request.pre.accountDatabase.findOne(criteria)

        let duration = request.server.plugins['hapi-account'].options.expire.forgotPassword;

        let expires = new Date(new Date().valueOf() + duration);

        let token = helper.generateToken(account, 'forgotPassword', expires);

        await request.server.getModelHapiAccount('token').create(token)

        let result = {account, token}

        request.server.plugins['hapi-account'].result = result;

        await helper.doEvents(request, 'onPostForgotPassword')

        return h.response('Forgot token created');

    } catch (err) {

        console.error(err);
        return boom.badImplementation(err)

    }
}

/**
 *  Handler for logout route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {string} Logged out
 *
 */
async function logout(request, h) {

    debug('logout')

    return helper.doEvents(request, 'onPostLogout').then(() => {

        return 'Logged out';

    }).catch(err => {

        // console.error( 'Bad implementation', err );
        throw boom.badImplementation(err.message);

    });
}

/**
 *  Handler for renew token route.
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *   - `response` {json}
 *     - `token` token uuid
 *     - `expires_in` time to token expiration
 *   - `header`
 *     - `cookie` token uuid as cookie. If `x-forwarded-proto == https` then secure
 *
 */
async function renewToken(request, h) {

    debug('renewToken');

    return login(request, h);

}

/**
 *  Handler for resetPassword route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {string} Password updated
 *
 */
async function resetPassword(request, h) {

    debug('resetPassword');

    let criteria = {id: request.pre.tokenEntry.account_id};
    let onPost = 'onPostResetPassword';

    return helper.changePassword(criteria, onPost, request)
}

/**
 *  Handler to set an account scope
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {string} Scope updated
 *
 */
async function updateScope(request, h) {

    debug('updateScope');

    let criteria = {id: request.auth.credentials.account_id};
    let config = request.payload;
    let Account = request.pre.accountDatabase;

    return Account.find(criteria).then(account => {

        let scope = account[0].scope;

        // Add to scope
        scope = config.add.reduce((tot, val) => {

            debug('updateScope add', tot.indexOf(val), val, tot)

            if (tot.indexOf(val) == -1) {

                tot.push(val)

            }

            return tot

        }, scope);

        //Remove from scope
        scope = scope.reduce((tot, val) => {

            if (config.remove.indexOf(val) == -1) {

                tot.push(val)
            }

            return tot

        }, []);

        return {scope: scope}

    }).then((update) => {

        return Account.update(criteria, update)

    }).then(() => {

        return helper.doEvents(request, 'onPostUpdateScope')

    }).then(() => {

        return 'Scope updated'

    }).catch((err) => {

        // console.error( 'implementation', err );
        throw boom.badImplementation(err)

    });

}

/**
 *  Handler for verifyAccount route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {string} Account verified
 *
 */
async function verifyAccount(request, reply) {

    debug('verifyAccount');

    let criteria = {id: request.pre.tokenEntry.account_id};
    let account = {verified: true};

    return request.pre.accountDatabase.update(criteria, account)
        .fetch()
        .then(account => {

            let result = {account: account[0], token: request.pre.tokenEntry};

            request.server.plugins['hapi-account'].result = result;

            return helper.doEvents(request, 'onPostVerifyAccount')

        }).then(() => {

            return 'Account verified'

        }).catch((err) => {

            // console.error('Bad implementation', err );
            throw boom.badImplementation(err)

        });
}

module.exports = {

    auth,
    changePassword,
    create,
    forgotPassword,
    // login,
    logout,
    renewToken,
    resetPassword,
    updateScope,
    verifyAccount

}