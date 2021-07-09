#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { TestAppStack } from '../lib/test-app-stack';

const app = new cdk.App();
new TestAppStack(app, 'UsagePlanInvalidMethod');
