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

let injectOptionsLoginGoogle = {
    method: "POST",
    url: "/loginGoogle",
    payload: {
        token: config.google.access_token
    },
};

let serverOptionsLoginGoogle = {
    accountVerified: true,
    google: {
        client_id: config.google.client_id
    }
};


let _server;

// The order of tests matters!!!
lab.experiment("Google", () => {

    lab.afterEach(() => {

        return test_server.adapter.teardown(null, () => {

            _server.stop()

        })
    });

    lab.test('Testing login google',
        async () => {

            _server = getServer(serverOptionsLoginGoogle);

            await _server.then(server => {

                _server = server;

                return _server.inject(injectOptionsLoginGoogle)

            }).then(response => {

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.headers['set-cookie']).to.be.a.string();

            })
        });

    lab.test('Testing login google bad request',
        async () => {

            serverOptionsLoginGoogle.google.client_id = 'bad-id';

            _server = getServer(serverOptionsLoginGoogle);

            await _server.then(server => {

                _server = server;

                injectOptionsLoginGoogle.payload.token = 'bad-token';

                return _server.inject(injectOptionsLoginGoogle)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Bad access');
                injectOptionsLoginGoogle.payload.token = config.google.access_token;

            })
        });

    lab.test('Testing login google bad request',
        async () => {

            _server = getServer(serverOptionsLoginGoogle);
            delete config.body.google.aud;
            await _server.then(server => {

                _server = server;

                return _server.inject(injectOptionsLoginGoogle)

            }).then(response => {

                code.expect(response.statusCode).to.equal(401);
                code.expect(response.result.message).to.equal('Unauthorized');

            })
        });
});