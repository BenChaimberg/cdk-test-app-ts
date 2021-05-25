import { Construct, Duration, Stack, StackProps } from '@aws-cdk/core';
import { Queue } from '@aws-cdk/aws-sqs';
import { SqsSubscription } from '@aws-cdk/aws-sns-subscriptions';
import { Topic } from '@aws-cdk/aws-sns';

export class TestAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new Queue(this, 'Queue', {
      visibilityTimeout: Duration.seconds(300)
    });

    const topic = new Topic(this, 'Topic');

    topic.addSubscription(new SqsSubscription(queue));
  }
}
