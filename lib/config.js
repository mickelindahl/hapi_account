/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module config */

const controller = require('./controller');
const debug = require('debug')('hapi-account:lib:config');
const Joi = require('@hapi/joi');
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
    options.methods.forEach(m=>{

        pre[m.type]=m.method

    });
    config.changePassword = {
        auth: options.authStrategyName,
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            // { method: pre.encryptPassword }
        ],
        validate: {
            options: {
                allowUnknown: true
            },
            state: Joi.object().keys({
                [options.token_name]: Joi.string().description('Authorization token. Can also be supplied as header Authorization'),
            }),
            headers: Joi.object().keys({
                Authorization: Joi.string().description('Authorization token. Can also be supplied as cookie'),
            }),
            payload: Joi.object({
                password: Joi.string().required().description('New password'),
            })
        },
        tags: ['api', 'account'],
        description: 'Change a password',
        notes: 'To change a password',
        handler: controller.changePassword
    };

    config.create = {
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.isAccount},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
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
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.isAccount},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},

        ],
        validate: {
            payload: Joi.object({
                access_token: Joi.string().required().description('Facebook accessToken'),
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
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.isAccount},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object({
                access_token: Joi.string().required().description('Google access token')
            })
        },
        description: 'Create account with google verification',
        notes: 'To create an account with google verification',
        tags: ['api', 'account'],
        handler: controller.create
    };


    config.createOrLoginFacebook = {
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre_social.verifyFacebookToken, assign: 'responseData'},
        ],
        validate: {
            payload: Joi.object().keys({
                access_token: Joi.string().required().description('Facebook accessToken'),
                device_id: Joi.string().description('Unique identified of device. If provided session token will be' +
                    ' generated for device and account combined' ),
                device_data: Joi.object().description('Device information to be stored'),

            })

        },
        description: 'Create or login with an facebook account',
        notes: 'Create or login with an facebook account',
        tags: ['api', 'account'],
        handler: controller.createOrLogin('facebook')
    };

    config.createOrLoginGoogle = {
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre_social.verifyGoogleToken, assign: 'responseData'},
        ],
        validate: {
            payload: Joi.object().keys({
                access_token: Joi.string().required().description('Facebook accessToken'),
                device_id: Joi.string().description('Unique identified of device. If provided session token will be' +
                    ' generated for device and account combined' ),
                device_data: Joi.object().description('Device information to be stored'),

            })

        },
        description: 'Create or login with an google account',
        notes: 'Create or login with an google account',
        tags: ['api', 'account'],
        handler: controller.createOrLogin('google')
    };

    config.deleteAccount = {
        pre: [
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
            {method: pre.verifyToken, assign: 'tokenEntry'},
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
        ],
        description: 'Delete account',
        notes: 'Delete an account',
        tags: ['api', 'account'],
        validate: {
            state: Joi.object().keys({
                [options.token_name]: Joi.string().description('Authorization token. Can also be supplied as header Authorization'),
            }),
            payload:Joi.object( {
                token: Joi.string().required().description('Unique token')
            })
        },
        handler: controller.deleteAccount
    };

    config.login = {
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.verifyUser, assign: 'accountEntry'},
            {method: pre.verifyScope},
            {method: pre.verifyPassword},
            {method: pre.getDeviceDatabase, assign:'deviceDatabase'},
            {method: pre.getDeviceIfAvailable, assign:'deviceEntry'},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object({
                user: Joi.string().required().description('Unique user identified  e.g. email| uuid | ...'),
                password: Joi.string().required().description('User password'),
                device_id: Joi.string().description('Unique identified of device. If provided session token will be' +
                    ' generated for device and account combined' ),
                device_data: Joi.object().description('Device information to be stored'),
                allowed_scopes: Joi.array().description('List with allowed scopes'),
            })
        },
        description: 'Login with an account',
        notes: 'Login with an account',
        tags: ['api', 'account'],
        handler: controller.auth
    };

    config.loginFacebook = {
        pre: [
            {method: pre_social.verifyFacebookToken, assign: 'responseData'},
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.verifyUser, assign: 'accountEntry'},
            {method: pre.getDeviceDatabase, assign:'deviceDatabase'},
            {method: pre.getDeviceIfAvailable, assign:'deviceEntry'},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
        ],
        validate: {
            payload: Joi.object().keys({
                access_token: Joi.string().required().description('Facebook accessToken'),
                device_id: Joi.string().description('Unique identified of device. If provided session token will be' +
                    ' generated for device and account combined' ),
                device_data: Joi.object().description('Device information to be stored'),
            })
        },
        description: 'Login with an facebook account',
        notes: 'Login with an facebook account',
        tags: ['api', 'account'],
        handler: controller.auth
    };



    config.loginGoogle = {
        pre: [
            {method: pre_social.verifyGoogleToken, assign: 'responseData'},
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.verifyUser, assign: 'accountEntry'},
            {method: pre.getDeviceDatabase, assign:'deviceDatabase'},
            {method: pre.getDeviceIfAvailable, assign:'deviceEntry'},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},

        ],
        validate: {
            payload: Joi.object().keys({
                access_token: Joi.string().required().description('Google access token'),
                device_id: Joi.string().description('Unique identified of device. If provided session token will be' +
                    ' generated for device and account combined' ),
                device_data: Joi.object().description('Device information to be stored'),
            })

        },
        description: 'Login with an google account',
        notes: 'Login with an google account',
        tags: ['api', 'account'],
        handler: controller.auth
    };

    config.logout = {
        auth: options.authStrategyName,
        pre: [
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
            {method: pre.destroyToken}],
        description: 'Logout from an account',
        notes: 'Logout from an account',
        tags: ['api', 'account'],
        validate: {
            options: {
                allowUnknown: true
            },
            state: Joi.object().keys({
                [options.token_name]: Joi.string().description('Authorization token. Can also be supplied as header Authorization'),
            }),
            headers: Joi.object().keys({
                Authorization: Joi.string().description('Authorization token. Can also be supplied as cookie'),
            }),
        },
        handler: controller.logout
    };

    config.forgotPassword = {
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.verifyUser}],
        validate: {
            payload: Joi.object({
                user: Joi.string().required().description('Unique user identified  e.g. email| uuid | ...'),
                redirect: Joi.string().description('Proived redirect url where new password can be set')
            }),
        },
        description: 'Password forgotten',
        notes: 'To trigger password changed when it has been misplaced',
        tags: ['api', 'account'],
        handler: controller.forgotPassword
    };

    config.renewToken = {
        auth: options.authStrategyName,
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
            {method: pre.getAccountEntry, assign: 'accountEntry'},
            {method: pre.getDeviceDatabase, assign:'deviceDatabase'},
            {method: pre.getDeviceIfAvailable, assign:'deviceEntry'},
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
        ],
        description: 'Renew login token',
        notes: 'Renew authentication token',
        tags: ['api', 'account'],
        validate: {
            options: {
                allowUnknown: true
            },
            state: Joi.object().keys({
                [options.token_name]: Joi.string().description('Authorization token. Can also be supplied as header Authorization'),
            }),
            headers: Joi.object().keys({
                Authorization: Joi.string().description('Authorization token. Can also be supplied as cookie'),
            }),
        },
        handler: controller.auth
    };

    config.resetPassword = {
        pre: [
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
            {method: pre.verifyToken, assign: 'tokenEntry'},
            {method: pre.destroyToken},
            {method: pre.getAccountDatabase, assign: 'accountDatabase'}],
        validate: {
            payload: Joi.object({
                password: Joi.string().required().description('New password'),
                token: Joi.string().required().description('Reset password token')
            })
        },
        description: 'Reset a password',
        notes: 'Resets a password',
        tags: ['api', 'account'],
        handler: controller.resetPassword
    };

    config.updateScope = {
        auth: options.authStrategyName,
        pre: [
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
        ],
        validate: {
            state: Joi.object().keys({
                [options.token_name]: Joi.string().description('Authorization token. Can also be supplied as header Authorization'),
            }),
            headers: Joi.object().keys({
                Authorization: Joi.string().description('Authorization token. Can also be supplied as cookie'),
            }),
            payload:Joi.object( {
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
            })
        },
        description: 'Set account scope',
        notes: 'Set the scope of an account',
        tags: ['api', 'account'],
        handler: controller.updateScope,
    };

    config.verifyAccount = {
        pre: [
            {method: pre.getTokenDatabase, assign: 'tokenDatabase'},
            {method: pre.verifyToken, assign: 'tokenEntry'},
            {method: pre.getAccountDatabase, assign: 'accountDatabase'},
        ],
        description: 'Validate account',
        notes: 'Returns true if validated and false if account already has been validated',
        tags: ['api', 'account'],
        validate: {
            payload:Joi.object( {
                token: Joi.string().required().description('Unique token')
            })
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