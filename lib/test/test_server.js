/**
 * Created by Mikael Lindahl (mikael) on 10/3/16.
 */

'use strict';

const account = require("../index.js");
const Hapi = require('hapi');
const adapter = require('sails-disk');

let options_hw = {
    config: {
        adapters: {
            memory: adapter
        },
        datastores: {
            default: {
                adapter: 'memory',
                inMemoryOnly: true
            }
        }
    }
};

function getServer(options) {
    const server = new Hapi.Server();

    server.app.adapter = options_hw.config.adapters.memory;

    options.waterline = !options.waterline ? options_hw : options.waterline;

    return server.register({
        plugin: account,
        options
    }).then(() => {

        return server

    })
}

module.exports = {
    getServer,
    adapter,
    options_hw
};
