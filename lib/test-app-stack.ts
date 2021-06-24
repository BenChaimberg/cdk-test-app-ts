import { Construct, Stack, StackProps } from '@aws-cdk/core';

export class TestAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
