/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

const code = require( "code" );
const debug = require( 'debug' )( 'account:test:index' );
const Lab = require( "lab" );
const path = require( 'path' );
const EventEmitter = require( 'events' );
const serverPromise = require( './test_server.js' );

//const dotenv = require('dotenv')
require('dotenv').config({ path: path.join(path.resolve(),  'testenv')})

let lab = exports.lab = Lab.script();

function throwErrorEvent( type ) {
    return {
        type: type,
        method: ( request, next )=> {
            throw type + ' error'
        }
    }
}

function emittTokenEvent() {
    return {
        type: 'onPostCreate',
        method: ( request, next )=> {

            setTimeout( ()=> {

                    debug( debug( request.server.plugins['hapi-account'].result ) );
                    let uuid = request.server.plugins['hapi-account'].result.token.uuid;
                    request.server.app.ee.emit( 'token', uuid )
                }
                , 1000 )

            next()
        }
    }
}


let injectOptionsCreate = {
    method: "POST",
    url: "/create",
    payload: {
        email: 'me@help.se',
        password: 'secret',
    },
    // credentials: {} // To bypass auth strategy
};

let injectOptionsLogin = {
    method: "POST",
    url: "/login",
    payload: {
        email: 'me@help.se',
        password: 'secret'
    },
    // credentials: {} // To bypass auth strategy
};

//let injectOptionsLoginFacebook = {
//    method: "POST",
//    url: "/loginFacebook",
//    payload: {
//        email: 'hapi_wlblgfj_test@tfbnw.net',
//        //email: 'hapi_wlblgfj_test@tfbnw.net',
//        token:process.env.FACEBOOK_TMP_USER_TOKEN, // to generate go to facebook dev for app and generate a token for a test user
//
//
//    },
//    // credentials: {} // To bypass auth strategy
//};

let injectOptionsLogout = {
    method: "POST",
    url: "/logout",
    payload: {
        token: null,
    },
    headers: { Authorization: null }
    // credentials: {} // To bypass auth strategy
};

let injectOptionsUpdateScope = {
    method: "POST",
    url: "/updateScope",
    payload: {
        add: ['admin', 'admin', 'user'],
        remove: ['user', 'user']
    },
    headers: { Authorization: null }
    // credentials: {} // To bypass auth strategy
};

let injectOptionsForgotPassword = {
    method: "POST",
    url: "/forgotPassword",
    payload: {
        email: 'me@help.se',
    },
};

let injectOptionsChangePassword = {
    method: "POST",
    url: "/changePassword",
    headers: { Authorization: 'a token' },
    payload: {
        password: 'new secret',
    },
     credentials: {} // To bypass auth strategy
};

let injectOptionsVerifyAccount = {
    method: "POST",
    url: "/verifyAccount",
    payload: {
        token: null,
    },
};

let injectOptionsResetPassword = {
    method: "POST",
    url: "/resetPassword",
    payload: {
        password: "new secret",
        token: null,
    },
};

let emails = {

    transporter: {
        sendMail: ( options, done )=> {
            done( null )
        }

    },
    events: [{
        type: 'onPostCreate',
        text: 'Hej!',
        html: '<p>Hej!</p>',
        subject: 'Important',
        from: 'me@you.se'
    }]
};

let emailsErrorAndFun= {

    transporter: {
        sendMail: ( options, done )=> {
            done( 'an error' )
        }

    },
    events: [{
        type: 'onPostCreate',
        text: (request)=>{return 'Hej!'},
        html: (request)=>{return '<p>Hej!</p>'},
        subject: 'Important',
        from: 'me@you.se'
    }]
}

let serverOptionsCreate = { keyId: 'email', accountVerified: true };
let serverOptionsLogin = { keyId: 'email', accountVerified: true };
//let serverOptionsLoginFacebook = {
//    keyId: 'email',
//    accountVerified: true,
//    facebook:{
//        app_id: process.env.FACEBOOK_APP_ID,
//        app_secret: process.env.FACEBOOK_APP_SECRET,
//    }
//};

//debug(serverOptionsLoginFacebook)
//throw 'l'
let serverOptionsLogout = { keyId: 'email', accountVerified: true };
let serverOptionsForgotPassword = { keyId: 'email', accountVerified: true };
let serverOptionsChangePassword = { keyId: 'email', accountVerified: true };
let serverOptionsUpdateScope = { keyId: 'email', accountVerified: true };
let serverOptionsVerifyAccount = { keyId: 'email', accountVerified: false };
let serverOptionsResetPassword = { keyId: 'email', accountVerified: false };

