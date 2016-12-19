/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

const code = require( "code" );
const debug = require( 'debug' )( 'account:test\index' );
const Lab = require( "lab" );
const path = require( 'path' );
const start_server = require( '../test_server.js' );

let lab = exports.lab = Lab.script();

let options_create = {
    method: "POST",
    url: "/create",
    payload: {
        email: 'me@help.se',
        password: 'secret',
        scope: ['admin']
    },
    credentials: {} // To bypass auth strategy
};

let options_login = {
    method: "POST",
    url: "/login",
    payload: {
        email: 'me@help.se',
        password: 'secret'
    },
    credentials: {} // To bypass auth strategy
};

let options_logout = {
    method: "POST",
    url: "/logout",
    payload: {
        token: null,
    },
    headers: { Authorization: null }
    // credentials: {} // To bypass auth strategy
};

let options_forgotPassword = {
    method: "POST",
    url: "/forgotPassword",
    payload: {
        email: 'me@help.se',
    },
};

let options_changePassword = {
    method: "POST",
    url: "/changePassword",
    payload: {
        password: 'new secret',
    },
    headers: { Authorization: null }
};

let options_verifyAccount = {
    method: "POST",
    url: "/verifyAccount",
    payload: {
        token: null,
    },
};

let options_resetPassword = {
    method: "POST",
    url: "/resetPassword",
    payload: {
        password: "new secret",
        token: null,
    },
};


