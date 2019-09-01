[![Build Status](https://travis-ci.org/mickelindahl/hapi_account.svg?branch=master)](https://travis-ci.org/mickelindahl/hapi_account)
[![Coverage Status](https://coveralls.io/repos/github/mickelindahl/hapi_account/badge.svg?branch=2.0.1)](https://coveralls.io/github/mickelindahl/hapi_account?branch=2.0.1)

Hapi account
=============

A REST api for accounts built for [hapi](https://hapijs.com) server with 
Bearer token authentication using [hapi-beaer-token-atuh]() and  
 database for storage of accounts using [waterline](https://www.npmjs.com/package/waterline).
Default adapter is [sails-disk](https://www.npmjs.com/package/sails-disk)

The login route with credentials user and password returns a token
which will expire unless it is renewed by calling renewToken route
within valid time period for the token. This time period can be set by the user.


## Features

* Create and login user via facebook or google
* Bearer token auth via providing cookie with token or
setting Authorization in header to `Bearer {token uuid}
* Automatic deletion of expired tokens
* Token renewal on calling renewToken within token valid time period
* Endpoints for email verification and password reset
* Add custom pre and post calls to each route.
* Documentation of routes can be shown with [hapi-swagger](https://www.npmjs.com/package/hapi-swagger).

## Installation

`npm install --save hapi-account`

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

## Options

See [options](./options.md)

## API
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
- `{options.basePath}/renewToken` {POST}
- `{options.basePath}/resetPassword` {POST}
- `{options.basePath}/updateScope` {POST}
- `{options.basePath}/verifyAccount` {POST}

**Kind**: inner method of [<code>routes</code>](#module_routes)  
<a name="module_controller"></a>

## controller

* [controller](#module_controller)
    * [~auth()](#module_controller..auth)
    * [~changePassword()](#module_controller..changePassword)
    * [~create()](#module_controller..create)
    * [~forgotPassword()](#module_controller..forgotPassword)
    * [~logout()](#module_controller..logout)
    * [~renewToken()](#module_controller..renewToken)
    * [~resetPassword()](#module_controller..resetPassword)
    * [~updateScope()](#module_controller..updateScope)
    * [~verifyAccount()](#module_controller..verifyAccount)

<a name="module_controller..auth"></a>

### controller~auth()
Handler for login, renewToken, loginFacebook and loginGoogle route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
  - `response` {json}
    - `token` token uuid
    - `expires_in` time to token expiration
  - `header`
    - `cookie` token uuid as cookie. If `x-forwarded-proto == https` then secure

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..changePassword"></a>

### controller~changePassword()
Handler for change password route

- `request` hapi server request object
- `reply` hapi server reply object

return {promise}

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..create"></a>

### controller~create()
Handler for create route. Used for routes create, createFacebook and createGoogle.

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Created
   - `code` 201

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..forgotPassword"></a>

### controller~forgotPassword()
Handler for forgotPassword route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Forgot token created

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..logout"></a>

### controller~logout()
Handler for logout route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Logged out

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..renewToken"></a>

### controller~renewToken()
Handler for renew token route.

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
  - `response` {json}
    - `token` token uuid
    - `expires_in` time to token expiration
  - `header`
    - `cookie` token uuid as cookie. If `x-forwarded-proto == https` then secure

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..resetPassword"></a>

### controller~resetPassword()
Handler for resetPassword route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Password updated

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..updateScope"></a>

### controller~updateScope()
Handler to set an account scope

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Scope updated

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..verifyAccount"></a>

### controller~verifyAccount()
Handler for verifyAccount route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Account verified

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller"></a>

## controller

* [controller](#module_controller)
    * [~auth()](#module_controller..auth)
    * [~changePassword()](#module_controller..changePassword)
    * [~create()](#module_controller..create)
    * [~forgotPassword()](#module_controller..forgotPassword)
    * [~logout()](#module_controller..logout)
    * [~renewToken()](#module_controller..renewToken)
    * [~resetPassword()](#module_controller..resetPassword)
    * [~updateScope()](#module_controller..updateScope)
    * [~verifyAccount()](#module_controller..verifyAccount)

<a name="module_controller..auth"></a>

### controller~auth()
Handler for login, renewToken, loginFacebook and loginGoogle route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
  - `response` {json}
    - `token` token uuid
    - `expires_in` time to token expiration
  - `header`
    - `cookie` token uuid as cookie. If `x-forwarded-proto == https` then secure

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..changePassword"></a>

### controller~changePassword()
Handler for change password route

- `request` hapi server request object
- `reply` hapi server reply object

return {promise}

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..create"></a>

### controller~create()
Handler for create route. Used for routes create, createFacebook and createGoogle.

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Created
   - `code` 201

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..forgotPassword"></a>

### controller~forgotPassword()
Handler for forgotPassword route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Forgot token created

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..logout"></a>

### controller~logout()
Handler for logout route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Logged out

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..renewToken"></a>

### controller~renewToken()
Handler for renew token route.

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
  - `response` {json}
    - `token` token uuid
    - `expires_in` time to token expiration
  - `header`
    - `cookie` token uuid as cookie. If `x-forwarded-proto == https` then secure

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..resetPassword"></a>

### controller~resetPassword()
Handler for resetPassword route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Password updated

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..updateScope"></a>

### controller~updateScope()
Handler to set an account scope

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Scope updated

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..verifyAccount"></a>

### controller~verifyAccount()
Handler for verifyAccount route

- `request` hapi server request object
- `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit)

return
   - `response` {string} Account verified

**Kind**: inner method of [<code>controller</code>](#module_controller)  
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