let _server;
let _options;
// The order of tests matters!!!
lab.experiment( "Account", ()=> {

    lab.afterEach( done=> {

        _server.app.adapter.teardown( ()=> {
            _server.stop( done )
        } )

    } );


    lab.test( 'Testing create with accountVerified true, updateScope, pre event, methods, emails, and basePath, and logout',
        ( done ) => {

            serverOptionsCreate.events = [
                {
                    type: 'onPreCreate',
                    method: ( request, reply )=> {
                        debug( 'attached onPre' );
                        reply()
                    }
                }
            ];

            serverOptionsCreate.method={expiredTokenCollector:()=>{}};
            serverOptionsCreate.emails = emails;
            serverOptionsCreate.basePath = '/assume/';

            injectOptionsCreate.url = '/assume/create';
            injectOptionsLogin.url = '/assume/login';
            injectOptionsLogout.url = '/assume/logout';
            injectOptionsUpdateScope.url = '/assume/updateScope';

            // start_server( options ).then( result => {
            serverPromise( serverOptionsCreate ).then( server=> {
                _server = server;
                return _server.inject( injectOptionsCreate )
            } ).then( response => {

                debug(response.result)

                code.expect( response.statusCode ).to.equal( 201 );
                code.expect( response.result ).to.be.an.object()

                return _server.inject( injectOptionsLogin )
            } ).then( response => {


                injectOptionsUpdateScope.headers.cookie = response.headers['set-cookie'].split(';')[0];
                injectOptionsLogout.headers.cookie = response.headers['set-cookie'].split(';')[0];

                return _server.inject( injectOptionsUpdateScope )

            } ).then( response => {


                code.expect( response.result ).to.equal( 'Scope updated' );
                return _server.inject( injectOptionsLogout )

            } ).then( response => {

                debug(response.result)

                injectOptionsCreate.url = '/create';
                injectOptionsLogin.url = '/login';
                injectOptionsLogout.url = '/logout';
                injectOptionsUpdateScope.url = '/updateScope';
                delete serverOptionsCreate.events;
                delete serverOptionsCreate.emails;
                delete serverOptionsCreate.basePath;
                delete serverOptionsCreate.method;

                code.expect( response.statusCode ).to.equal( 200 );
                code.expect( response.result ).to.be.equal( 'Logged out' );
                done()

            } );
        } );


    lab.test( 'Testing create with email function and error and login with accountVerified false',
        ( done ) => {

            serverOptionsCreate.emails=emailsErrorAndFun;
            serverOptionsCreate.accountVerified=false;

            serverPromise( serverOptionsCreate ).then( server => {

                _server = server;
                return server.inject( injectOptionsCreate )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 201 );
                code.expect( response.result ).to.be.an.object()

                injectOptionsLogin.payload.email = 'me@help.se';

                return _server.inject( injectOptionsLogin )
            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 400 );
                code.expect( response.result.message ).to.equal( 'Account not verified' );
                delete serverOptionsCreate.emails;
                serverOptionsCreate.accountVerified=true;
                done()
            } );
        } );


    lab.test( 'Testing create account onPostCreate throw error and unused event',
        ( done ) => {

            serverOptionsCreate.events = [throwErrorEvent('onPostCreate'),
                {
                    type: 'onPostForgotPassword',
                    method: ()=> {
                    }
                }
            ];

            serverPromise( serverOptionsCreate ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 500 );
                code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                delete serverOptionsCreate.events;
                done();

            } );
        } );


    lab.test( 'Testing create account exist',
        ( done ) => {

            serverPromise( serverOptionsCreate ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )
            } ).then( response => {

                return _server.inject( injectOptionsCreate )
            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 400 );
                code.expect( response.result.message ).to.be.equal( 'Account exists' );
                done()

            } )
        } );


    lab.test( 'Testing login throw error and expire in options',
        ( done ) => {

            serverOptionsLogin.events = [throwErrorEvent('onPostLogin')];
            serverOptionsLogin.expire = { login: '1 * * * *' };

            serverPromise( serverOptionsLogin ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 500 );
                code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                delete serverOptionsLogin.events;
                delete serverOptionsLogin.expire;
                done();
            } );
        } );


    lab.test( 'Testing login wrong user',
        ( done ) => {

            serverPromise( serverOptionsLogin ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                injectOptionsLogin.payload.email = 'not@right';
                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 404 );
                code.expect( response.result.message ).to.equal( 'Account not found' );
                done();
            } )
        } );


    lab.test( 'Testing login',
        ( done ) => {

            serverPromise( serverOptionsLogin ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                injectOptionsLogin.payload.email = 'me@help.se';
                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 200 );
                code.expect( response.headers['set-cookie'] ).to.be.a.string();
                done();
            } )
        } );


    //lab.test( 'Testing login facebook',
    //    ( done ) => {
    //
    //        serverPromise( serverOptionsLoginFacebook ).then( server => {
    //
    //            _server = server;
    //
    //            return _server.inject( injectOptionsLoginFacebook )
    //
    //        } ).then( response => {
    //
    //            return _server.inject( injectOptionsLoginFacebook )
    //
    //        } ).then( response => {
    //
    //            code.expect( response.statusCode ).to.equal( 200 );
    //            code.expect( response.headers['set-cookie'] ).to.be.a.string();
    //            done();
    //        } )
    //    } );

    lab.test( 'Testing login wrong password',
        ( done ) => {

            serverPromise( serverOptionsLogin ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                injectOptionsLogin.payload.password = 'wrong';
                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 403 );
                code.expect( response.result.message ).to.equal( 'Wrong password' );
                injectOptionsLogin.payload.password = 'secret';
                done()

            } )
        } );


    lab.test( 'Testing logout unauthorized bad token',
        ( done ) => {
            serverPromise( serverOptionsLogout ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                injectOptionsLogout.headers.Authorization = 'Bearer invalid';
                return _server.inject( injectOptionsLogout )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 401 );
                code.expect( response.result.message ).to.be.equal( 'Bad token' );
                delete serverOptionsLogout.events;
                delete injectOptionsLogout.headers.Authorization
                done();

            } )
        } );


    lab.test( 'Testing logout unauthorized Missing authentication',
        ( done ) => {
            serverPromise( serverOptionsLogout ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                injectOptionsLogout.headers.cookie = 'entry=wrong';
                return _server.inject( injectOptionsLogout )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 401 );
                code.expect( response.result.message ).to.be.equal( 'Missing authentication' );
                delete serverOptionsLogout.events;
                done();

            } )
        } );


    lab.test( 'Testing login with headers["x-forwarded-proto"]="https" and logout trow error',
        ( done ) => {

            serverOptionsLogout.events = [throwErrorEvent( 'onPostLogout' )];

            injectOptionsLogin.headers={"x-forwarded-proto":'https'}

            serverPromise( serverOptionsLogout ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                let token = response.headers['set-cookie'].split( ';' )[0].split( '=' )[1];
                injectOptionsLogout.headers.authorization = 'Bearer ' + token;
                return _server.inject( injectOptionsLogout )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 500 );
                code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                delete serverOptionsLogout.events;
                done();
            } )
        } );


    lab.test( 'Testing forgot password',
        ( done ) => {

            serverPromise( serverOptionsForgotPassword ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsForgotPassword )

            } ).then( response => {

                debug('Testing forgot password', response.result)

                code.expect( response.statusCode ).to.equal( 200 );
                code.expect( response.result ).to.equal( 'Forgot token created' );
                done();

            } )
        } );


    lab.test( 'Testing forgot password throw error with expire ',
        ( done ) => {

            serverOptionsForgotPassword.events = [throwErrorEvent( 'onPostForgotPassword' )];
            serverOptionsForgotPassword.expire = { forgotPassword: '0 * * * * ' };

            serverPromise( serverOptionsForgotPassword ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsForgotPassword )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 500 );
                code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                delete serverOptionsForgotPassword.events;
                delete serverOptionsForgotPassword.expire;
                done();
            } )
        } );


    lab.test( 'Testing change password',
        ( done ) => {
            serverPromise( serverOptionsChangePassword ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                let token = response.headers['set-cookie'].split( ';' )[0].split( '=' )[1];
                injectOptionsChangePassword.headers.authorization = 'Bearer ' + token;
                return _server.inject( injectOptionsChangePassword );

            } ).then( response => {

                debug('Testing change password', response.result )

                code.expect( response.statusCode ).to.equal( 200 );
                code.expect( response.result ).to.equal( 'Password updated' );
                done()

            } )
        } );


    lab.test( 'Testing change password trow error',
        ( done ) => {
            serverOptionsChangePassword.events = [throwErrorEvent( 'onPostChangePassword' )];

            serverPromise( serverOptionsChangePassword ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                let token = response.headers['set-cookie'].split( ';' )[0].split( '=' )[1];
                injectOptionsChangePassword.headers.authorization = 'Bearer ' + token;
                return _server.inject( injectOptionsChangePassword )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 500 );
                code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                delete serverOptionsChangePassword.events;
                done()
            } )
        } );


    lab.test( 'Testing update scope throw error',
        ( done ) => {
            serverOptionsUpdateScope.events = [throwErrorEvent( 'onPostUpdateScope' )];

            serverPromise( serverOptionsUpdateScope ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.inject( injectOptionsLogin )

            } ).then( response => {

                let token = response.headers['set-cookie'].split( ';' )[0].split( '=' )[1];
                injectOptionsUpdateScope.headers.authorization = 'Bearer ' + token;
                return _server.inject( injectOptionsUpdateScope )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 500 );
                code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                delete serverOptionsUpdateScope.events;
                done()
            } )
        } );


    lab.test( 'Testing verify account',
        ( done ) => {

            let ee = new EventEmitter();

            serverOptionsVerifyAccount.events = [emittTokenEvent()];

            serverPromise( serverOptionsVerifyAccount ).then( server => {

                _server = server;
                _server.app.ee = ee;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                ee.on( 'token', ( token )=> {

                    injectOptionsVerifyAccount.payload.token = token;
                    _server.inject( injectOptionsVerifyAccount ).then( response => {

                        code.expect( response.statusCode ).to.equal( 200 );
                        code.expect( response.result ).to.equal( 'Account verified' );
                        delete serverOptionsVerifyAccount.events;
                        done()
                    } )
                } )
            } )
        } );


    lab.test( 'Testing verify account invalid token',
        ( done ) => {
            serverPromise( serverOptionsVerifyAccount ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                injectOptionsVerifyAccount.payload.token = 'not valid';

                return _server.inject( injectOptionsVerifyAccount )
            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 400 );
                code.expect( response.result.message ).to.equal( 'Invalid token' );
                done()
            } )
        } );


    lab.test( 'Testing verify account errort',
        ( done ) => {

            let ee = new EventEmitter();

            serverOptionsVerifyAccount.events = [
                emittTokenEvent(),
                throwErrorEvent( 'onPostVerifyAccount' )
            ];

            serverPromise( serverOptionsVerifyAccount ).then( server => {

                _server = server;
                _server.app.ee = ee;
                return _server.inject( injectOptionsCreate )
            } ).then( response => {

                ee.on( 'token', ( token )=> {

                    injectOptionsVerifyAccount.payload.token = token;

                    _server.inject( injectOptionsVerifyAccount, response => {

                        code.expect( response.statusCode ).to.equal( 500 );
                        code.expect( response.result.error ).to.equal( 'Internal Server Error' );
                        delete serverOptionsVerifyAccount.events;
                        done()
                    } );
                } )
            } )
        } );


    lab.test( 'Testing reset password',
        ( done ) => {

            let ee = new EventEmitter();
            serverOptionsResetPassword.events = [emittTokenEvent()];

            serverPromise( serverOptionsResetPassword ).then( server => {

                _server = server;
                _server.app.ee = ee;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                ee.on( 'token', ( token )=> {

                    injectOptionsResetPassword.payload.token = token;

                    _server.inject( injectOptionsResetPassword, response => {

                        code.expect( response.statusCode ).to.equal( 200 );
                        code.expect( response.result ).to.equal( 'Password updated' );
                        delete serverOptionsResetPassword.events;
                        done()


                    } );
                } )

            } )
        } );


    lab.test( 'Testing cron job for destroying expired tokens',
        ( done ) => {

            let options = {
                keyId: 'email',
                accountVerified: false,
                expire: { create: 2 },
                cronTime: {
                    ExpiredTokenCollector: '*/3 * * * * *',
                    ExtendExpirationDate: '*/1 * * * * *'
                }
            };

            serverPromise( options ).then( server => {

                _server = server;
                return _server.inject( injectOptionsCreate )

            } ).then( response => {

                return _server.getModel( 'token' ).find()

            } ).then( token=> {

                code.expect( token.length == 1 ).to.be.true();
                code.expect( token.expireAt == token.createdAt ).to.be.true();

                debug( token );

                setTimeout( ()=> {
                    _server.getModel( 'token' ).find().then( token=> {

                        code.expect( token.expireAt = !token.createdAt ).to.be.true();

                        setTimeout( ()=> {
                                _server.getModel( 'token' ).find().then( token=> {

                                    code.expect( token.length ).to.be.equal( 0 );
                                    done();
                                } )
                            }, 3000
                        )
                    } )
                }, 2000 );
            } )
        } );
} );