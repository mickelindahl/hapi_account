/**
 *Created by Mikael Lindahl on 2019-05-06
 */

"use strict";

const convert = require('joi-to-json-schema')
const fs= require('fs')
const schema = require('./lib/schema');


let converted = convert(schema);

console.log(converted)

let s=JSON.stringify(converted)
fs.writeFileSync('options.json', s)