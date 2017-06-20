/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module routes */

/**
 * - `/changePassword` {POST}
 * - `/forgotPassword` {POST}
 * - `/create` {POST}
 * - `/login` {POST}
 * - `/loginFacebook` {POST}
 * - `/logout` {POST}
 * - `/resetPassword` {POST}
 * - `/updateScope` {POST}
 * - `/verifyAccount` {POST}
 *
 */
module.exports = (config, pre, options) => {
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
        { method: 'POST', path: pre + options.basePath + '/create', config: config.create },
        { method: 'POST', path: pre + options.basePath + '/login', config: config.login },
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
        { method: 'POST', path: pre + options.basePath + '/logout', config: config.logout },
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