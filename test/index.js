/**
 * Created by Mikael Lindahl (S057WL) on 2016-12-08.
 */

'use strict';

const code = require( "code" );
const debug = require( 'debug' )( 'account:test\index' );
const Lab = require( "lab" );
const path = require( 'path' );
const start_server = require( '../test_server.js' );

let lab = exports.lab = Lab.script();
// let _email = 'peace@dauwg.com';
// let _email_invite = 'peace@dauwg2.com';
// let _code = 'monkey';


// the order of tests matters

let options_create = {
    method: "POST",
    url: "/",
    payload: {
        email: 'me@help.se',
        password: 'secret',
        scope:['admin']
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
    headers:{Authorization:null}
    // credentials: {} // To bypass auth strategy
};

lab.experiment( "Account", ()=> {

    lab.test( 'Testing create with verifyAccount true and logout',
        ( done ) => {

            start_server( { keyId:'email', verifyAccount:true} ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal('Account created');

                    result.server.inject( options_login, response => {

                        options_logout.headers.Authorization='Bearer '+response.result.token;

                        result.server.inject( options_logout, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result ).to.be.equal('Logged out');
                            debug(result.adapter);

                            new Promise(resolve=>{
                                result.adapter.teardown(resolve); // fails otherwise
                            }).then(()=>{
                                result.server.stop({timeout:200}, done);
                            });
                        } );
                    })
                })
            } )
        } );

    lab.test( 'Testing create and login with verifyAccount false',
        ( done ) => {

            start_server( { keyId:'email', verifyAccount:false} ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal('Account created');

                    options_login.payload.email='me@help.se';

                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 400 );
                        code.expect( response.result.message ).to.equal( 'Account not verified');
                        debug(result.adapter);

                        new Promise(resolve=>{
                            result.adapter.teardown(resolve); // fails otherwise
                        }).then(()=>{
                            result.server.stop({timeout:200}, done);
                        });
                    } );
                })
            } )
        } );

    lab.test( 'Testing create account onPostCreate throw error and unused event',
        ( done ) => {

            let events=[
                {type:'onPostCreate', method:(request, next)=>{throw 'onPostCreate error'}},
                {type:'onPostForgotPassword', method:()=>{}}
            ];

            start_server( { verifyAccount:false, events:events} ).then( result => {

                result.server.inject( options_create, response => {

                    code.expect( response.statusCode ).to.equal( 500 );
                    code.expect( response.result.error  ).to.equal('Internal Server Error');

                    new Promise(resolve=>{
                        result.adapter.teardown(resolve); // fails otherwise
                    }).then(()=>{
                        result.server.stop({timeout:200}, done);
                    });
                } );
            } )
        } );

    lab.test( 'Testing login throw error',
        ( done ) => {

            let events=[
                {type:'onPostLogin', method:(request, next)=>{throw 'onPostLogin error'}}];

             start_server( { keyId:'email', verifyAccount:true, events:events} ).then( result => {

                result.server.inject( options_create, response => {
                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 500 );
                        code.expect( response.result.error  ).to.equal('Internal Server Error');

                        new Promise(resolve=>{
                            result.adapter.teardown(resolve); // fails otherwise
                        }).then(()=>{
                            result.server.stop({timeout:200}, done);
                        });
                    });
                })
            } )
        } );

    lab.test( 'Testing login wrong user',
        ( done ) => {

            start_server( { keyId:'email', verifyAccount:true} ).then( result => {

                result.server.inject( options_create, response => {

                    options_login.payload.email='not@right';

                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 404 );
                        code.expect( response.result.message ).to.equal( 'Account not found');
                        debug(result.adapter);

                        new Promise(resolve=>{
                            result.adapter.teardown(resolve); // fails otherwise
                        }).then(()=>{
                            result.server.stop({timeout:200}, done);
                        });
                    } );
                })
            } )
        } );

    lab.test( 'Testing login token already exist',
        ( done ) => {

            start_server( { keyId:'email', verifyAccount:true} ).then( result => {

                result.server.inject( options_create, response => {

                    options_login.payload.email='me@help.se';
                    // options_logout.headers.Authorization='Bearer '+response.result.token;

                    result.server.inject( options_login, response => {
                        result.server.inject( options_login, response => {

                            code.expect( response.statusCode ).to.equal( 200 );
                            code.expect( response.result.token ).to.be.a.string();
                            debug(result.adapter);

                            new Promise(resolve=>{
                                result.adapter.teardown(resolve); // fails otherwise
                            }).then(()=>{
                                result.server.stop({timeout:200}, done);
                            });
                        } );
                    })
                })
            } )
        } );

    lab.test( 'Testing login wrong password',
        ( done ) => {

            start_server( { keyId:'email', verifyAccount:true} ).then( result => {

                result.server.inject( options_create, response => {

                    options_login.payload.password='wrong';

                    result.server.inject( options_login, response => {

                        code.expect( response.statusCode ).to.equal( 403 );
                        code.expect( response.result.message ).to.equal( 'Wrong password');
                        debug(result.adapter);

                        new Promise(resolve=>{
                            result.adapter.teardown(resolve); // fails otherwise
                        }).then(()=>{
                            result.server.stop({timeout:200}, done);
                        });
                    } );
                })
            } )
        } );



    //
    // lab.test( 'Testing resend verification email already verified',
    //     ( done ) => {
    //
    //         let Account = _server.getModel( 'account' );
    //         Account.update( { email: _email }, { verified: true } ).exec( ( err, models )=> {
    //
    //             let options = {
    //                 method: "POST",
    //                 url: "/account/resendVerificationEmail",
    //                 payload: {
    //                     email: _email,
    //                     password: 'secret'
    //                 }
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 400 );
    //                 code.expect( JSON.parse( response.payload ).message ).to.equal( 'Already verified' );
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.test( 'Testing resend verification email already verified',
    //     ( done ) => {
    //
    //         let Account = _server.getModel( 'account' );
    //         Account.update( { email: _email }, { verified: true } ).exec( ( err, models )=> {
    //
    //             let options = {
    //                 method: "POST",
    //                 url: "/account/resendVerificationEmail",
    //                 payload: {
    //                     email: 'wrong@hej',
    //                     password: 'secret'
    //                 }
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 404 );
    //                 code.expect( JSON.parse( response.payload ).message ).to.equal( 'Account not found' );
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.test( 'Testing create account with invite',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/invite",
    //             payload: {
    //                 email: _email_invite,
    //                 password: 'secret',
    //                 code: _code
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 201 );
    //             code.expect( response.result.verified ).to.be.false();
    //             code.expect( response.result.email ).to.equal( options.payload.email );
    //             code.expect( response.result.password ).not.to.equal( options.payload.password ); // return hashed password
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing create account with invite invalid',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/invite",
    //             payload: {
    //                 email: _email_invite + 'm',
    //                 password: 'secret',
    //                 code: 'invalid'
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 400 );
    //             code.expect( JSON.parse( response.payload ).message ).to.equal( 'Invite not valid' );
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing verify email valid',
    //     ( done ) => {
    //
    //         let Token = _server.getModel( 'token' )
    //         Token.find( { email: _email } ).exec( ( err, models )=> {
    //             let options = {
    //                 method: "GET",
    //                 url: "/account/verifyEmail/" + models[0].uuid//+Jwt.sign( { email: _email }, 'secret'),
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 200 );
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.test( 'Testing verify email invalid',
    //     ( done ) => {
    //
    //         let Token = _server.getModel( 'token' )
    //         Token.find( { email: _email } ).exec( ( err, models )=> {
    //             let options = {
    //                 method: "GET",
    //                 url: "/account/verifyEmail/invalid"
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 404 ); //basImplementation
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.test( 'Testing login success',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/login",
    //             payload: {
    //                 email: _email,
    //                 password: 'secret',
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 200 );
    //             code.expect( response.result.token ).to.be.a.string();
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing login wrong password',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/login",
    //             payload: {
    //                 email: _email,
    //                 password: 'wrong secret',
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 403 );
    //             code.expect( JSON.parse( response.payload ).message ).to.equal( 'Wrong password' );
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing login wrong email',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/login",
    //             payload: {
    //                 email: _email + 'wrong',
    //                 password: 'secret',
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 404 );
    //             code.expect( JSON.parse( response.payload ).message ).to.equal( 'Account not found' );
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing login backend success',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/loginBackend",
    //             payload: {
    //                 email: _email,
    //                 password: 'secret',
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 201 );
    //             code.expect( response.result.id_token ).to.be.a.string();
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing login backend wrong password',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/loginBackend",
    //             payload: {
    //                 email: _email,
    //                 password: 'wrong secret',
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 403 );
    //             code.expect( JSON.parse( response.payload ).message ).to.equal( 'Wrong password' );
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing login backend wrong email',
    //     ( done ) => {
    //         let options = {
    //             method: "POST",
    //             url: "/account/loginBackend",
    //             payload: {
    //                 email: 'wrong@wrong',
    //                 password: 'secret',
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 404 );
    //             code.expect( JSON.parse( response.payload ).message ).to.equal( 'Account not found' );
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing reset password',
    //     ( done ) => {
    //
    //         let Account = _server.getModel( 'account' );
    //         Account.find( { email: _email } ).exec( ( err, models )=> {
    //
    //             let options = {
    //                 method: "GET",
    //                 url: "/account/resetPassword/123456",
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 200 );
    //                 code.expect( response.payload ).to.be.a.string();
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.test( 'Testing forgot password',
    //     ( done ) => {
    //
    //         let options = {
    //             method: "POST",
    //             url: "/account/forgotPassword",
    //             payload: {
    //                 email: _email
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 200 );
    //             code.expect( response.payload ).to.be.a.string();
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing forgot password wrong email',
    //     ( done ) => {
    //
    //         let options = {
    //             method: "POST",
    //             url: "/account/forgotPassword",
    //             payload: {
    //                 email: 'wrong@hej.com'
    //             }
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 404 );
    //             code.expect( JSON.parse( response.payload ).message ).to.equal( 'Account not found' );
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing account created',
    //     ( done ) => {
    //
    //         let options = {
    //             method: "GET",
    //             url: "/account/created",
    //         };
    //
    //         _server.inject( options, ( response )=> {
    //
    //             code.expect( response.statusCode ).to.equal( 200 );
    //             code.expect( response.payload ).to.be.a.string();
    //             done();
    //
    //         } );
    //     } );
    //
    // lab.test( 'Testing change password',
    //     ( done ) => {
    //
    //         let Token = _server.getModel( 'token' );
    //         Token.find( { email: _email } ).exec( ( err, models )=> {
    //             let options = {
    //                 method: "POST",
    //                 url: "/account/changePassword",
    //                 payload: {
    //                     password: 'new secret',
    //                     token: models[0].uuid
    //                 }
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 200 );
    //                 code.expect( response.payload ).to.equal( 'password updated' );
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.test( 'Testing change password wrong token',
    //     ( done ) => {
    //
    //         let Token = _server.getModel( 'token' )
    //         Token.find( { email: _email } ).exec( ( err, models )=> {
    //             let options = {
    //                 method: "POST",
    //                 url: "/account/changePassword",
    //                 payload: {
    //                     password: 'new secret',
    //                     token: 'wrong'
    //                 }
    //             };
    //
    //             _server.inject( options, ( response )=> {
    //
    //                 code.expect( response.statusCode ).to.equal( 400 );
    //                 code.expect( JSON.parse( response.payload ).message ).to.equal( 'Invalid token' );
    //                 done();
    //
    //             } );
    //         } )
    //     } );
    //
    // lab.after( {}, ( done )=> {
    //
    //     _server.stop()
    //
    //     //restore mock
    //     // _server.methods.tracking=_tmp.tracking;
    //     // _server.methods.email=_tmp.email;
    //
    //     done()
    // } )
} );
