"Created by Mikael Lindahl on 1/1/18"

"use strict";

/**@module email*/

const Cron = require('cron');
const debug = require('debug')('hapi-account:lib:cron');

/**
 *  Function called at cron job collecting expired tokens
 *
 * @return promise
 * @api public
 */
function expiredTokenCollector() {

    debug('expiredTokenCollector');

    // Need to have then to work
    this.destroy({expire_at: {'<': new Date(), '!=': null}}).then(t => {

        // debug( 'expiredTokenCollector' , t)

    })

}

/**
 * Start cron job that regularly check if tokens have expired and
 * remove them if sp
 *
 * `server` - Hapijs server object
 * `options` - {object} hapi account options object
 *
 */
module.exports = (server, options) => {

    let _cronTime = options.cronTime.expiredTokenCollector;
    var CronJob = Cron.CronJob;
    let cronJob = new CronJob(_cronTime,
        expiredTokenCollector.bind(server.getModelHapiAccount('token')),
        null, true, 'Europe/Stockholm');
    server.expose('cronTimeExipredTokenCollector', cronJob);

};