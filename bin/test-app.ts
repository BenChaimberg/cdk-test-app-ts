#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { TestAppStack } from '../lib/test-app-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();
new TestAppStack(app, 'TestAppStack');
new PipelineStack(app, 'PipelineStack');
