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
    this.destroy({expire_at: {'<': new Date()}}).then(t => {

        // debug( 'expiredTokenCollector' , t)

    })

}

function extendExpirationDate() {

    debug('extendExpirationDate');

    let duration = this.options.expire.login;
    let expire_at = new Date(new Date().valueOf() + duration);
    let oneDayBack = new Date(new Date().valueOf() - 1 * 24 * 3600 * 1000);

    let criteria = {last_usage_at: {'>=': oneDayBack}};
    let update = {expire_at: expire_at};

    this.token.update(criteria, update).then(token => {

        // debug('extendExpirationDate token',token)

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

    _cronTime = options.cronTime.extendExpirationDate
    CronJob = Cron.CronJob;
    cronJob = new CronJob(_cronTime,
        extendExpirationDate.bind({
            token: server.getModelHapiAccount('token'),
            options: options
        }),
        null, true, 'Europe/Stockholm');

    return cronJob

}