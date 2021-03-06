var db = require('../common/db.js');
var lambdaUtil = require('../common/lambda-util.js');

exports.handler = (event, context, callback) => {
  console.log('event:', JSON.stringify(event, null, 2));
  var userId =　event.pathParameters.userId;
  console.log('userId: ',userId);
  db.getProfile(userId).then(profile => {
    if (profile) {
      lambdaUtil.send(callback, 200, profile);
    } else {
      lambdaUtil.send(callback, 404);
    }
  }).catch(e => {
    console.log('error:', e);
    lambdaUtil.send(callback, 500, {
      message: e.message
    });
  });
};
