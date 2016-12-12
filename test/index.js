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

lab.experiment( "Account", ()=> {

    // lab.before( { timeout: 3000 }, function ( done ) {
    //     var iv = setInterval( function () {
    //         if ( _server.app.readyForTest == true ) {
    //             clearInterval( iv );
    //
    //             //mock
    //             _server.methods.tracking.accountCreated = ( options )=> {};
    //             _server.methods.email.sendVerificationEmail = ( options )=> {};
    //             _server.methods.email.sendPasswordResetEmail = ( options )=> {};
    //
    //             _server.initialize( ()=> {
    //
    //                 let Invite = _server.getModel( 'invite' );
    //                 Invite.create( { code: _code } ).exec( ( err, models )=> {
    //
    //                     done();
    //
    //                 } )
    //             } )
    //         }
    //     }, 50 );
    // } );

    // .stop()

    lab.test( 'Testing create account verify account false',
        ( done ) => {

            let options={
                verfiyAccount:false
            };

            start_server( options ).then( ( server )=> {

                let options = {
                    method: "POST",
                    url: "/",
                    payload: {
                        email: 'me@help.se',
                        password: 'secret',
                        scope:['admin']
                    },
                    credentials: {} // To bypass auth strategy
                };


                server.inject( options, response => {

                    code.expect( response.statusCode ).to.equal( 201 );
                    code.expect( response.result ).to.equal('Account created');
                    done();

                } );


                return server
            } ).then(server=>{

                server.stop();

            }).catch(err=>{
                debug(err)
            })

        } );

    // lab.test( 'Testing resend verification email',
    //     ( done ) => {
    //
    //         let Account = _server.getModel( 'account' );
    //         Account.find( { email: _email } ).exec( ( err, models )=> {
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
    //                 code.expect( response.statusCode ).to.equal( 200 );
    //                 code.expect( response.payload ).to.equal( 'Email sent' );
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
