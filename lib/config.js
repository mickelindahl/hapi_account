/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module config */

const controller = require('./controller');
const debug = require('debug')('hapi-account:lib:config');
const Joi = require('joi');
const pre = require('./pre');
const pre_social = require('./pre-social');
const Email = require('./email');

/**
 *  Attach pre events on their respective route config
 *
 *  `config`- {object} config object
 *  `events` - {array} list with events
 *
 * return {object} config
 *
 */
function _attachPreEvents(config, events) {

    debug('attachPreEvents', events.length);

    events.forEach(e => {

        if (e.type.slice(0, 5) == 'onPre') {

            debug('attachPreEvents attaching', e.type);

            let firstLetter = e.type.slice(5, 6).toLowerCase();
            let key = firstLetter + e.type.slice(6);

            delete e['type'];

            config[key].pre.push(e)

        }
    });

    return config

}

/**
 *  Return configuration object for routs
 *
 * - `options`
 *   - `scopesAllowed` {array}
 *     - `[]` {string} scope e.g. "user" || "admin"
 */
module.exports = (options) => {
    let config = {};

    // Route configs

    config.changePassword = {
        auth: 'simple',
        pre: [
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            // { method: pre.encryptPassword }
        ],
        validate: {
            headers: Joi.object({
                authorization: Joi.string().description('Bearer token'),
            }).unknown(['user-agent', 'host', 'content-type', 'content-length']),
            payload: {
                password: Joi.string().required().description('New password'),
            }
        },
        tags: ['api', 'account'],
        description: 'Change a password',
        notes: 'To change a password',
        handler: controller.changePassword
    };

    config.create = {
        pre: [
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.isAccount},
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object({
                user: Joi.string().required().description('Unique user identified e.g. email| uuid | ...'),
                password: Joi.string().required().description('User password'),
                meta: Joi.object().description('Optional meta data assoicated witht he account e.g. name'),
            })
        },
        description: 'Create account',
        notes: 'To create an account',
        tags: ['api', 'account'],
        handler: controller.create
    };

    config.createFacebook = {
        pre: [
            {method: pre_social.addCreatedByFacebookToPayload},
            {method: pre_social.verifyFacebookToken, assign: 'responseData'},
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.isAccount},
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},

        ],
        validate: {
            payload: Joi.object({
                user: Joi.string().description('Email from facebook login'),
                token: Joi.string().required().description('Facebook aut response accessToken'),
                response: Joi.object().description('Full facebook validation response to store in account db'),
            })
        },
        description: 'Create account with facebook verification',
        notes: 'To create an account with facebook verification',
        tags: ['api', 'account'],
        handler: controller.create
    };

    config.createGoogle = {
        pre: [
            {method: pre_social.addCreatedByGoogleToPayload},
            {method: pre_social.verifyGoogleToken, assign: 'responseData'},
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.isAccount},
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object({
                token: Joi.string().required().description('Google auth response tokenId'),
                response: Joi.object().description('Full facebook validation response to store in account db'),
            })
        },
        description: 'Create account with google verification',
        notes: 'To create an account with google verification',
        tags: ['api', 'account'],
        handler: controller.create
    };

    // config.getLoginStatus = {
    //     pre: [
    //         { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
    //         { method: pre.verifyToken, assign: 'tokenEntry' },
    //         { method: pre.getDatabaseAccount, assign: 'accountDatabase' }],
    //     validate: {
    //         payload: {
    //             token: Joi.string().required().description( 'Reset password token' )
    //         }
    //     },
    //     description: 'Get login status for browser token',
    //     notes: 'Get login status for current browser token',
    //     tags: ['api', 'account'],
    //     handler: controller.getLoginStatus
    //
    // }

    config.login = {
        pre: [
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.verifyUser, assign: 'accountEntry'},
            {method: pre.verifyPassword},
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object({
                user: Joi.string().required().description('Unique user identified  e.g. email| uuid | ...'),
                password: Joi.string().required().description('User password'),
            })
        },
        description: 'Login with an account',
        notes: 'Login with an account',
        tags: ['api', 'account'],
        handler: controller.login
    };

    config.loginFacebook = {
        pre: [
            {method: pre_social.verifyFacebookToken, assign: 'responseData'},
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.verifyUser, assign: 'accountEntry'},
            // { method: pre_social.verifyOrCreateFacebookUser, assign: 'accountEntry' },
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object().keys({
                user: Joi.string().description('Email from facebook login'),
                token: Joi.string().required().description('Facebook aut response accessToken'),
            })

        },
        description: 'Login with an facebook account',
        notes: 'Login with an facebook account',
        tags: ['api', 'account'],
        handler: controller.login
    };

    config.loginGoogle = {
        pre: [
            {method: pre_social.verifyGoogleToken, assign: 'responseData'},
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.verifyUser, assign: 'accountEntry'},
            // { method: pre_social.verifyOrCreateGoogleUser, assign: 'accountEntry' },
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object().keys({
                token: Joi.string().required().description('Google auth response tokenId'),
            })

        },
        description: 'Login with an google account',
        notes: 'Login with an google account',
        tags: ['api', 'account'],
        handler: controller.login
    };

    config.logout = {
        auth: 'simple',
        pre: [
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
            {method: pre.destroyToken}],
        description: 'Logout from an account',
        notes: 'Logout from an account',
        tags: ['api', 'account'],
        handler: controller.logout
    };

    config.forgotPassword = {
        pre: [
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
            {method: pre.verifyUser}],
        validate: {
            payload: Joi.object({
                user: Joi.string().required().description('Unique user identified  e.g. email| uuid | ...')
            }),
        },
        description: 'Password forgotten',
        notes: 'To trigger password changed when it has been misplaced',
        tags: ['api', 'account'],
        handler: controller.forgotPassword
    };

    config.resetPassword = {
        pre: [
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
            {method: pre.verifyToken, assign: 'tokenEntry'},
            {method: pre.destroyToken},
            // { method: pre.encryptPassword },
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'}],
        validate: {
            payload: {
                password: Joi.string().required().description('New password'),
                token: Joi.string().required().description('Reset password token')
            }
        },
        description: 'Reset a password',
        notes: 'Resets a password',
        tags: ['api', 'account'],
        handler: controller.resetPassword
    };

    config.updateScope = {
        auth: 'simple',
        pre: [
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
        ],
        validate: {
            payload: {
                add: Joi.array()
                    .items(Joi.string()
                        .allow(options.scopesAllowed)
                        .description('Scope to add'))
                    .default([]).description('Scopes to add'),
                remove: Joi.array()
                    .items(Joi.string()
                        .allow(options.scopesAllowed)
                        .description('Scope to remove'))
                    .default([]).description('Scopes to remove')
            }
        },
        description: 'Set account scope',
        notes: 'Set the scope of an account',
        tags: ['api', 'account'],
        handler: controller.updateScope,
    };

    config.verifyAccount = {
        pre: [
            {method: pre.getDatabaseToken, assign: 'tokenDatabase'},
            {method: pre.verifyToken, assign: 'tokenEntry'},
            {method: pre.destroyToken},
            {method: pre.getDatabaseAccount, assign: 'accountDatabase'},
        ],
        description: 'Validate account',
        notes: 'Returns true if validated and false if account already has been validated',
        tags: ['api', 'account'],
        validate: {
            payload: {
                token: Joi.string().required().description('Unique token')
            }
        },
        handler: controller.verifyAccount
    };

    for (let key in config) {

        config[key].response = {
            failAction: (request, h, err) => {
                debug(err);
                return err
            }
        }


        if (config[key].validate) {

            config[key].validate.failAction = (request, h, err) => {
                debug(err);
                return err
            }

        }

    }

    // Add email events
    options.events = Email(options.email, options.events);

    // Attach pre events to config
    config = _attachPreEvents(config, options.events);

    return config

}
