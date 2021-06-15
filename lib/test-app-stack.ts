import { Construct, Stack, StackProps } from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfntasks from '@aws-cdk/aws-stepfunctions-tasks';

export class TestAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc");

    const cluster = new ecs.Cluster(this, "Cluster", {
      enableFargateCapacityProviders: true,
      vpc,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDefinition");
    taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: ['arn:aws:s3:::*'],
    }));
    taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromRegistry("httpd:2.4"),
    });

    console.log(taskDefinition.defaultContainer);
    const ecsRunTask = new sfntasks.EcsRunTask(this, "EcsRunTask", {
      cluster,
      containerOverrides: [
        {
          containerDefinition: taskDefinition.defaultContainer!,
          environment: [
            { name: "TASK_TOKEN", value: sfn.JsonPath.taskToken },
          ],
        },
      ],
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      launchTarget: new sfntasks.EcsFargateLaunchTarget(),
      taskDefinition,
    });

    new sfn.StateMachine(this, "StateMachine", {
      definition: ecsRunTask,
    });
  }
}
