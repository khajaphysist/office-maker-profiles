const fs = require('fs');
const childProcess = require('child_process');
const Path = require('path');
const AWS = require('aws-sdk');
const yaml = require('js-yaml');

const configFile = './config.json';
const project = JSON.parse(fs.readFileSync(configFile, 'utf8'));

const cloudformation = new AWS.CloudFormation({
  region: project.region
});
const s3 = new AWS.S3({
  region: project.region
});

const funcDir = Path.resolve('./functions');
const tmpDir = Path.resolve('./tmp');
const templateFile = Path.resolve(funcDir, 'template.yml');
const outputTemplateFile = Path.resolve(tmpDir, 'template.yml');
const swaggerTemplateFile = 'swagger.yml'
const swaggerFile = Path.resolve(tmpDir, 'swagger.yml');

rmdir(funcDir + '/node_modules').then(_ => {
  return generateSwaggerYml(project.accountId, project.region, project.accessControlAllowOrigin).then(_ => {
    return npmInstall(funcDir, true).then(_ => {
      return cloudFormationPackage(funcDir, templateFile, outputTemplateFile, project.s3Bucket).then(_ => {
        return cloudFormationDeploy(funcDir, outputTemplateFile, project.stackName);
      });
    });
  }).then(_ => {
    return npmInstall(funcDir, false);
  });
}).then(result => {
  result && console.log(result);
}).catch(e => {
  console.log(e);
  process.exit(1);
});

function generateSwaggerYml(accountId, region, accessControlAllowOrigin) {
  if (fs.existsSync(swaggerTemplateFile)) {
    const replacedText = fs.readFileSync(swaggerTemplateFile, 'utf8')
      .replace(/__ACCOUNT_ID__/g, accountId)
      .replace(/__REGION__/g, region)
      .replace(/__ACCESS_CONTROL_ALLOW_ORIGIN__/g, accessControlAllowOrigin);
    fs.writeFileSync(swaggerFile, replacedText);
  }
  return Promise.resolve();
}

function npmInstall(cwd, prod) {
  return new Promise((resolve, reject) => {
    childProcess.exec('npm install' + (prod ? ' --production' : ''), {
      cwd: cwd
    }, function(e) {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
}

function cloudFormationPackage(funcDir, templateFile, outputTemplateFile, s3Bucket) {
  return spawnCommand(funcDir, 'aws', [
    'cloudformation',
    'package',
    '--template-file',
    templateFile,
    '--output-template-file',
    outputTemplateFile,
    '--s3-bucket',
    s3Bucket
  ]);
}

function cloudFormationDeploy(funcDir, templateFile, stackName) {
  return spawnCommand(funcDir, 'aws', [
    'cloudformation',
    'deploy',
    '--template-file',
    templateFile,
    '--stack-name',
    stackName,
    '--capabilities',
    'CAPABILITY_IAM'
  ]);
}

function spawnCommand(cwd, command, args) {
  console.log('cwd:', cwd);
  console.log('exec:', command + ' ' + args.join(' '));
  return new Promise((resolve, reject) => {
    childProcess.spawn(command, (args || []), {
      cwd: cwd,
      stdio: 'inherit'
    }).on('close', code => {
      if (code) {
        reject('exited with code ' + code);
      } else {
        resolve();
      }
    });
  });
}

function rmdir(path) {
  if (!fs.existsSync(path)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    childProcess.exec('rm -r ' + path, {
      cwd: '.'
    }, function(e) {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
}

function toPromise(object, method) {
  return function(params) {
    return new Promise((resolve, reject) => {
      object[method](params, function(e, data) {
        if (e) {
          reject(e);
        } else {
          resolve(data);
        }
      });
    });
  };
}
