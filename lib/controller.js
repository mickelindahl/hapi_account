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

        debug('auth', request.path);

        let uuid=request.auth.credentials ? request.auth.credentials.uuid : undefined;
        let current;

        if (uuid){

            // Remove previous if exi
            current = await request.pre.tokenDatabase.findOne({uuid});
            await request.pre.tokenDatabase.destroy({uuid});
        }

        let duration = request.server.plugins['hapi-account'].options.expire.login;

        let expires = duration ? new Date(new Date().valueOf() + duration) : false;

        let token = helper.generateToken(request.pre.accountEntry, 'login', expires,
            request.pre.deviceEntry, current);

        debug('auth token uuid', token.uuid);

        token = await request.pre.tokenDatabase.create(token).fetch();

        let result = {token, account: request.pre.accountEntry};

        request.server.plugins['hapi-account'].result = result;

        await helper.doEvents(request, 'onPostLogin');

        // REMARK Domain=localhost does not seem to work in google chrome (2016-12-28)
        // in windows instead use Domain=127.0.0.1
        // REMARK Remove Domain=%s; since do not want to share cookies between domains
        // The 2 domains mydomain.com and subdomain.mydomain.com can only share cookies
        // if the domain is explicitly named in the Set-Cookie header. Otherwise, the
        // scope of the cookie is restricted to the request host. (This is referred to
        // as a "host-only cookie". See What is a host only cookie?)
        //
        // For instance, if you sent the following header from subdomain.mydomain.com,
        // then the cookie won't be sent for requests to mydomain.com:

        const token_name = request.server.plugins['hapi-account'].options.token_name;

        let cookie = Util.format(`${token_name}=%s; Path=%s; HttpOnly`,
            // id_token,
            token.uuid,
            // request.info.host.split(':')[0], //important
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

        // Rules to set cookie via header in response. Appearantly, setting domain
        // to / then one can only change the cookie in the browser if on a page
        // stemming from / e.g. /login /view and /view/myPage will not be able to
        // change it from. Still it will be available.

        let data = {
            access_token: token.uuid,
            expires_in: duration ? duration / (60 * 1000) : false,
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

    if (account.access_token) {
        delete account.access_token
    }

    account.verified = account.verified || request.server.plugins['hapi-account'].options.accountVerified ? true : false;

    try {

        account = await request.pre.accountDatabase.create(account).fetch();

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

        return h.response({message:'Created'}).code(201);

    } catch (err) {

        console.error(err);
        return boom.badImplementation(err);

    }
};

/**
 *  Create or login facebook
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return {promise}
 *
 */
function createOrLogin(social) {

    debug('createOrLogin return handler',social)

    return async function(request, h){

        try {

            debug('createOrLogin', social);

            const options_ha = request.server.plugins['hapi-account'].options;

            let url={};
            switch (social) {
                case 'facebook':
                    url={
                        create:`/${options_ha.basePath}/createFacebook`,
                        login: options_ha.basePath + '/loginFacebook'
                    };
                    break;
                case 'google':
                    url={
                        create:`/${options_ha.basePath}/createGoogle`,
                        login: `/${options_ha.basePath}/loginGoogle`
                    };
                    break;
            }

            let options = {
                method: "POST",
                headers:request.headers,
            };
            options.headers['content-type']='application/json'

            debug('verifyUser');

            let criteria = {user: request.payload.user};

            const account = await request.pre.accountDatabase.findOne(criteria);

            // If missing account create

            if (!account) {

                // Not needed on creation
                options.payload={access_token:request.payload.access_token};
                options.url = url.create;

                debug('createOrLogin',options)

                let res =await h.request.server.inject(options);

                if (res.result.error){
                    return res
                }
            }

            options.url = url.login;
            options.payload = {
                access_token: request.payload.access_token
            };

            if (request.payload.device_id){ options.payload.device_id=request.payload.device_id}
            if (request.payload.device_data){ options.payload.device_data=request.payload.device_data}

            let response  =  await h.request.server.inject(options);

            let payload = response.result;

            if (payload.error){
                return response
            }

            payload.account_created=!account ? true : false;

            // debug(response)

            let res = h.response(payload).header('Set-Cookie', response.headers['set-cookie'])

            // debug(res)
            // debug(response.headers['cookie'])

            return res

        }catch (e) {

            console.error(e);
            return boom.badImplementation(e)

        }
    }
}

/**
 *  Handler for deleteAccount route
 *
 * - `request` hapi server request object
 * - `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)
 *
 * return
 *    - `response` {object}
 *      - `message` Account delete
 *
 */
async function deleteAccount(request, reply) {

    try{

        debug('deleteAccount');

        let criteria = {id: request.pre.tokenEntry.account_id};
        let account = {verified: true};

        account = await request.pre.accountDatabase.findOne(criteria)
        await request.pre.accountDatabase.destroy(criteria)

        const token = request.pre.tokenEntry;
        let result = {account, token};

        debug('verifyAccount', result)

        request.server.plugins['hapi-account'].result = result;

        await helper.doEvents(request, 'onPostDeleteAccount')

        message='Account deleted'

        return {message}


    }catch(err){

        console.error(err);
        return boom.badImplementation(err)

    }
}


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

        const account = await request.pre.accountDatabase.findOne(criteria);

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
 *    - `response` {object}
 *      - `message` Account verified | Account already verified
 *
 */
async function verifyAccount(request, reply) {

    try{

        debug('verifyAccount');

        let criteria = {id: request.pre.tokenEntry.account_id};
        let account = {verified: true};

        account = await request.pre.accountDatabase.update(criteria, account).fetch()

        const token = request.pre.tokenEntry;
        let result = {account: account[0], token};

        debug('verifyAccount', result)

        request.server.plugins['hapi-account'].result = result;

        await helper.doEvents(request, 'onPostVerifyAccount')

        let message;

        if(request.pre.tokenEntry.status=='used'){

            message= 'Account already verified';

        }else{

            await request.pre.tokenDatabase.update({uuid:token.uuid},{status:'used'})

            message='Account verified'
        }

        return {message}


    }catch(err){

        console.error(err);
        return boom.badImplementation(err)

    }
}

module.exports = {

    auth,
    changePassword,
    create,
    createOrLogin,
    forgotPassword,
    logout,
    renewToken,
    resetPassword,
    updateScope,
    verifyAccount

}