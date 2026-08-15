#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IamSecurityStack } from '../lib/iam-security-stack';

const app = new cdk.App();

// appBucketName comes from an environment variable rather than a
// CloudFormation Parameter — this is the CDK-idiomatic way to pass
// a value in: real code reading real config, no separate Parameters
// block to keep in sync with the template.
const appBucketName = process.env.APP_BUCKET_NAME || 'cdk-test-app-files-placeholder';

// managePasswordPolicy defaults to false — see the long comment in
// lib/iam-security-stack.ts for why this needs to be deliberate, not
// automatic. Set the environment variable to "true" to opt in.
const managePasswordPolicy = process.env.MANAGE_PASSWORD_POLICY === 'true';

new IamSecurityStack(app, 'IamSecurityStack', {
  appBucketName,
  managePasswordPolicy,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'IAM security hardening project — CDK version, cdk- prefixed to coexist with the console, Terraform, and CloudFormation versions.',
});
