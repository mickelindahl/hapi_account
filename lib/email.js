"Created by Mikael Lindahl on 1/1/18"

"use strict"

/**@module email*/

const debug = require('debug')('hapi-account:lig:email');

/**
 * Add email events to event list
 *
 * `emails` - {object} Email
 *   - `transporter` Nodemailer trainsporter
 *   - `events` {Array} List with email events
 *     `[].from` {string} from email address
 *     `[].text` {string} | {callback(request)} email content in plain text
 *     `[].html` {string} | {callback(request) email content in html
 *
 * return  {array} event array
 *
 */
module.exports = (email, events) => {

    if (!email) return events;

    email.events.forEach(e => {

        debug('_addPostEmailEvents from', e.from);

        events.push({
            type: e.type,
            method: async (request) => {

                let transporter = email.transporter;

                transporter.sendMail({
                    from: e.from,
                    to: e.to,
                    subject: e.subject,
                    text: typeof e.text == 'function'
                        ? e.text(request)
                        : e.text,
                    html: typeof e.html == 'function'
                        ? e.html(request)
                        : e.html
                }, function (err, info) {
                    if (err) {
                        console.error(err);
                        throw err
                    }

                    return

                });
            }
        })
    })


    return events

}