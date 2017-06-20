/**
 * Created by Mikael Lindahl (mikael) on 6/20/17.
 */

'use strict';


const code = require( "code" );
const debug = require( 'debug' )( 'account:test:index' );
const Lab = require( "lab" );
const serverPromise = require( './test_server.js' );
const path = require( 'path' );

require('dotenv').config({ path: path.join(path.resolve(),  '.env')})

let lab = exports.lab = Lab.script();

let injectOptionsLoginFacebook = {
    method: "POST",
    url: "/loginFacebook",
    payload: {
        email: 'hapi_wlblgfj_test@tfbnw.net',
        //email: 'hapi_wlblgfj_test@tfbnw.net',
        token:process.env.FACEBOOK_TMP_USER_TOKEN, // to generate go to facebook dev for app and generate a token for a test user


    },
    // credentials: {} // To bypass auth strategy
};

let serverOptionsLoginFacebook = {
    keyId: 'email',
    accountVerified: true,
    facebook:{
        app_id: process.env.FACEBOOK_APP_ID,
        app_secret: process.env.FACEBOOK_APP_SECRET,
    }
};


let _server;

// The order of tests matters!!!
lab.experiment( "Facebook", ()=> {

    lab.afterEach( done => {

        _server.app.adapter.teardown( () => {
            _server.stop( done )
        } )

    } );
    lab.test( 'Testing login facebook',
        ( done ) => {

            serverPromise( serverOptionsLoginFacebook ).then( server => {

                _server = server;

                return _server.inject( injectOptionsLoginFacebook )

            //} ).then( response => {
            //
            //    return _server.inject( injectOptionsLoginFacebook )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 200 );
                code.expect( response.headers['set-cookie'] ).to.be.a.string();
                done();
            } )
        } );

    lab.test( 'Testing login facebook wrong access token',
        ( done ) => {


            serverPromise( serverOptionsLoginFacebook ).then( server => {


                injectOptionsLoginFacebook.payload.token='EAAD7wYZBUZA4wBAKXITkK6EXbg0fhdUxDPDr14hdUZB0t6Wo2sNS5WbZAZCIxRL32wFxbSod16TiEJenxOssLaTjaNOJz94vGunsak9foKZAsI3tXxuKOMc8xZAZCZCt61C8yg8Brt4QNGpshKyrZAmAnmN2jeParoIRZBvI3kMZACFFCiVi84rVZAHw2sTTmdMDdVjO8Nb0UTBepQpaq35K0D2LNo9vFcfozvv4ZD'
                _server = server;

                return _server.inject( injectOptionsLoginFacebook )

            } ).then( response => {

                return _server.inject( injectOptionsLoginFacebook )

            } ).then( response => {

                code.expect( response.statusCode ).to.equal( 400 );
                code.expect(response.result.message).to.equal('Not valid facebook access token')
                done();
            } )
        } );
})