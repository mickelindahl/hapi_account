/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

// const account = require("../index.js");
const code = require("code");
const debug = require('debug')('hapi-account:test:index');
const Lab = require("lab");
const path = require('path');
const Waterline = require('waterline');
// const Hapi = require('hapi')
const EventEmitter = require('events');

const account = require('../../models/account');
const token = require('../../models/token');

const test_server = require('./test_server.js');
const getServer = test_server.getServer;

//const dotenv = require('dotenv')
require('dotenv').config({path: path.join(path.resolve(), 'testenv')});

let lab = exports.lab = Lab.script();

// const Memory = require('sails-disk')

function throwErrorEvent(type) {
    return {
        type: type,
        method: async (request) => {
            throw new Error(type)
        }
    }
}

function emittTokenEvent() {
    return {
        type: 'onPostCreate',
        method: async (request) => {

            setTimeout(() => {

                    debug(debug(request.server.plugins['hapi-account'].result));
                    let uuid = request.server.plugins['hapi-account'].result.token.uuid;
                    request.server.app.ee.emit('token', uuid)
                }
                , 1000)

            return
        }
    }
}

async function getModels(options){

    const orm = new Waterline();

    orm.registerModel(Waterline.Collection.extend(account));
    orm.registerModel(Waterline.Collection.extend(token));

    let config = {
        adapters: options.adapters,
        datastores: options.datastores
    };

    let _models;
    return new Promise((resolve, reject) => {

        orm.initialize(config, function (err, models) {
            _models=models;

            resolve(models);
        });
    })

    // return models


}

let injectOptionsCreate = {
    method: "POST",
    url: "/create",
    payload: {
        user: 'me@help.se',
        password: 'secret',
    },
    // credentials: {} // To bypass auth strategy
};

let injectOptionsLogin = {
    method: "POST",
    url: "/login",
    payload: {
        user: 'me@help.se',
        password: 'secret'
    },

    // credentials: {} // To bypass auth strategy
};

let injectOptionsLogout = {
    method: "POST",
    url: "/logout",
    payload: {
        token: null,
    },
    headers: {Authorization: null}
    // credentials: {} // To bypass auth strategy
};

let injectOptionsUpdateScope = {
    method: "POST",
    url: "/updateScope",
    payload: {
        add: ['admin', 'admin', 'user'],
        remove: ['user', 'user']
    },
    headers: {Authorization: null}
    // credentials: {} // To bypass auth strategy
};

let injectOptionsForgotPassword = {
    method: "POST",
    url: "/forgotPassword",
    payload: {
        user: 'me@help.se',
    },
};

let injectOptionsChangePassword = {
    method: "POST",
    url: "/changePassword",
    headers: {Authorization: 'a token'},
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
        sendMail: (options, done) => {
            done(null)
        }

    },
    events: [{
        type: 'onPostCreate',
        text: 'Hej!',
        html: '<p>Hej!</p>',
        subject: 'Important',
        from: 'me@you.se',
        to: 'you@mail.se'
    }]
};

let emailsErrorAndFun = {

    transporter: {
        sendMail: (options, done) => {
            done('an error')
        }

    },
    events: [{
        type: 'onPostCreate',
        text: (request) => {
            return 'Hej!'
        },
        html: (request) => {
            return '<p>Hej!</p>'
        },
        subject: 'Important',
        from: 'me@mail.se',
        to: 'you@mail.se'
    }]
};

let serverOptionsCreate = {accountVerified: true};
let serverOptionsLogin = {accountVerified: true};
let serverOptionsLogout = {accountVerified: true};
let serverOptionsForgotPassword = {accountVerified: true};
let serverOptionsChangePassword = {accountVerified: true};
let serverOptionsUpdateScope = {accountVerified: true};
let serverOptionsVerifyAccount = {accountVerified: false};
let serverOptionsResetPassword = {accountVerified: false};

let _server;

