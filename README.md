[![Build Status](https://travis-ci.org/mickelindahl/hapi_account.svg?branch=master)](https://travis-ci.org/mickelindahl/hapi_account)
[![Coverage Status](https://coveralls.io/repos/github/mickelindahl/hapi_account/badge.svg?branch=2.0.1)](https://coveralls.io/github/mickelindahl/hapi_account?branch=2.0.1)

Hapi account
=============

A REST api for accounts built for [hapi](https://hapijs.com) server with 
Bearer token authentication using [hapi-beaer-token-atuh]() and  
 database for storage of accounts using [waterline](https://www.npmjs.com/package/waterline).
Default adapter is [sails-disk](https://www.npmjs.com/package/sails-disk)


## Features

* Create and login user via facebook or google
* Bearer token auth with cookie or payload
* Automatic deletion of expired tokens
* Endpoints for email verification and password reset
* Add custom pre and post calls to each route.

## Installation

`npm install --save hapi-account `

## Usage
```js
'use strict'

const Hapi = require( 'hapi' );
const adapter = require('sails-disk');

const server = new Hapi.Server({);

server.register( {
    plugin: require( 'hapi-account' ),
    options: { 
        accountVerified:false,
        basePath: "account",
        facebook: {
            app_id: 'an id',
            app_secret: 'a secret,
        }
        google: {
            client_id: 'an client id'
        }
        events:[
          {type: 'onPostCreate', method:(request, next)=>{...the madgic}}  
          {type: 'onPostForgotPassword', method:(request, next)=>{...the madgic}}                  
        ] ,
    }
});
```

## Facebook login
To get your `options.facebook.app_id` and `options.facebook.app_secret` got to
[Facebook for developers](https://developers.facebook.com/). Login to an account and
go to My Apps. Either user keys from an an existing app or create a new one. App id and secret
can be found under settings


## Google login
To get your `options.google.client_id` go to [Google cloud console](https://console.cloud.google.com) and login.
Choose and existing project in the top bar or create a new one. Go to APIs & Services to
create or use existing client id

## Email
Get your preferred transporter for [nodmailer](https://www.npmjs.com/package/nodemailer) and add to
`options.email.transporter`

## Routes
Routes can be viewed using [hapi-swagger](https://www.npmjs.com/package/hapi-swagger)

## API
<a name="module_plugin"></a>

## plugin
<a name="module_plugin..register"></a>

### plugin~register()
- `options` Plugin options object with the following keys:
  - `accountVerified` If true then verified property in account is set to false.
  Then user can not be login until account been verified. An event chain
  have to be triggered such that verifyAccount route is called with valid
  token. This can be accomplished by providing a `onPostCreate` `event`
  that for example sends an email url that that triggers the verifyAccount
  route with valid token.
  - `basePath`  base path for route.
  - `cronTimes`
    - `expiredTokenCollector` The time to fire off your job. This can be in the
    - `extendExpirationDate` The time to fire off your job. This can be in the
  form of cron syntax or a JS Date object (see https://www.npmjs.com/package/cron).
  - `email` an object with email setup
    - `transporter` a [nodemailer](https://www.npmjs.com/package/nodemailer) transporter
    - `event` an array of objects with the following
      - `type` Post events uses the signature `function(request, next)`.
        -  `onPostCreate` used to send verification emails. If defined then
         `options.accountVerified` should be false. Thus the email have to provide ulr
        that the user can click on to trigger `validateAccountPassword` route in with
        valid token. The token is available in
        `request.server.plugins['hapi-account'].result.token.uuid`.
        -  `onPostForgotPassword` Have to provide url that the user can
        click to trigger `resetPassword` route in with a valid  token and
        a new password in order to reset a password.
      - `from` sender email
      - `subject` email subject
      - `text` {function(request) | string} to create text body with
      - `html` {function(request) | string} to create html body with
  - `events` an array of objects with the following keys:
    - `type` {string} the extension point event. Pre events uses the signature
       One of:
       - `onPreChangedPassword` Called before changePassword handler is triggered.
       - `onPreCreate` Called before `created` handler is triggered.
       - `onPreForgotPassword` Called before `forgetPassword` handler is triggered.
       - `onPreLogin` Called before `login` handler is triggered.
       - `onPreLogout` Called before `logout` handler is triggered.
       - `onPreResetPassword` Called before `resetPassword` handler is triggered.
       - `onPreVerifyAccount` Called before `verifyAccount` handler is triggered.
       - `onPreUpdateScope` Called before `updateScope` handler is triggered.
       - `onPostChangePassword` Called after `changePassword` handler was triggered.
       - `onPostCreate` Called after `created` handler was triggered.
       - `onPostForgotPassword` Called after `forgotPassword`hanlder was triggered.
       - `onPostLogin` Called after `login` handler was triggered.
       - `onPostLogout` Called after `logout`handler was triggered.
       - `onPostResetPassword` Called after `resetPassword` handler was triggered
       - `onPostVerifyAccount` Called after `verifyAccount` route has been
       - `onPostUpdateScope` Called before `updateScope` handler is triggered.

    - `method` {async function(request, h) || async function(request)} `Request` is the sever request object
      and  `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit). If object is returned with
      `return result` then result is assigned to request.pre with key defined in `assign`
      (See https://hapijs.com/api#route-handler). Data available from upstreams call
      are stored in two places, either in `request.pre` or in `request.server.plugins['hapi-account'].result`.
      triggered with `account` and `token` objects are available in
     'request.plugins['hapi-account'].result'.
    - `assign` {string} result returned from `method`is stored with this key
  - `expire` Object with durations from creation tokens are valid.
    - `create` Duration (in milliseconds) the  token created in `create` route is valid
    - `login` Duration (in milliseconds) the  token created in `login` route is valid
    - `forgotPassword` Duration (in miliseconds) the  token created in `forgotPassword` is valid
  e.g. `{isAccount:(request, reply)=>{..stuff}, encryptPassword:(request, reply)=>{...other stuff}}`.
  See below for method definitions
  - `facebook` {object} Credentials can be created at [facebook for developer](https://developers.facebook.com/)
    - `app_id` {string} Facebook app id
    - `app_secret` {string} Facebook app secret
  - `google` Credentials can be created ad [Google cloud console](https://console.cloud.google.com)
    - `client_id` {string} Google client id
  - `scopesAllowed` Array with names off the allowed scopes
  - `waterline` {object}
    - `config` {object} Waterline config
      - `adapters`:{..adapters},
      - `datastores`:{...datastores}
    - `models` {object} model colletions from initialized orm. Use this if you already
    have a waterline orm. Just make sure you include the models into your orm initialization

**Kind**: inner method of [<code>plugin</code>](#module_plugin)  
<a name="module_routes"></a>

## routes
<a name="module_routes..routes"></a>

### routes~routes()
- `{options.basePath}/changePassword` {POST}
- `{options.basePath}/forgotPassword` {POST}
- `{options.basePath}/create` {POST}
- `{options.basePath}/createFacebook` {POST}
- `{options.basePath}/createGoogle` {POST}
- `{options.basePath}/login` {POST}
- `{options.basePath}/loginFacebook` {POST}
- `{options.basePath}/loginGoogle` {POST}
- `{options.basePath}/logout` {POST}
- `{options.basePath}/resetPassword` {POST}
- `{options.basePath}/updateScope` {POST}
- `{options.basePath}/verifyAccount` {POST}

**Kind**: inner method of [<code>routes</code>](#module_routes)  
## Tests


### Unittests
```
npm run test
```

### Manual test google and facebook
Go to lib/test/manual
Run
```npm install```
Copy sample.env to .env
```cp sample.env .env```
Open .env and add facebook and google credentials

Go to http://locahost:2000

Routes can be viewed at http://localhost:2000/documentation

## Contributing

Feel free to submit issues and pull request on bugs or feature request.

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality.
