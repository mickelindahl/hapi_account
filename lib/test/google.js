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

let injectOptionsLoginGoogle = {
    method: "POST",
    url: "/loginGoogle",
    payload: {
        //email: 'hapi_wlblgfj_test@tfbnw.net',
        //email: 'hapi_wlblgfj_test@tfbnw.net',
        token: process.env.GOOGLE_TMP_ACCESS_TOKEN, // to generate go to facebook dev for app and generate a token for a test user


    },
    // credentials: {} // To bypass auth strategy
};

let serverOptionsLoginGoogle = {
    keyId: 'email',
    accountVerified: true,
    google:{
        client_id: process.env.GOOGLE_CLIENT_ID
    }
};


let _server;

// The order of tests matters!!!
lab.experiment( "Google", ()=> {

    lab.afterEach( done => {

        _server.app.adapter.teardown( () => {
            _server.stop( done )
        } )

    } );
    lab.test( 'Testing login facebook',
        ( done ) => {


            debug('injectOptionsLoginGoogle',injectOptionsLoginGoogle)

            serverPromise( serverOptionsLoginGoogle ).then( server => {

                _server = server;

                return _server.inject( injectOptionsLoginGoogle )

            } ).then( response => {

            //    return _server.inject( injectOptionsLoginGoogle )
            //
            //} ).then( response => {

                debug(response.result)

                code.expect( response.statusCode ).to.equal( 200 );
                code.expect( response.headers['set-cookie'] ).to.be.a.string();
                done();
            } )
        } );


})