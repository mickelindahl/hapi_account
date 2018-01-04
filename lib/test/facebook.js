/**
 * Created by Mikael Lindahl (mikael) on 6/20/17.
 */

'use strict';


let mock = require('mock-require');
let mock_request = require('./request-mock');

mock('request', mock_request.request);

let config = mock_request.config;

const code = require("code");
const Lab = require("lab");
const test_server = require('./test_server.js');
const getServer = test_server.getServer

let lab = exports.lab = Lab.script();

let injectOptionsLoginFacebook = {
    method: "POST",
    url: "/loginFacebook",
    payload: {
        user: 'me@mail.com',
        token: config.facebook.input_token

    },
    // credentials: {} // To bypass auth strategy
};

let serverOptionsLoginFacebook = {
    accountVerified: true,
    facebook: {
        app_id: config.facebook.app_id,
        app_secret: config.facebook.app_secret,
    }
};


let _server;

// The order of tests matters!!!
lab.experiment("Facebook", () => {

    lab.afterEach(() => {

        return test_server.adapter.teardown(null, () => {

            _server.stop()

        })
    });

    lab.test('Testing login facebook',
        async () => {

            _server = getServer(serverOptionsLoginFacebook);

            await _server.then(server => {

                _server = server;

                return _server.inject(injectOptionsLoginFacebook)

            }).then(response => {

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.headers['set-cookie']).to.be.a.string();

            })
        });

    lab.test('Testing login facebook bad app credentials',
        async () => {

            serverOptionsLoginFacebook.facebook.app_id = 'bad-id';

            _server = getServer(serverOptionsLoginFacebook);

            await _server.then(server => {

                _server = server;

                return _server.inject(injectOptionsLoginFacebook)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Bad access');
                serverOptionsLoginFacebook.facebook.app_id = config.facebook.app_id;

            })
        });

    lab.test('Testing login facebook input token',
        async () => {

            _server = getServer(serverOptionsLoginFacebook);

            await _server.then(server => {

                _server = server;

                injectOptionsLoginFacebook.payload.token = 'bad-token';

                return _server.inject(injectOptionsLoginFacebook)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Bad debug');
                injectOptionsLoginFacebook.payload.token = config.facebook.input_token;
            })
        });

    lab.test('Testing login facebook response error',
        async () => {

            _server = getServer(serverOptionsLoginFacebook);
            config.body.facebook.error = {'message': 'Response error'};
            await _server.then(server => {

                _server = server;

                return _server.inject(injectOptionsLoginFacebook)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Response error');
                delete config.body.facebook.error
            })
        });

    lab.test('Testing login facebook invalid access token',
        async () => {

            _server = getServer(serverOptionsLoginFacebook);
            config.body.facebook.data.is_valid = false;
            await _server.then(server => {

                _server = server;

                return _server.inject(injectOptionsLoginFacebook)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Invalid facebook access token')
                config.body.facebook.data.is_valid = true;
            })
        });

    lab.test('Testing account exist',
        async () => {

            _server = getServer(serverOptionsLoginFacebook);

            await _server.then(server => {

                _server = server;

                return _server.getModelHapiAccount('account').create({
                    user: injectOptionsLoginFacebook.payload.user,
                    verified: true,
                    created_by: 'facebook'
                })

            }).then(() => {

                return _server.inject(injectOptionsLoginFacebook)

            }).then(response => {

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.headers['set-cookie']).to.be.a.string();

            })
        });

});