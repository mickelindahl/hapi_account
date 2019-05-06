# Schema

```

```

| Abstract            | Extensible | Status       | Identifiable | Custom Properties | Additional Properties | Defined In |
| ------------------- | ---------- | ------------ | ------------ | ----------------- | --------------------- | ---------- |
| Can be instantiated | No         | Experimental | No           | Forbidden         | Forbidden             |            |

# Properties

| Property                              | Type       | Required | Nullable | Default                                                            | Defined by    |
| ------------------------------------- | ---------- | -------- | -------- | ------------------------------------------------------------------ | ------------- |
| [accountVerified](#accountverified)   | `boolean`  | Optional | No       | `false`                                                            | (this schema) |
| [authStrategyName](#authstrategyname) | `string`   | Optional | No       | `"simple"`                                                         | (this schema) |
| [basePath](#basepath)                 | `string`   | Optional | No       | `""`                                                               | (this schema) |
| [cronTime](#crontime)                 | `object`   | Optional | No       | `{"expiredTokenCollector":"00 */10 * * * *"}`                      | (this schema) |
| [email](#email)                       | `object`   | Optional | No       |                                                                    | (this schema) |
| [events](#events)                     | `object[]` | Optional | No       | `[]`                                                               | (this schema) |
| [expire](#expire)                     | `object`   | Optional | No       | `{"create":432000000,"forgotPassword":86400000,"login":432000000}` | (this schema) |
| [facebook](#facebook)                 | `object`   | Optional | No       |                                                                    | (this schema) |
| [google](#google)                     | `object`   | Optional | No       |                                                                    | (this schema) |
| [methods](#methods)                   | `object[]` | Optional | No       | `[]`                                                               | (this schema) |
| [scopesAllowed](#scopesallowed)       | `string[]` | Optional | No       | `["user","admin"]`                                                 | (this schema) |
| [waterline](#waterline)               | `object`   | Optional | No       |                                                                    | (this schema) |

## accountVerified

If true then verified property in account is set to false. Then user can not be login until account been verified. An
event chain have to be triggered such that verifyAccount route is called with valid token. This can be accomplished by
providing a `onPostCreate` `event` that for example sends an email url that that triggers the verifyAccount route with
valid token.

`accountVerified`

- is optional
- type: `boolean`
- default: `false`
- defined in this schema

### accountVerified Type

`boolean`

## authStrategyName

The server.auth.strategy schema name (hapi accunt used "bearer-access-token" schema) see
[hapijs](https://hapijs.com/tutorials/auth#strategies).

`authStrategyName`

- is optional
- type: `string`
- default: `"simple"`
- defined in this schema

### authStrategyName Type

`string`

## basePath

base path for routes as {basePath}/login or {basePath}/create

`basePath`

- is optional
- type: `string`
- default: `""`
- defined in this schema

### basePath Type

`string`

## cronTime

`cronTime`

- is optional
- type: `object`
- default: `{"expiredTokenCollector":"00 */10 * * * *"}`
- defined in this schema

### cronTime Type

`object` with following properties:

| Property                | Type   | Required | Default             |
| ----------------------- | ------ | -------- | ------------------- |
| `expiredTokenCollector` | string | Optional | `"00 */10 * * * *"` |

#### expiredTokenCollector

The time to fire your job for removing expired tokens in db. This can be in the form of cron syntax or a JS Date object
(see https://www.npmjs.com/package/cron).

`expiredTokenCollector`

- is optional
- type: `string`
- default: `"00 */10 * * * *"`

##### expiredTokenCollector Type

`string`

## email

An object with email setup

`email`

- is optional
- type: `object`
- defined in this schema

### email Type

`object` with following properties:

| Property      | Type   | Required     |
| ------------- | ------ | ------------ |
| `events`      | array  | Optional     |
| `transporter` | object | **Required** |

#### events

`events`

- is optional
- type: `object[]`

##### events Type

Array type: `object[]`

All items must be of the type: `object` with following properties:

| Property  | Type   | Required     |
| --------- | ------ | ------------ |
| `from`    | string | **Required** |
| `html`    |        | **Required** |
| `subject` | string | **Required** |
| `text`    |        | **Required** |
| `to`      | string | **Required** |
| `type`    | string | **Required** |

#### from

sending email

`from`

- is **required**
- type: `string`

##### from Type

`string`

#### html

html email

`html`

- is **required**
- type: complex

##### html Type

**One** of the following _conditions_ need to be fulfilled.

#### Condition 1

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


#### Condition 2

`string`

#### subject

email title

`subject`

- is **required**
- type: `string`

##### subject Type

`string`

#### text

plain text email

`text`

- is **required**
- type: complex

##### text Type

**One** of the following _conditions_ need to be fulfilled.

#### Condition 1

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


#### Condition 2

`string`

#### to

receiving email

`to`

- is **required**
- type: `string`

##### to Type

`string`

#### type

event type to attached send email to

`type`

- is **required**
- type: `enum`

The value of this property **must** be equal to one of the [known values below](#email-known-values).

##### type Known Values

| Value                  | Description |
| ---------------------- | ----------- |
| `onPreChangedPassword` |             |
| `onPreCreate`          |             |
| `onPreForgotPassword`  |             |
| `onPreLogin`           |             |
| `onPreLogout`          |             |
| `onPreResetPassword`   |             |
| `onPreVerifyAccount`   |             |
| `onPreUpdateScope`     |             |
| `onPostChangePassword` |             |
| `onPostCreate`         |             |
| `onPostForgotPassword` |             |
| `onPostLogin`          |             |
| `onPostLogout`         |             |
| `onPostResetPassword`  |             |
| `onPostVerifyAccount`  |             |
| `onPostUpdateScope`    |             |

#### transporter

nodemailer transporter

`transporter`

- is **required**
- type: `object`

##### transporter Type

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


## events

`events`

- is optional
- type: `object[]`

- default: `[]`
- defined in this schema

### events Type

Array type: `object[]`

All items must be of the type: `object` with following properties:

| Property | Type   | Required     |
| -------- | ------ | ------------ |
| `assign` | string | Optional     |
| `method` | object | **Required** |
| `type`   | string | **Required** |

#### assign

{string} result returned from `method`is stored with this key

`assign`

- is optional
- type: `string`

##### assign Type

`string`

#### method

{async function(request, h) || async function(request)} `Request` is the sever request object and `h`
[hapi response toolkit](https://hapijs.com/api#response-toolkit). If object is returned with

`method`

- is **required**
- type: `object`

##### method Type

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


#### type

Post events uses the signature `function(request, h)`.

`type`

- is **required**
- type: `enum`

The value of this property **must** be equal to one of the [known values below](#events-known-values).

##### type Known Values

| Value                  | Description |
| ---------------------- | ----------- |
| `onPreChangedPassword` |             |
| `onPreCreate`          |             |
| `onPreForgotPassword`  |             |
| `onPreLogin`           |             |
| `onPreLogout`          |             |
| `onPreResetPassword`   |             |
| `onPreVerifyAccount`   |             |
| `onPreUpdateScope`     |             |
| `onPostChangePassword` |             |
| `onPostCreate`         |             |
| `onPostForgotPassword` |             |
| `onPostLogin`          |             |
| `onPostLogout`         |             |
| `onPostResetPassword`  |             |
| `onPostVerifyAccount`  |             |
| `onPostUpdateScope`    |             |

## expire

Object with durations from creation tokens are valid.

`expire`

- is optional
- type: `object`
- default: `{"create":432000000,"forgotPassword":86400000,"login":432000000}`
- defined in this schema

### expire Type

`object` with following properties:

| Property         | Type   | Required | Default     |
| ---------------- | ------ | -------- | ----------- |
| `create`         | number | Optional | `432000000` |
| `forgotPassword` | number | Optional | `86400000`  |
| `login`          | number | Optional | `432000000` |

#### create

Duration (in milliseconds) the token created in `create` route is valid

`create`

- is optional
- type: `number`
- default: `432000000`

##### create Type

`number`

#### forgotPassword

Duration (in miliseconds) the token created in `forgotPassword` is valid

`forgotPassword`

- is optional
- type: `number`
- default: `86400000`

##### forgotPassword Type

`number`

#### login

Duration (in milliseconds) the token created in `login` route is valid

`login`

- is optional
- type: `number`
- default: `432000000`

##### login Type

`number`

## facebook

`facebook`

- is optional
- type: `object`
- defined in this schema

### facebook Type

`object` with following properties:

| Property     | Type   | Required     |
| ------------ | ------ | ------------ |
| `app_id`     | string | **Required** |
| `app_secret` | string | **Required** |

#### app_id

facebook app id

`app_id`

- is **required**
- type: `string`

##### app_id Type

`string`

#### app_secret

facebook app secret

`app_secret`

- is **required**
- type: `string`

##### app_secret Type

`string`

## google

`google`

- is optional
- type: `object`
- defined in this schema

### google Type

`object` with following properties:

| Property    | Type   | Required     |
| ----------- | ------ | ------------ |
| `client_id` | string | **Required** |

#### client_id

google client id

`client_id`

- is **required**
- type: `string`

##### client_id Type

`string`

## methods

Overide controller methods

`methods`

- is optional
- type: `object[]`

- default: `[]`
- defined in this schema

### methods Type

Array type: `object[]`

All items must be of the type: `object` with following properties:

| Property | Type   | Required     |
| -------- | ------ | ------------ |
| `method` | object | **Required** |
| `type`   | string | **Required** |

#### method

Method to replace

`method`

- is **required**
- type: `object`

##### method Type

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


#### type

Name of controller method to replace

`type`

- is **required**
- type: `enum`

The value of this property **must** be equal to one of the [known values below](#methods-known-values).

##### type Known Values

| Value                | Description |
| -------------------- | ----------- |
| `destroyToken`       |             |
| `getDatabaseAccount` |             |
| `getDatabaseToken`   |             |
| `isAccount`          |             |
| `verifyToken`        |             |
| `verifyUser`         |             |
| `verifyPassword`     |             |

## scopesAllowed

Array with names off the allowed scopes

`scopesAllowed`

- is optional
- type: `string[]`

- default: `["user","admin"]`
- defined in this schema

### scopesAllowed Type

Array type: `string[]`

All items must be of the type: `string`

## waterline

Waterline config se (https://www.npmjs.com/package/waterline

`waterline`

- is optional
- type: `object`
- defined in this schema

### waterline Type

`object` with following properties:

| Property | Type   | Required | Default                                                                                                                                                                                              |
| -------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config` | object | Optional | `{"adapters":{"sails-disk":{"identity":"sails-disk","adapterApiVersion":1,"defaults":{"schema":false,"dir":".tmp/localDiskDb"},"datastores":{}}},"datastores":{"default":{"adapter":"sails-disk"}}}` |
| `models` | object | Optional |                                                                                                                                                                                                      |

#### config

`config`

- is optional
- type: `object`
- default:
  `{"adapters":{"sails-disk":{"identity":"sails-disk","adapterApiVersion":1,"defaults":{"schema":false,"dir":".tmp/localDiskDb"},"datastores":{}}},"datastores":{"default":{"adapter":"sails-disk"}}}`

##### config Type

`object` with following properties:

| Property     | Type   | Required     | Default                                                                                                                               |
| ------------ | ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `adapters`   | object | **Required** | `{"sails-disk":{"identity":"sails-disk","adapterApiVersion":1,"defaults":{"schema":false,"dir":".tmp/localDiskDb"},"datastores":{}}}` |
| `datastores` | object | Optional     | `{"default":{"adapter":"sails-disk"}}`                                                                                                |

#### adapters

sails adapter e.g.sails-postgres

`adapters`

- is **required**
- type: `object`
- default:
  `{"sails-disk":{"identity":"sails-disk","adapterApiVersion":1,"defaults":{"schema":false,"dir":".tmp/localDiskDb"},"datastores":{}}}`

##### adapters Type

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


#### datastores

Name datastore and corresponding adapter name

`datastores`

- is optional
- type: `object`
- default: `{"default":{"adapter":"sails-disk"}}`

##### datastores Type

`object` with following properties:

| Property  | Type   | Required     | Default                    |
| --------- | ------ | ------------ | -------------------------- |
| `default` | object | **Required** | `{"adapter":"sails-disk"}` |

#### default

Default datastore adapter name

`default`

- is **required**
- type: `object`
- default: `{"adapter":"sails-disk"}`

##### default Type

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |


#### models

model colletions from initialized orm. Use this if you already have a waterline orm. Just make sure you include the
models into your orm initialization

`models`

- is optional
- type: `object`

##### models Type

`object` with following properties:

| Property | Type | Required |
| -------- | ---- | -------- |

