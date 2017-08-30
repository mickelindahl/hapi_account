/**
 * Created by Mikael Lindahl (mikael) on 6/12/17.
 */

'use strict';

/**@module config */

const Joi = require( 'joi' );

const controller = require('./controller');
const pre = require('./pre');

/**
 *  Return configuration object for routs
 *
 * - `options`
 *   - `scopesAllowed` {array}
 *     - `[]` {string} scope e.g. "user" || "admin"
 */
module.exports = (options )=> {
    let config = {};

    // Route configs

    config.changePassword = {
        auth: 'simple',
        pre: [
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
            { method: pre.encryptPassword }
        ],
        validate: {
            headers: Joi.object( {
                authorization: Joi.string().description( 'Bearer token' ),
            } ).unknown( ['user-agent', 'host', 'content-type', 'content-length'] ),
            payload: {
                password: Joi.string().required().description( 'New password' ),
            }
        },
        tags: ['api', 'account'],
        description: 'Change a password',
        notes: 'To change a password',
        handler: controller.changePassword
    };

    config.create = {
        pre: [
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
            { method: pre.isAccount },
            { method: pre.encryptPassword },
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
        ],
        validate: {
            payload: Joi.object().keys( {
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
                password: Joi.string().required().description( 'User password' ),
                //scope: Joi.array().items( Joi.string() ).description( 'List of valid scopes for user' ) // not secure

            } ).xor( 'user', 'email' )

        },
        description: 'Create account',
        notes: 'To create an account',
        tags: ['api', 'account'],
        handler: controller.create
    };

    config.login = {
        pre: [
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
            { method: pre.verifyUser, assign: 'accountEntry' },
            // { method: method.encryptPassword },
            { method: pre.verifyPassword },
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
        ],
        validate: {
            payload: Joi.object().keys( {
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
                password: Joi.string().required().description( 'User password' ),
            } ).xor( 'user', 'email' )

        },
        description: 'Login with an account',
        notes: 'Login with an account',
        tags: ['api', 'account'],
        handler: controller.login
    };

    config.loginFacebook = {
        pre: [
            { method: pre.verifyFacebookToken, assign: 'responseData'  },
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
            { method: pre.verifyOrCreateFacebookUser, assign: 'accountEntry' },

            // { method: method.encryptPassword },
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
        ],
        validate: {
            payload: Joi.object().keys( {
                email: Joi.string().description( 'User email' ),
                token: Joi.string().required().description( 'Facebook aut response accessToken' ),
                response: Joi.string().description( 'Full facebook validation response to store in account db' ),
            } )

        },
        description: 'Login with an facebook account',
        notes: 'Login with an facebook account',
        tags: ['api', 'account'],
        handler: controller.login
    };

    config.loginGoogle = {
        pre: [
            { method: pre.verifyGoogleToken, assign: 'responseData' },
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
            { method: pre.verifyOrCreateGoogleUser, assign: 'accountEntry' },

            // { method: method.encryptPassword },
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
        ],
        validate: {
            payload: Joi.object().keys( {
                //email: Joi.string().description( 'User email' ),
                token: Joi.string().required().description( 'Google auth response tokenId' ),
                response: Joi.string().description( 'Full facebook validation response to store in account db' ),
            } )

        },
        description: 'Login with an google account',
        notes: 'Login with an google account',
        tags: ['api', 'account'],
        handler: controller.login
    };

    config.logout = {
        auth: 'simple',
        pre: [
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
            { method: pre.destroyToken }],
        description: 'Logout from an account',
        notes: 'Logout from an account',
        tags: ['api', 'account'],
        handler: controller.logout
    };

    config.forgotPassword = {
        pre: [
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
            { method: pre.verifyUser }],
        validate: {
            payload: Joi.object().keys( {
                user: Joi.string().description( 'User id' ),
                email: Joi.string().description( 'User email' ),
            } ).xor( 'user', 'email' )
        },
        description: 'Password forgotten',
        notes: 'To trigger password changed when it has been misplaced',
        tags: ['api', 'account'],
        handler: controller.forgotPassword
    };

    config.resetPassword = {
        pre: [
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
            { method: pre.verifyToken, assign: 'tokenEntry' },
            { method: pre.destroyToken },
            { method: pre.encryptPassword },
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' }],
        validate: {
            payload: {
                password: Joi.string().required().description( 'New password' ),
                token: Joi.string().required().description( 'Reset password token' )
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
            { method: pre.getDatabaseAccount, assign: 'accountDatabase' },
        ],
        validate: {
            payload: {
                add: Joi.array()
                        .items( Joi.string()
                                   .allow( options.scopesAllowed )
                                   .description( 'Scope to add' ) )
                        .default( [] ).description( 'Scopes to add' ),
                remove: Joi.array()
                           .items( Joi.string()
                                      .allow( options.scopesAllowed )
                                      .description( 'Scope to remove' ) )
                           .default( [] ).description( 'Scopes to remove' )
            }
        },
        description: 'Set account scope',
        notes: 'Set the scope of an account',
        tags: ['api', 'account'],
        handler: controller.updateScope
    };

    config.verifyAccount = {
        pre: [
            { method: pre.getDatabaseToken, assign: 'tokenDatabase' },
            { method: pre.verifyToken, assign: 'tokenEntry' },
            { method: pre.destroyToken },
            { method: pre.getDatabaseToken, assign: 'accountDatabase' },
        ],
        description: 'Validate account',
        notes: 'Returns true if validated and false if account already has been validated',
        tags: ['api', 'account'],
        validate: {
            payload: {
                token: Joi.string().required().description( 'Unique token' )
            }
        },
        handler: controller.verifyAccount
    };

    return config

}
