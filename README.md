Hapi account
=============


A library for with a REST api for accounts. 

## Installation

`npm install --save hapi-account `

## Usage
```js
'use strict'

const Hapi = require( 'hapi' );

const server = new Hapi.Server( { port: 3000 } );

server.register( {
    register: require( 'hapi-account' ),
    options: { 
        accountVerified:false,
        basePath: "401"
        events:[
          {type: 'onPostCreate', method:(request, next)=>{}}  
          {type: 'onPostForgotPassword', method:(request, next)=>{}}                  
        ] ,
    }
});
```

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