// The order of tests matters!!!
lab.experiment("Account", () => {

    lab.afterEach(() => {

        return test_server.adapter.teardown(null, () => {

            if (_server.stop) {

                _server.stop()

            }
        })

    });

    lab.test('Wrong waterline configuration',
        async () => {

            let waterline = {
                config: {
                    adapters: {
                        memory: test_server.adapter
                    },
                    datastores: {
                        default: {
                            adapter: 'wrong',
                            inMemoryOnly: true
                        }
                    }
                }
            }

            serverOptionsCreate.waterline = waterline;

            _server = getServer(serverOptionsCreate);

            await _server.then(server => {
            }).catch(err => {

                delete serverOptionsCreate.events;
                delete serverOptionsCreate.waterline;
                code.expect(err.message).to.include("wrong for datastore default.")

            });

        });

    lab.test('waterline with models configuration',
        async () => {

            let options=test_server.options_hw.config

            await getModels(options).then(models=>{

                let waterline = {
                    models: models.collections
                }

                serverOptionsCreate.waterline = waterline;

                _server = getServer(serverOptionsCreate);

                return _server.then(server => {
                }).then(response=>{

                    console.log(response)

                    delete serverOptionsCreate.waterline;

                }).catch(err => {

                    console.error(err)

                    delete serverOptionsCreate.events;
                    delete serverOptionsCreate.waterline;
                    // code.expect(err.message).to.include("wrong for datastore default.")

                });
            });
        });

    lab.test('Testing create with accountVerified true, updateScope, pre event, methods, emails, and basePath, and logout',
        async () => {

            serverOptionsCreate.events = [
                {
                    type: 'onPreCreate',
                    method: (request, h) => {
                        debug('attached onPre');
                        return h.continue
                    }
                }
            ];

            // serverOptionsCreate.method={expiredTokenCollector:()=>{}};
            serverOptionsCreate.email = emails;
            serverOptionsCreate.basePath = '/assume/';

            injectOptionsCreate.url = '/assume/create';
            injectOptionsLogin.url = '/assume/login';
            injectOptionsLogout.url = '/assume/logout';
            injectOptionsUpdateScope.url = '/assume/updateScope';

            _server = getServer(serverOptionsCreate);

            // start_server( options ).then( result => {
            await _server.then(server => {
                _server = server;

                debug(injectOptionsCreate)

                return _server.inject(injectOptionsCreate)

            }).then(response => {

                code.expect(response.statusCode).to.equal(201);
                code.expect(response.result).to.be.an.string();

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                injectOptionsUpdateScope.headers.cookie = response.headers['set-cookie'].split(';')[0];
                injectOptionsLogout.headers.cookie = response.headers['set-cookie'].split(';')[0];

                return _server.inject(injectOptionsUpdateScope)

            }).then(response => {

                code.expect(response.result).to.equal('Scope updated');
                return _server.inject(injectOptionsLogout)

            }).then(response => {

                debug(response.result)

                injectOptionsCreate.url = '/create';
                injectOptionsLogin.url = '/login';
                injectOptionsLogout.url = '/logout';
                injectOptionsUpdateScope.url = '/updateScope';
                delete serverOptionsCreate.events;
                delete serverOptionsCreate.emails;
                delete serverOptionsCreate.basePath;
                delete serverOptionsCreate.method;

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.result).to.be.equal('Logged out');

            })
        });


    lab.test('Testing create with email function and error, login with accountVerified false and request validate fail',
        async () => {

            serverOptionsCreate.email = emailsErrorAndFun;
            serverOptionsCreate.accountVerified = false;

            _server = getServer(serverOptionsCreate);

            await _server.then(server => {

                _server = server;
                return server.inject(injectOptionsCreate)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);

                injectOptionsLogin.payload.user = 'me@help.se';

                return _server.inject(injectOptionsLogin)
            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Account not verified');

                injectOptionsLogin.payload.email = 'wrong';

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('"email" is not allowed');

                delete serverOptionsCreate.email;
                delete injectOptionsLogin.payload.email;
                serverOptionsCreate.accountVerified = true;

            });
        });


    lab.test('Testing create account onPostCreate throw error and unused event',
        async () => {

            serverOptionsCreate.events = [throwErrorEvent('onPostCreate'),
                {
                    type: 'onPostForgotPassword',
                    method: () => {
                    }
                }
            ];

            _server = getServer(serverOptionsCreate);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);
                code.expect(response.result.error).to.equal('Internal Server Error');
                delete serverOptionsCreate.events;

            });
        });


    lab.test('Testing create account exist',
        async () => {

            _server = getServer(serverOptionsCreate);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsCreate)

            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.be.equal('Account exists');

            })
        });


    lab.test('Testing login throw error and expire in options',
        async () => {

            serverOptionsLogin.events = [throwErrorEvent('onPostLogin')];
            serverOptionsLogin.expire = {login: 5 * 3600 * 24 * 1000};

            _server = getServer(serverOptionsLogin);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(response => {

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);
                code.expect(response.result.error).to.equal('Internal Server Error');
                delete serverOptionsLogin.events;
                delete serverOptionsLogin.expire;

            });
        });


    lab.test('Testing login wrong user',
        async () => {

            _server = getServer(serverOptionsLogin);

            await _server.then(serverOptionsLogin).then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                injectOptionsLogin.payload.user = 'not@right';
                return _server.inject(injectOptionsLogin)

            }).then(response => {

                code.expect(response.result.message).to.equal('Account not found');
                code.expect(response.statusCode).to.equal(400);

            })
        });


    lab.test('Testing login',
        async () => {

            _server = getServer(serverOptionsLogin);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                injectOptionsLogin.payload.user = 'me@help.se';
                return _server.inject(injectOptionsLogin)

            }).then(() => {

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.headers['set-cookie']).to.be.a.string();

            })
        });

    lab.test('Testing login wrong password',
        async () => {

            _server = getServer(serverOptionsLogin);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                injectOptionsLogin.payload.password = 'wrong';
                return _server.inject(injectOptionsLogin)

            }).then(response => {

                code.expect(response.statusCode).to.equal(403);
                code.expect(response.result.message).to.equal('Wrong password');
                injectOptionsLogin.payload.password = 'secret';

            })
        });


    lab.test('Testing logout unauthorized bad token',
        async () => {

            _server = getServer(serverOptionsLogout);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsLogin)

            }).then(() => {

                injectOptionsLogout.headers.Authorization = 'Bearer invalid';
                return _server.inject(injectOptionsLogout)

            }).then(response => {

                code.expect(response.statusCode).to.equal(401);
                code.expect(response.result.message).to.be.equal('Bad token');
                delete serverOptionsLogout.events;
                delete injectOptionsLogout.headers.Authorization;

            })
        });


    lab.test('Testing logout unauthorized Missing authentication',
        async () => {

            _server = getServer(serverOptionsLogout);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsLogin)

            }).then(() => {

                injectOptionsLogout.headers.cookie = 'entry=wrong';
                return _server.inject(injectOptionsLogout)

            }).then(response => {

                code.expect(response.statusCode).to.equal(401);
                code.expect(response.result.message).to.be.equal('Missing authentication');
                delete serverOptionsLogout.events;

            })
        });


    lab.test('Testing login with headers["x-forwarded-proto"]="https" and logout trow error',
        async () => {

            serverOptionsLogout.events = [throwErrorEvent('onPostLogout')];

            injectOptionsLogin.headers = {"x-forwarded-proto": 'https'};

            _server = getServer(serverOptionsLogout);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(response => {

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                let token = response.headers['set-cookie'].split(';')[0].split('=')[1];
                injectOptionsLogout.headers.authorization = 'Bearer ' + token;
                return _server.inject(injectOptionsLogout)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);
                code.expect(response.result.error).to.equal('Internal Server Error');
                delete serverOptionsLogout.events;

            })
        });


    lab.test('Testing forgot password',
        async () => {

            _server = getServer(serverOptionsForgotPassword);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsForgotPassword)

            }).then(response => {

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.result).to.equal('Forgot token created');

            })
        });


    lab.test('Testing forgot password throw error with expire ',
        async () => {

            serverOptionsForgotPassword.events = [throwErrorEvent('onPostForgotPassword')];
            serverOptionsForgotPassword.expire = {forgotPassword: 5 * 3600 * 24 * 1000};

            _server = getServer(serverOptionsForgotPassword);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsForgotPassword)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);
                code.expect(response.result.error).to.equal('Internal Server Error');
                delete serverOptionsForgotPassword.events;
                delete serverOptionsForgotPassword.expire;

            })
        });


    lab.test('Testing change password',
        async () => {

            _server = getServer(serverOptionsChangePassword);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                let token = response.headers['set-cookie'].split(';')[0].split('=')[1];
                injectOptionsChangePassword.headers.authorization = 'Bearer ' + token;
                return _server.inject(injectOptionsChangePassword);

            }).then(response => {

                code.expect(response.statusCode).to.equal(200);
                code.expect(response.result).to.equal('Password updated');

            })
        });


    lab.test('Testing change password trow error',
        async () => {
            serverOptionsChangePassword.events = [throwErrorEvent('onPostChangePassword')];

            _server = getServer(serverOptionsChangePassword);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                let token = response.headers['set-cookie'].split(';')[0].split('=')[1];
                injectOptionsChangePassword.headers.authorization = 'Bearer ' + token;
                return _server.inject(injectOptionsChangePassword)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);
                code.expect(response.result.error).to.equal('Internal Server Error');
                delete serverOptionsChangePassword.events;

            })
        });


    lab.test('Testing update scope throw error',
        async () => {
            serverOptionsUpdateScope.events = [throwErrorEvent('onPostUpdateScope')];

            _server = getServer(serverOptionsUpdateScope);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                return _server.inject(injectOptionsLogin)

            }).then(response => {

                debug('response.headers', response.headers)
                let token = response.headers['set-cookie'].split(';')[0].split('=')[1];
                injectOptionsUpdateScope.headers.authorization = 'Bearer ' + token;
                return _server.inject(injectOptionsUpdateScope)

            }).then(response => {

                code.expect(response.statusCode).to.equal(500);
                code.expect(response.result.error).to.equal('Internal Server Error');
                delete serverOptionsUpdateScope.events;

            })
        });


    lab.test('Testing verify account',
        async () => {

            let ee = new EventEmitter();

            serverOptionsVerifyAccount.events = [emittTokenEvent()];

            _server = getServer(serverOptionsVerifyAccount);

            await new Promise(resolve => {
                _server.then(server => {

                    _server = server;
                    _server.app.ee = ee;
                    return _server.inject(injectOptionsCreate)

                }).then(() => {

                    ee.on('token', token => {

                        injectOptionsVerifyAccount.payload.token = token;
                        _server.inject(injectOptionsVerifyAccount).then(response => {

                            code.expect(response.statusCode).to.equal(200);
                            code.expect(response.result).to.equal('Account verified');
                            delete serverOptionsVerifyAccount.events;
                            resolve()

                        })
                    })
                })
            })
        });

    lab.test('Testing verify account invalid token',
        async () => {

            _server = getServer(serverOptionsVerifyAccount);

            await _server.then(server => {

                _server = server;
                return _server.inject(injectOptionsCreate)

            }).then(() => {

                injectOptionsVerifyAccount.payload.token = 'not valid';

                return _server.inject(injectOptionsVerifyAccount)
            }).then(response => {

                code.expect(response.statusCode).to.equal(400);
                code.expect(response.result.message).to.equal('Invalid token');

            })
        });


    lab.test('Testing verify account error',
        async () => {

            let ee = new EventEmitter();

            serverOptionsVerifyAccount.events = [
                emittTokenEvent(),
                throwErrorEvent('onPostVerifyAccount')
            ];

            _server = getServer(serverOptionsVerifyAccount);

            await new Promise(resolve => {
                _server.then(server => {

                    _server = server;
                    _server.app.ee = ee;
                    return _server.inject(injectOptionsCreate)
                }).then(() => {

                    ee.on('token', (token) => {

                        injectOptionsVerifyAccount.payload.token = token;

                        _server.inject(injectOptionsVerifyAccount).then(response => {

                            code.expect(response.statusCode).to.equal(500);
                            code.expect(response.result.error).to.equal('Internal Server Error');
                            delete serverOptionsVerifyAccount.events;
                            resolve()

                        });
                    })
                })
            })
        });


    lab.test('Testing reset password',
        async () => {

            let ee = new EventEmitter();
            serverOptionsResetPassword.events = [emittTokenEvent()];

            _server = getServer(serverOptionsResetPassword);

            await new Promise(resolve => {
                _server.then(server => {

                    _server = server;
                    _server.app.ee = ee;
                    return _server.inject(injectOptionsCreate)

                }).then(() => {

                    ee.on('token', (token) => {

                        injectOptionsResetPassword.payload.token = token;

                        _server.inject(injectOptionsResetPassword).then(response => {

                            code.expect(response.statusCode).to.equal(200);
                            code.expect(response.result).to.equal('Password updated');
                            delete serverOptionsResetPassword.events;
                            resolve()
                        });
                    })

                })
            })
        });

    lab.test('Testing cron job for destroying expired tokens',
        async () => {

            let options = {
                accountVerified: false,
                expire: {create: 0, login:2},
                cronTime: {
                    expiredTokenCollector: '*/3 * * * * *',
                    extendExpirationDate: '*/2 * * * * *'
                }
            };

            _server = getServer(options);

            await new Promise(resolve => {
                _server.then(server => {

                    _server = server;
                    return _server.inject(injectOptionsCreate)

                }).then(() => {

                    return _server.getModelHapiAccount('token').find()

                }).then(token => {

                    code.expect(token.length).to.equal(1);
                    code.expect(token.expire_at).to.equal( token.created_at);

                    debug(token);

                    setTimeout(() => {
                        _server.getModelHapiAccount('token').find().then(token => {

                            code.expect(token.expire_at = !token.created_at).to.be.true();

                            setTimeout(() => {
                                    _server.getModelHapiAccount('token').find().then(token => {

                                        code.expect(token.length).to.be.equal(0);
                                        resolve()
                                    })
                                }, 3000
                            )
                        })
                    }, 2000);
                })
            })
        });
});