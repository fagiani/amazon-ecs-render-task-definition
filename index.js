const path = require('path');
const aws = require('aws-sdk');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

async function run() {
  try {
    // Get inputs
    const taskDefinitionFile  = core.getInput('task-definition', { required: true });
    const containerName       = core.getInput('container-name', { required: true });
    const imageURI            = core.getInput('image', { required: true });
    const familyName          = core.getInput('family-name', { required: false });
    const awsSmName           = core.getInput('aws-sm-name', { required: false });
    const awsSmArns           = core.getInput('aws-sm-arns', {required: false });
    const awsAccountId        = core.getInput('aws-account-id', { require: false });

    // Parse the task definition
    const taskDefPath = path.isAbsolute(taskDefinitionFile) ?
      taskDefinitionFile :
      path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFile);
    
    if (!fs.existsSync(taskDefPath)) {
      throw new Error(`Task definition file does not exist: ${taskDefinitionFile}`);
    }
    
    const taskDefContents = require(taskDefPath);

    // Insert the image URI
    if (!Array.isArray(taskDefContents.containerDefinitions)) {
      throw new Error('Invalid task definition format: containerDefinitions section is not present or is not an array');
    }
    
    const containerDef = taskDefContents.containerDefinitions.find(function(element) {
      return element.name == containerName;
    });
    
    if (!containerDef) {
      throw new Error('Invalid task definition: Could not find container definition with matching name');
    }

    containerDef.image = imageURI;
    if (familyName) {
      taskDefContents.family = familyName;
    }

    if (awsSmName) {
      aws.config.setPromisesDependency(Promise);
      const sm = new aws.SecretsManager();
      const smResponse = await sm.getSecretValue({
        SecretId: awsSmName
      }).promise();
      const { SecretString } = smResponse;

      if(useSecrets) {
        containerDef.secrets = Object.entries(JSON.parse(SecretString)).map(([name, value]) => ({
          name,
          valueFrom: `arn:aws:secretsmanager:${process.env.AWS_REGION}:${awsAccountId}:secret:${awsSMName}-${name}`
        }));
      } else {
        containerDef.environment = Object.entries(JSON.parse(SecretString)).map(([name, value]) => ({
          name,
          value
        }));
      };

      if (awsSmArns) {
        taskDefContents.taskRoleArn       = JSON.parse(SecretString).TASK_ROLE_ARN;
        taskDefContents.executionRoleArn  = JSON.parse(SecretString).EXECUTION_ROLE_ARN;
      }

      containerDef.logConfiguration.options['awslogs-group'] = `ecs/${process.env.GITHUB_REPOSITORY_SLUG}-${process.env.GITHUB_REF_SLUG}`;
      containerDef.logConfiguration.options['awslogs-region'] = process.env.AWS_REGION;
      containerDef.logConfiguration.options['awslogs-stream-prefix'] = 'ecs';
    }

    // Write out a new task definition file
    var updatedTaskDefFile = tmp.fileSync({
      dir: process.env.RUNNER_TEMP,
      prefix: 'task-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    const newTaskDefContents = JSON.stringify(taskDefContents, null, 2);
    fs.writeFileSync(updatedTaskDefFile.name, newTaskDefContents);
    core.setOutput('task-definition', updatedTaskDefFile.name);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
