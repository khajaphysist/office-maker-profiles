var db = require('../common/db.js');
var lambdaUtil = require('../common/lambda-util.js');

exports.handler = (event, context, callback) => {
  console.log('event:', JSON.stringify(event, null, 2));
  var profile = JSON.parse(event.body);
  db.patchProfile(profile).then(_ => {
    lambdaUtil.send(callback, 200);
  }).catch(e => {
    console.log('error:', e);
    lambdaUtil.send(callback, 500, {
      message: e.message
    });
  });
};
