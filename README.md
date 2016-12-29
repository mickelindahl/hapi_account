Hapi account
=============

A REST api for accounts built for [hapi](https://hapijs.com) server with 
Bearer token authentication using [hapi-beaer-token-atuh]() and  
 datanase for storage of accounts adn tokens using 
 [hapi-waterline](https://github.com/Pencroff/hapi-waterline).
 * Automatic deletion of expired tokens
 * Email verification and password reset can be added with an email client (e.g. [mailgun]())  
 * Add custom pre and post calls to each route.   
 * Bearer token can either be set in `headers.authorization.token=Bearer {uuid}`
  or sent in a cookie `token={uuid}`.
## Installation

`npm install --save hapi-account `

## Usage
```js
'use strict'

const Hapi = require( 'hapi' );

const server = new Hapi.Server();
server.connection({ port: 3000 });

server.register( {
    register: require( 'hapi-account' ),
    options: { 
        accountVerified:false,
        basePath: "account",
        events:[
          {type: 'onPostCreate', method:(request, next)=>{...the madgic}}  
          {type: 'onPostForgotPassword', method:(request, next)=>{...the madgic}}                  
        ] ,
    }
});
```
 - `options` Plugin options object with the following keys:
   - `accountVerified` If true then verified property in account is set to false.
   Then user can not be login until account been verified. An event chain
   have to be triggered such that verifyAccount route is called with valid
   token. This can be accomplished by providing a `onPostCreate` `event`
   that for example sends an email url that that triggers the verifyAccount
   route with valid token.
   - `basePath`  base path for route.
   - `cronTime` The time to fire off your job. This can be in the
   form of cron syntax or a JS Date object (see https://www.npmjs.com/package/cron).
   - `events` an object or array of objects with the following:
     - `type` the extension point event. Pre events uses the signature
     `function(request, reply)`and post events `function(request, next)`.
     `Request` is the sever request object. `Reply` and `next` is called
     to give the control back to the framework. `Reply` can be called with
     a object which is assigned to request.pre with key defined in `assign`
     (See https://hapijs.com/api#route-handler).
       - `onPreChangedPassword` Called before changePassword handler is triggered.
       - `onPreCreate` Called before created handler is triggered.
       - `onPreForgotPassword` Called before forgetPassword handler is triggered.
       - `onPreLogin` Called before login handler is triggered.
       - `onPreLogout` Called before logout handler is triggered.
       - `onPreResetPassword` Called before resetPassword handler is triggered.
       - `onPreVerifyAccount` Called before verifyAccount handler is triggered.
       - `onPostChangePassword` Called after `changePassword` route has been
       triggered with `account` and `token` objects are available in
       'request.plugins['hapi-account'].result'.
       - `onPostCreate` Called after an account is created with
       `account` and `token` (token is only created with `options.accountVerified=true`)
       objects are available in 'request.plugins['hapi-account'].result'.
       - `onPostForgotPassword` Called after forgot password route has been
       triggered  `account` and `token` objects are available in `request.plugins['hapi-account'].result`.
       Have to provide a way for the user to trigger `resetPassword` route in
       order to reset a password.
       - `onPostLogin` Called after login with `account` and `token` objects are available in
       'request.plugins['hapi-account'].result'.
       - `onPostLogout` Called after logout
       - `onPostResetPassword` Called after `resetPassword` route has been
       triggered with `account` and `token` objects are available in
       'request.plugins['hapi-account'].result'.
       - `onPostVerifyAccount` Called after `verifyAccount` route has been
       triggered with `account` and `token` objects are available in
       'request.plugins['hapi-account'].result'.
   - `expire` Object with durations from creation tokens are valid.
     - `create` Duration (in seconds) the  token created in `create` route is valid
     - `login` Duration (in seconds) the  token created in `login` route is valid
     - `forgotPassword` Duration (in seconds) the  token created in `forgotPassword`
     route is valid
## Routes
* Create account url `{ base path... }/`. If `options.verifyAccount` is 
 `false` then verify account route has to be called with a valid token. This can be done by
 supplying an `onPostCreate` `function(request, next)` that sends a email to the user
 with a url to a web-page that POST to verify account root with
 a valid token. A valid token is stored in `request.server.plugins['hapi-account].result.token.uuid`.
* Login url `{ base path... }/login` 
* Logout url `{ base path... }/logout`
* Forgot password url `{ base path... }/forgotPassword`. In order to
 reset the password the user has to trigger rest password route with
 a valid token. This can be accomplished by supplying an 
 `onPostForgotPassword` `function(request, next)` that sends a email to 
 the user with a url to a web-page that POST to reset password
  url with a valid token in the payload. A valid token is 
  stored in `request.server.plugins['hapi-account].result.token.uuid`
* Reset password url `{ base path... }/resetPassword`
* Change password url `{ base path... }/changePassword`
* Verify account url `{ base path... }/verifyAccount`

## Table
account
```js
attributes: {
       user: {
           type: 'string',
           unique: true
       },
       email: {
           type: 'string',
           unique: true
       },
       password: 'string',
       verified: 'boolean'
   }
```
   
token
```js
attributes: {
      account_id:'integer',
      uuid: 'string',
      status: 'string',
      expireAt: 'datetime'
  }
```

## Tests

  Lab.cmd

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History
