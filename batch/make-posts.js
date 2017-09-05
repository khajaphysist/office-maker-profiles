var AWS = require('aws-sdk');
AWS.config.update({
  region: "ap-northeast-1"
});
var db = require('../functions/common/db.js');
const documentClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const dynamoUtil = require('../functions/common/dynamo-util.js');

function scanPosts() {
  return dynamoUtil.scan(documentClient, {
    TableName: "profiles",
    ProjectionExpression: "post"
  }).then(data => {
    return data.Items;
  });
}

scanPosts().then(items => {
  const posts = items.map(item => item.post);
  const names = new Set(posts);
  return Array.from(names.values()).map(postName => {
    return () => db.putKeysIntoPostTable(postName);
  }).reduce((memo, f) => {
    return memo.then(_ => delay(700)).then(_ => f());
  }, Promise.resolve());
}).catch(e => {
  console.error(e.message);
  // console.error(e.stack);
  process.exit(1);
});


function delay(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}