// The order of tests matters!!!
lab.experiment( "Account", ()=> {

    lab.test( 'Testing create with accountVerified true, pre event, emails, and basePath, and logout',
        ( done ) => {

            let events = [
                {
                    type: 'onPreCreate',
                    method: ( request, reply )=> {
                        debug( 'attached onPre' );
                        reply()
                    }
                }
            ];

            let options = {
                keyId: 'email', accountVerified: true,
                emails: {

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
                },
                events: events, basePath: '/assume/'
            };

            options_create.url = '/assume/create';
            options_login.url = '/assume/login';
            options_logout.url = '/assume/logout';

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal( 'Account created' );

                    result.server.inject( options_login, response => {

                        options_logout.headers.Authorization = 'Bearer ' + response.result.token;

                        result.server.inject( options_logout, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result ).to.be.equal( 'Logged out' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {

                                options_create.url = '/create';
                                options_login.url = '/login';
                                options_logout.url = '/logout';

                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing create with email function and error and login with accountVerified false',
        ( done ) => {

            let emails= {

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

            start_server( { emails:emails, keyId: 'email', accountVerified: false } ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal( 'Account created' );

                    options_login.payload.email = 'me@help.se';

                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 400 );
                        code.expect( response.result.message ).to.equal( 'Account not verified' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing create account onPostCreate throw error and unused event',
        ( done ) => {

            let events = [
                {
                    type: 'onPostCreate', method: ( request, next )=> {
                    throw 'onPostCreate error'
                }
                },
                {
                    type: 'onPostForgotPassword', method: ()=> {
                }
                }
            ];

            start_server( { accountVerified: false, events: events } ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 500 );
                    code.expect( response.result.error ).to.equal( 'Internal Server Error' );

                    new Promise( resolve=> {
                        result.adapter.teardown( resolve ); // fails otherwise
                    } ).then( ()=> {
                        result.server.stop( { timeout: 200 }, done );
                    } );
                } );
            } )
        } );

    lab.test( 'Testing create account exist',
        ( done ) => {

            start_server( { keyId: 'email', accountVerified: true } ).then( result => {

                result.server.inject( options_create, response => {

                    result.server.inject( options_create, response => {

                        code.expect( response.statusCode ).to.equal( 400 );
                        code.expect( response.result.message ).to.be.equal( 'Account exists' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing login throw error and with expire in options',
        ( done ) => {

            let events = [{
                type: 'onPostLogin',
                method: ( request, next )=> {
                    throw 'onPostLogin error'
                }
            }
            ];

            let options = {
                keyId: 'email', accountVerified: true,
                events: events, expire: { login: '1 * * * *' }
            }

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {
                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 500 );
                        code.expect( response.result.error ).to.equal( 'Internal Server Error' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing login wrong user',
        ( done ) => {

            start_server( { keyId: 'email', accountVerified: true } ).then( result => {

                result.server.inject( options_create, response => {

                    options_login.payload.email = 'not@right';

                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 404 );
                        code.expect( response.result.message ).to.equal( 'Account not found' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing login',
        ( done ) => {

            start_server( { keyId: 'email', accountVerified: true } ).then( result => {

                result.server.inject( options_create, response => {

                    options_login.payload.email = 'me@help.se';

                    result.server.inject( options_login, response => {
                        result.server.inject( options_login, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result.token ).to.be.a.string();

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing login wrong password',
        ( done ) => {

            start_server( { keyId: 'email', accountVerified: true } ).then( result => {

                result.server.inject( options_create, response => {

                    options_login.payload.password = 'wrong';

                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 403 );
                        code.expect( response.result.message ).to.equal( 'Wrong password' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {

                            // Change back to correct password
                            options_login.payload.password = 'secret';

                            result.server.stop( { timeout: 200 }, done );

                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing logout unauthorized',
        ( done ) => {

            let events = [
                {
                    type: 'onPostLogout',
                    method: ( request, next )=> {
                        throw 'onPostLogout error'
                    }
                }];

            let options = { keyId: 'email', accountVerified: true, events: events }

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal( 'Account created' );

                    result.server.inject( options_login, response => {

                        options_logout.headers.Authorization = 'Bearer invalid';

                        result.server.inject( options_logout, response => {

                            code.expect( response.statusCode ).to.equal( 401 );
                            code.expect( response.result.message ).to.be.equal( 'Bad token' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing logout trow error',
        ( done ) => {

            let events = [
                {
                    type: 'onPostLogout',
                    method: ( request, next )=> {
                        throw 'onPostLogout error'
                    }
                }];

            let options = { keyId: 'email', accountVerified: true, events: events }

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal( 'Account created' );

                    result.server.inject( options_login, response => {

                        options_logout.headers.Authorization = 'Bearer ' + response.result.token;

                        result.server.inject( options_logout, response => {

                            code.expect( response.statusCode ).to.equal( 500 );
                            code.expect( response.result.error ).to.equal( 'Internal Server Error' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing forgot password',
        ( done ) => {

            start_server( { keyId: 'email', accountVerified: true } ).then( result => {

                result.server.inject( options_create, response => {

                    result.server.inject( options_forgotPassword, response => {

                        code.expect( response.statusCode ).to.equal( 200 );
                        code.expect( response.result ).to.equal( 'Forgot token created' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing forgot password throw error with expire ',
        ( done ) => {

            let events = [
                {
                    type: 'onPostForgotPassword',
                    method: ( request, next )=> {
                        throw 'onPostForgotPassword error'
                    }
                }];

            let options = {
                keyId: 'email', accountVerified: true,
                events: events, expire: { forgotPassword: '0 * * * * ' }
            }

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {

                    result.server.inject( options_forgotPassword, response => {

                        code.expect( response.statusCode ).to.equal( 500 );
                        code.expect( response.result.error ).to.equal( 'Internal Server Error' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing change password',
        ( done ) => {
            start_server( { keyId: 'email', accountVerified: true } ).then( result => {

                result.server.inject( options_create, response => {

                    result.server.inject( options_login, response => {

                        options_changePassword.headers.Authorization = 'Bearer ' + response.result.token;

                        result.server.inject( options_changePassword, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result ).to.equal( 'Password updated' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing change password trow error',
        ( done ) => {
            let events = [{
                type: 'onPostChangePassword',
                method: ( request, next )=> {
                    throw 'onPostChangePassword error'
                }
            }];

            start_server( { keyId: 'email', accountVerified: true, events: events } ).then( result => {
                result.server.inject( options_create, response => {
                    result.server.inject( options_login, response => {

                        options_changePassword.headers.Authorization = 'Bearer ' + response.result.token;

                        result.server.inject( options_changePassword, response => {

                            code.expect( response.statusCode ).to.equal( 500 );
                            code.expect( response.result.error ).to.equal( 'Internal Server Error' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } );
                } )
            } )
        } );

    lab.test( 'Testing verify account',
        ( done ) => {

            const EventEmitter = require( 'events' );
            let ee = new EventEmitter()

            let events = [{
                type: 'onPostCreate',
                method: ( request, next )=> {

                    setTimeout( ()=> {

                            debug( debug( request.server.plugins['hapi-account'].result ) )

                            request.server.app.ee.emit( 'token',

                                request.server.plugins['hapi-account'].result.token.uuid )
                        }
                        , 1000 )

                    next()

                }
            },
            ];

            let options = { keyId: 'email', accountVerified: false, events: events }

            start_server( options ).then( result => {

                result.server.app.ee = ee;

                result.server.inject( options_create, response => {

                    ee.on( 'token', ( token )=> {

                        options_verifyAccount.payload.token = token;

                        result.server.inject( options_verifyAccount, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result ).to.equal( 'Account verified' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing verify account invalid token',
        ( done ) => {

            const EventEmitter = require( 'events' );

            let options = { keyId: 'email', accountVerified: false }

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {

                    options_verifyAccount.payload.token = 'not valid';

                    result.server.inject( options_verifyAccount, response => {

                        code.expect( response.statusCode ).to.equal( 400 );
                        code.expect( response.result.message ).to.equal( 'Invalid token' );

                        new Promise( resolve=> {
                            result.adapter.teardown( resolve ); // fails otherwise
                        } ).then( ()=> {
                            result.server.stop( { timeout: 200 }, done );
                        } );
                    } );

                } )
            } )
        } );

    lab.test( 'Testing verify account errort',
        ( done ) => {

            const EventEmitter = require( 'events' );
            let ee = new EventEmitter()

            let events = [{
                type: 'onPostCreate',
                method: ( request, next )=> {

                    setTimeout( ()=> {
                            request.server.app.ee.emit( 'token',
                                request.server.plugins['hapi-account'].result.token.uuid )
                        }
                        , 1000 )

                    next()

                }
            }, {
                type: 'onPostVerifyAccount',
                method: ( request, next )=> {
                    throw 'onPostVerifyAccount error'
                }
            }];

            let options = { keyId: 'email', accountVerified: false, events: events }

            start_server( options ).then( result => {

                result.server.app.ee = ee;

                result.server.inject( options_create, response => {

                    ee.on( 'token', ( token )=> {

                        options_verifyAccount.payload.token = token;

                        result.server.inject( options_verifyAccount, response => {

                            code.expect( response.statusCode ).to.equal( 500 );
                            code.expect( response.result.error ).to.equal( 'Internal Server Error' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing reset password',
        ( done ) => {

            const EventEmitter = require( 'events' );
            let ee = new EventEmitter()

            let events = [{
                type: 'onPostCreate',
                method: ( request, next )=> {

                    setTimeout( ()=> {
                            request.server.app.ee.emit( 'token',
                                request.server.plugins['hapi-account'].result.token.uuid )
                        }
                        , 1000 )

                    next()

                }
            },
            ];

            let options = { keyId: 'email', accountVerified: false, events: events }

            start_server( options ).then( result => {

                result.server.app.ee = ee;

                result.server.inject( options_create, response => {

                    ee.on( 'token', ( token )=> {

                        options_resetPassword.payload.token = token;

                        result.server.inject( options_resetPassword, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result ).to.equal( 'Password updated' );

                            new Promise( resolve=> {
                                result.adapter.teardown( resolve ); // fails otherwise
                            } ).then( ()=> {
                                result.server.stop( { timeout: 200 }, done );
                            } );
                        } );
                    } )
                } )
            } )
        } );

    lab.test( 'Testing cron job for destroying expired tokens',
        ( done ) => {

            let options = {
                keyId: 'email',
                accountVerified: false,
                expire: { create: 2 },
                cronTime:{
                    ExpiredTokenCollector: '*/3 * * * * *',
                    ExtendExpirationDate: '*/1 * * * * *'
                }
            };

            start_server( options ).then( result => {

                result.server.inject( options_create, response => {

                    result.server.getModel( 'token' ).find().then( token=> {

                        code.expect( token.length == 1 ).to.be.true();
                        code.expect( token.expireAt==token.createdAt ).to.be.true();

                        debug(token)

                        setTimeout( ()=> {
                            result.server.getModel( 'token' ).find().then( token=> {

                                code.expect( token.expireAt=!token.createdAt ).to.be.true();
                                setTimeout( ()=> {
                                        result.server.getModel( 'token' ).find().then( token=> {

                                            code.expect( token.length ).to.be.equal( 0 );

                                            new Promise( resolve=> {
                                                result.adapter.teardown( resolve ); // fails otherwise
                                            } ).then( ()=> {
                                                result.server.stop( { timeout: 200 }, done );
                                            } );
                                        } )
                                    }, 3000
                                )
                            })
                        }, 2000);

                    } )
                } )
            } )
        } );
} );
