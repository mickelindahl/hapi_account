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
 * Facebook and Google login. With facebook or google login a account will automatically be created for the particular email. However a password will not be created. Thus this has to be done separately. Once a email is associated with an account a person will be login to this account when authenticating themslelf either by facebook, google or native login.
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

## API
<a name="module_index"></a>

## index

* [index](#module_index)
    * _static_
        * [.register(options)](#module_index.register)
    * _inner_
        * [~expiredTokenCollector()](#module_index..expiredTokenCollector) ⇒

<a name="module_index.register"></a>

### index.register(options)
- `server` Hapi server object
- `options` Plugin options object with the following keys:
  - `accountVerified` If true then verified property in account is set to false.
  Then user can not be login until account been verified. An event chain
  have to be triggered such that verifyAccount route is called with valid
  token. This can be accomplished by providing a `onPostCreate` `event`
  that for example sends an email url that that triggers the verifyAccount
  route with valid token.
  - `basePath`  base path for route.
  - `cronTimes`
    - `ExpiredTokenCollector` The time to fire off your job. This can be in the
    - `ExtendExpirationDate` The time to fire off your job. This can be in the
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
      - `text` `function(request)` or string to create text body with
      - `html` `function(request)` or string to create html body with
  - `events` an oarray of objects with the following:
    - `type` the extension point event. Pre events uses the signature
    `function(request, reply)`and post events `function(request, next)`.
    `Request` is the sever request object. `Reply` and `next` is called
    to give the control back to the framework. `Reply` can be called with
    a object which is assigned to request.pre with key defined in `assign`
    (See https://hapijs.com/api#route-handler). Data available from upstreams call
    are stored in two places, either in `request.pre` or in `request.server.plugins['hapi-account'].result`
      - `onPreChangedPassword` Called before changePassword handler is triggered.
      - `onPreCreatePost` Called before `created` handler is triggered.
      - `onPreForgotPassword` Called before `forgetPassword` handler is triggered.
      - `onPreLogin` Called before `login` handler is triggered.
      - `onPreLogout` Called before `logout` handler is triggered.
      - `onPreResetPassword` Called before `resetPassword` handler is triggered.
      - `onPreVerifyAccount` Called before `verifyAccount` handler is triggered.
      - `onPostChangePassword` Called after `changePassword` handler was triggered.
      - `onPostCreate` Called after `created` handler was triggered.
      - `onPostForgotPassword` Called after `forgotPassword`hanlder was triggered.
      - `onPostLogin` Called after `login` handler was triggered.
      - `onPostLogout` Called after `logout`handler was triggered.
      - `onPostResetPassword` Called after `resetPassword` handler was triggered
      - `onPostVerifyAccountPOST` Called after `verifyAccount` route has been
      triggered with `account` and `token` objects are available in
      'request.plugins['hapi-account'].result'.
  - `expire` Object with durations from creation tokens are valid.
    - `create` Duration (in seconds) the  token created in `create` route is valid
    - `login` Duration (in seconds) the  token created in `login` route is valid
    - `forgotPassword` Duration (in seconds) the  token created in `forgotPassword` is valid
  - `method` Object user can provide custom function for plugin public methods
  e.g. `{isAccount:(request, reply)=>{..stuff}, encryptPassword:(request, reply)=>{...other stuff}}`.
  See below for method definitions
  - `scopesAllowed` Array with names off the allowed scopes
- next Continue registration

**Kind**: static method of [<code>index</code>](#module_index)  
**Api**: public  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_index..expiredTokenCollector"></a>

### index~expiredTokenCollector() ⇒
Function called at cron job collecting expired tokens

**Kind**: inner method of [<code>index</code>](#module_index)  
**Returns**: promise  
**Api**: public  
<a name="module_routes"></a>

## routes
<a name="exp_module_routes--module.exports"></a>

### module.exports() ⏏
- `/changePassword` {POST}
- `/forgotPassword` {POST}
- `/create` {POST}
- `/login` {POST}
- `/loginFacebook` {POST}
- `/loginGoogle` {POST}
- `/logout` {POST}
- `/resetPassword` {POST}
- `/updateScope` {POST}
- `/verifyAccount` {POST}

**Kind**: Exported function  
<a name="module_pre"></a>

## pre

* [pre](#module_pre)
    * [~destroyToken()](#module_pre..destroyToken)
    * [~encryptPassword()](#module_pre..encryptPassword)
    * [~getDatabaseAccount()](#module_pre..getDatabaseAccount)
    * [~getDatabaseToken()](#module_pre..getDatabaseToken)
    * [~isAccount()](#module_pre..isAccount)
    * [~verifyFacebookToken()](#module_pre..verifyFacebookToken)
    * [~verifyGoogleToken()](#module_pre..verifyGoogleToken)
    * [~verifyToken()](#module_pre..verifyToken)
    * [~verifyUser()](#module_pre..verifyUser)
    * [~verifyOrCreateFacebookUser()](#module_pre..verifyOrCreateFacebookUser)
    * [~verifyOrCreateGoogleUser()](#module_pre..verifyOrCreateGoogleUser)
    * [~verifyOrCreateExternalUser()](#module_pre..verifyOrCreateExternalUser)
    * [~verifyPassword()](#module_pre..verifyPassword)

<a name="module_pre..destroyToken"></a>

### pre~destroyToken()
Destroys a token

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..encryptPassword"></a>

### pre~encryptPassword()
Encrypts incoming password

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..getDatabaseAccount"></a>

### pre~getDatabaseAccount()
Returns account database object

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..getDatabaseToken"></a>

### pre~getDatabaseToken()
Returns token database object

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..isAccount"></a>

### pre~isAccount()
Check if account exist

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyFacebookToken"></a>

### pre~verifyFacebookToken()
Verify that provided facebook token is valid

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyGoogleToken"></a>

### pre~verifyGoogleToken()
Verify that provided google token is valid

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyToken"></a>

### pre~verifyToken()
Verify that provided token is valid

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyUser"></a>

### pre~verifyUser()
Verify that user are valid

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyOrCreateFacebookUser"></a>

### pre~verifyOrCreateFacebookUser()
Verify that user is facebook user. Create user if missing

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyOrCreateGoogleUser"></a>

### pre~verifyOrCreateGoogleUser()
Verify that user is google user. Create user if missing

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyOrCreateExternalUser"></a>

### pre~verifyOrCreateExternalUser()
Verify that user is google user. Create user if missing

- `created_by` {string} Type of auth used for creating account facebook | google
- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_pre..verifyPassword"></a>

### pre~verifyPassword()
Validate user password

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>pre</code>](#module_pre)  
<a name="module_controller"></a>

## controller

* [controller](#module_controller)
    * [~_generateToken()](#module_controller.._generateToken)
    * [~changePassword()](#module_controller..changePassword)
    * [~create()](#module_controller..create)
    * [~forgotPassword()](#module_controller..forgotPassword)
    * [~login()](#module_controller..login)
    * [~logout()](#module_controller..logout)
    * [~resetPassword()](#module_controller..resetPassword)
    * [~updateScope()](#module_controller..updateScope)
    * [~verifyAccount()](#module_controller..verifyAccount)

<a name="module_controller.._generateToken"></a>

### controller~_generateToken()
Generates a token

- `account` {object} object with account details
- `status` {datetime} token status to set
- `expires`{integer} date the token is valid to

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..changePassword"></a>

### controller~changePassword()
Handler for change password route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..create"></a>

### controller~create()
Handler for create route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..forgotPassword"></a>

### controller~forgotPassword()
Handler for forgotPassword route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..login"></a>

### controller~login()
Handler for login route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..logout"></a>

### controller~logout()
Handler for logout route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..resetPassword"></a>

### controller~resetPassword()
Handler for resetPassword route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..updateScope"></a>

### controller~updateScope()
Handler to set an account scope

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
<a name="module_controller..verifyAccount"></a>

### controller~verifyAccount()
Handler for verifyAccount route

- `request` hapi server request object
- `reply` hapi server reply object

**Kind**: inner method of [<code>controller</code>](#module_controller)  
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

For facebook test to pass one have to add a valid user token in `testenv` to `FACEBOOK_TMP_USER_TOKEN`. Va token can be generated from your facebook developer
app account `https://developers.facebook.com/apps` under **roles**->**Test Users** click **edit** on a user and then **Get an access token for this user**

For google test to pass get an tokenId. TODO: add way to get one. Add a test server which expose this

```
npm run test
npm run test-facebook
npm run test-google
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History
