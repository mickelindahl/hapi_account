"Created by Mikael Lindahl on 2018-01-01"

"use strict"

const Joi = require('@hapi/joi');
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


let method_types = [

    'destroyToken',
    'getAccountDatabase',
    'getTokenDatabase',
    'isAccount',
    'verifyToken',
    'verifyUser',
    'verifyPassword'

]


let d = {

    cronTime: {
        expiredTokenCollector: '00 */10 * * * *',
        // extendExpirationDate: '00 00 00 * * *'
    },
    expire: {
        create: 5 * 3600 * 24 * 1000,
        forgotPassword: 1 * 3600 * 24 * 1000,
        login: 5 * 3600 * 24 * 1000,
        // loginRenewTokenThreshold: 3600 * 24 * 1000
    }

}

let default_waterline = {
    adapters: {
        "sails-disk": SailsDisk
    },
    datastores: {
        default: {
            adapter: 'sails-disk',
        }
    }
}


module.exports = Joi.object({
    accountVerified: Joi.boolean()
        .default(false)
        .description('If true then verified property in account is set to false.\n' +
            'Then user can not be login until account been verified. An event chain\n' +
            'have to be triggered such that verifyAccount route is called with valid\n' +
            'token. This can be accomplished by providing a `onPostCreate` `event`\n' +
            'that for example sends an email url that that triggers the verifyAccount\n' +
            'route with valid token.')
    ,
    authStrategyName: Joi.string()
        .default('simple')
        .description('The server.auth.strategy schema name (hapi accunt used\n' +
            '"bearer-access-token" schema) see [hapijs](https://hapijs.com/tutorials/auth#strategies).')
    ,
    basePath: Joi.string()
        .default('')
        .description('base path for routes as {basePath}/login or {basePath}/create'),
    cronTime: Joi.object({
        expiredTokenCollector: Joi.string()
            .default(d.cronTime.expiredTokenCollector)
            .description('The time to fire your job for removing expired tokens in db. This can be in the\n' +
                'form of cron syntax or a JS Date object (see https://www.npmjs.com/package/cron).')
        ,

    }).default(d.cronTime),
    email: Joi.object({
        transporter: Joi.object()
            .required()
            .description('nodemailer transporter'),
        events: Joi.array().items({
            type: Joi.string()
                .valid(event_types)
                .required()
                .description('event type to attached send email to')
            ,
            from: Joi.string().required()
                .description('sending email'),
            to: Joi.string().required()
                .description('receiving email'),
            text: Joi.alternatives()
                .try(Joi.func(), Joi.string())
                .required().description('plain text email'),
            html: Joi.alternatives()
                .try(Joi.func(), Joi.string())
                .required()
                .description('html email'),
            subject: Joi.string()
                .required()
                .description('email title')

        })
    }).description('An object with email setup'),
    events: Joi.array().items({
        type: Joi.string()
            .valid(event_types)
            .required()
            .description('Post events uses the signature `function(request, h)`.')
        ,
        method: Joi.func()
            .required()
            .description('{async function(request, h) || async function(request)} `Request` is the sever request object\n' +
                'and  `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit). If object is returned with'),
        assign: Joi.string()
            .description('{string} result returned from `method`is stored with this key')
    }).default([]),
    expire: Joi.object({
        create: Joi.number()
            .default(d.expire.create)
            .description('Duration (in milliseconds) the  token created in `create` route is valid')
        ,
        forgotPassword: Joi.number()
            .default(d.expire.forgotPassword)
            .description('Duration (in miliseconds) the  token created in `forgotPassword` is valid')
        ,
        login: Joi.number()
            .default(d.expire.login)
            .description(' Duration (in milliseconds) the  token created in `login` route is valid'),
        // loginRenewTokenThreshold: Joi.number()
        //     .default(d.expire.login)
        //     .description(' Duration (in milliseconds) time for which token is automatically renewed calling on login')
    }).default(d.expire)
        .description('Object with durations from creation tokens are valid.'),
    facebook: Joi.object({
        app_id: Joi.string().required().description('facebook app id'),
        app_secret: Joi.string().required().description('facebook app secret')
    }),
    google: Joi.object({
        client_id: Joi.string().required().description('google client id'),
    }),
    methods: Joi.array().items({
        type: Joi.string()
            .valid(method_types)
            .required()
            .description('Name of controller method to replace'),
        method: Joi.func()
            .required()
            .description('Method to replace')
        ,
    }).default([]).description('Overide controller methods'),
    scopesAllowed: Joi.array().items(Joi.string())
        .default(['user', 'admin'])
        .description('Array with names off the allowed scopes')
    ,
    waterline: Joi.object().keys({
        config: Joi.object().keys({
            adapters: Joi.object().required()
                .default(default_waterline.adapters)
                .description('sails adapter e.g.sails-postgres'),
            datastores: Joi.object({
                default: Joi.object()
                    .default(default_waterline.datastores.default)
                    .required()
                    .description('Default datastore adapter name')
            })
                .default(default_waterline.datastores)
                .description('Name datastore and corresponding adapter name')

        }).default(default_waterline),
        models: Joi.object()
            .description("model colletions from initialized orm. Use this if you already\n" +
                " have a waterline orm. Just make sure you include the models into your orm initialization")
    })
        .description('Waterline config se (https://www.npmjs.com/package/waterline')

})


