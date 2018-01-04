"Created by Mikael Lindahl on 2018-01-01"

"use strict"

const Joi = require('joi');
const SailsDisk = require('sails-disk');

let event_types = [
    'onPreChangedPassword',
    'onPreCreate',
    'onPreForgotPassword',
    'onPreLogin',
    'onPreLogout',
    'onPreResetPassword',
    'onPreVerifyAccount',
    'onPreUpdateScope',
    'onPostChangePassword',
    'onPostCreate',
    'onPostForgotPassword',
    'onPostLogin',
    'onPostLogout',
    'onPostResetPassword',
    'onPostVerifyAccount',
    'onPostUpdateScope'
]

let d= {

    cronTime: {
        expiredTokenCollector: '00 */10 * * * *',
        extendExpirationDate: '00 00 00 * * *'
    },
    expire:{
        create: 5 * 3600 * 24 * 1000,
        forgotPassword: 1 * 3600 * 24 * 1000,
        login: 5 * 3600 * 24 * 1000
    }

}

module.exports = Joi.object({
    accountVerified: Joi.boolean().default(false, 'if account verification is needed after creation'),
    basePath: Joi.string().default('', 'base path for routes'),
    cronTime: Joi.object({

        expiredTokenCollector: Joi.string().default(d.cronTime.expiredTokenCollector),
        extendExpirationDate: Joi.string().default(d.cronTime.extendExpirationDate),

    }).default(d.cronTime),
    email: Joi.object({
        transporter: Joi.object().required().description('nodemailer transporter'),
        events: Joi.array().items({
            type: Joi.string().valid(event_types).required(),
            from: Joi.string().required().description('sending email'),
            to: Joi.string().required().description('receiving email'),
            text: Joi.alternatives().try(Joi.func(), Joi.string()).required().description('plain text email'),
            html: Joi.alternatives().try(Joi.func(), Joi.string()).required().description('html email'),
            subject: Joi.string().required().description('email title')

        })
    }),
    events: Joi.array().items({
        type: Joi.string().valid(event_types).required(),
        method: Joi.func().required(),
        assign: Joi.string().valid(event_types)
    }).default([]),
    expire: Joi.object({
        create: Joi.number().default(d.expire.create),
        forgotPassword: Joi.number().default(d.expire.forgotPassword),
        login: Joi.number().default(d.expire.login)
    }).default(d.expire),
    facebook: Joi.object({
        app_id: Joi.string().required().description('facebook app id'),
        app_secret: Joi.string().required().description('facebook app secret')
    }),
    google: Joi.object({
        client_id: Joi.string().required().description('google client id'),
    }),
    scopesAllowed: Joi.array().items(Joi.string()).default(['user', 'admin']),
    waterline: Joi.object().keys({
        adapters: Joi.object().required(),
        datastores: Joi.object({
            default: Joi.object().default({
                adapter: Joi.string().required(),
            }).required()
        })
    }).default({
        adapters: {
            "sails-disk": SailsDisk
        },
        datastores: {
            default: {
                adapter: 'sails-disk',
            }
        }
    })

});


