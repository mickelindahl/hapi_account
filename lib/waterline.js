/**
 * Created by Mikael Lindahl on 2018-01-01.
 */

'use strict'

/**@module waterline */

const account = require('../models/account');
const token = require('../models/token');
const Waterline = require('waterline');

let _server;

function getModel(model) {
    return _server.plugins['hapi-account'].models[model];
}


/**
 * - `server` Hapi server object
 * - `options` Waterline orm initalize options
 *   -`adapter` Sails waterline adapter
 *   - `datastores` Sails waterline datastores
 *
 */
module.exports = (server, options) => {

    _server = server;

    server.decorate('server', 'getModelHapiAccount', getModel)

    const orm = new Waterline();

    orm.registerModel(Waterline.Collection.extend(account));
    orm.registerModel(Waterline.Collection.extend(token));

    let config = {
        adapters: options.adapters,
        datastores: options.datastores
    };

    return new Promise((resolve, reject) => {

        orm.initialize(config, function (err, models) {
            if (err) {
                console.error(err)
                reject(err);
            }
            server.expose({
                orm: orm,
                models: models.collections,
                databases: models.datastores
            });

            resolve();
        });
    })

};