/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module routes */

/**
 * - `{options.basePath}/changePassword` {POST}
 * - `{options.basePath}/forgotPassword` {POST}
 * - `{options.basePath}/create` {POST}
 * - `{options.basePath}/login` {POST}
 * - `{options.basePath}/loginFacebook` {POST}
 * - `{options.basePath}/loginGoogle` {POST}
 * - `{options.basePath}/logout` {POST}
 * - `{options.basePath}/resetPassword` {POST}
 * - `{options.basePath}/updateScope` {POST}
 * - `{options.basePath}/verifyAccount` {POST}
 *
 */
function routes(config, pre, options) {
    return [
        {
            method: 'POST',
            path: pre + options.basePath + '/changePassword',
            config: config.changePassword
        },
        {
            method: 'POST',
            path: pre + options.basePath + '/forgotPassword',
            config: config.forgotPassword
        },
        {method: 'POST', path: pre + options.basePath + '/create', config: config.create},
        {method: 'POST', path: pre + options.basePath + '/createFacebook', config: config.createFacebook},
        {method: 'POST', path: pre + options.basePath + '/createGoogle', config: config.createGoogle},
        {method: 'POST', path: pre + options.basePath + '/login', config: config.login},
        {
            method: 'POST',
            path: pre + options.basePath + '/loginFacebook',
            config: config.loginFacebook
        },
        {
            method: 'POST',
            path: pre + options.basePath + '/loginGoogle',
            config: config.loginGoogle
        },
        {method: 'POST', path: pre + options.basePath + '/logout', config: config.logout},
        {
            method: 'POST',
            path: pre + options.basePath + '/resetPassword',
            config: config.resetPassword
        },

        {
            method: 'POST',
            path: pre + options.basePath + '/updateScope',
            config: config.updateScope
        },
        {
            method: 'POST',
            path: pre + options.basePath + '/verifyAccount',
            config: config.verifyAccount
        },
    ]
}

module.exports = routes;