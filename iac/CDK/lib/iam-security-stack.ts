import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

export interface IamSecurityStackProps extends cdk.StackProps {
  /**
   * S3 bucket name for application files (Developers group scope).
   * Passed as a real TypeScript prop, not a CloudFormation Parameter —
   * this is one place CDK's "real code" nature is genuinely nicer than
   * plain CloudFormation: no separate Parameters block, just a typed
   * constructor argument like any other class.
   */
  appBucketName: string;

  /**
   * Whether to also manage the account-wide password policy via a
   * custom resource. Off by default — see the comment on
   * passwordPolicyCustomResource below for why this needs care.
   */
  managePasswordPolicy?: boolean;
}

export class IamSecurityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IamSecurityStackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------------
    // Groups
    // -----------------------------------------------------------------
    // Prefixed cdk- so these coexist with the console-built originals,
    // the tf- prefixed Terraform resources, and the cf- prefixed
    // CloudFormation resources, all in the same account.

    const developers = new iam.Group(this, 'DevelopersGroup', {
      groupName: 'cdk-Developers',
    });

    const operations = new iam.Group(this, 'OperationsGroup', {
      groupName: 'cdk-Operations',
    });

    const finance = new iam.Group(this, 'FinanceGroup', {
      groupName: 'cdk-Finance',
    });

    const analysts = new iam.Group(this, 'AnalystsGroup', {
      groupName: 'cdk-Analysts',
    });

    const administrators = new iam.Group(this, 'AdministratorsGroup', {
      groupName: 'cdk-Administrators',
    });

    // -----------------------------------------------------------------
    // Operations: full EC2, RDS, SSM, CloudWatch — AWS managed policies
    // -----------------------------------------------------------------
    // CDK's fromAwsManagedPolicyName() is a real function call, not a
    // string ARN typed by hand — a typo here fails at synth/compile
    // time in some IDEs with autocomplete, rather than silently
    // producing a broken ARN string the way a plain YAML/HCL value can.

    operations.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'));
    operations.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSFullAccess'));
    operations.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));
    operations.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'));

    // -----------------------------------------------------------------
    // Developers: EC2 (managed) + scoped S3 (custom) + CloudWatch Logs (custom)
    // -----------------------------------------------------------------

    developers.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'));

    const s3AppFilesAccess = new iam.ManagedPolicy(this, 'S3AppFilesAccessPolicy', {
      managedPolicyName: 'cdk-S3AppFilesAccess',
      description: 'Read-write access to the application-files S3 bucket only.',
      groups: [developers],
      statements: [
        new iam.PolicyStatement({
          sid: 'CdkS3AppFilesAccess', // alphanumeric only — same Sid rule that broke the Terraform build
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
          resources: [
            `arn:aws:s3:::${props.appBucketName}`,
            `arn:aws:s3:::${props.appBucketName}/*`,
          ],
        }),
      ],
    });

    const cloudWatchLogsReadOnly = new iam.ManagedPolicy(this, 'CloudWatchLogsReadOnlyPolicy', {
      managedPolicyName: 'cdk-CloudWatchLogsReadOnly',
      description: 'Read-only CloudWatch Logs access.',
      groups: [developers],
      statements: [
        new iam.PolicyStatement({
          sid: 'CdkCloudWatchLogsReadOnly',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:GetLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:FilterLogEvents',
          ],
          resources: ['*'],
        }),
      ],
    });

    // -----------------------------------------------------------------
    // Finance: Billing, Budgets, ViewOnly (managed) + Cost Explorer (custom)
    // -----------------------------------------------------------------

    finance.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(
      this, 'FinanceBillingJobFunction', 'arn:aws:iam::aws:policy/job-function/Billing'
    ));
    finance.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSBillingReadOnlyAccess'));
    finance.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSBudgetsReadOnlyAccess'));
    finance.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(
      this, 'FinanceViewOnly', 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess'
    ));

    const costExplorerAccess = new iam.ManagedPolicy(this, 'CostExplorerAccessPolicy', {
      managedPolicyName: 'cdk-CostExplorerAccess',
      description: 'Cost Explorer read access — separate permission surface from Billing/Budgets.',
      groups: [finance],
      statements: [
        new iam.PolicyStatement({
          sid: 'CdkCostExplorerAccess',
          effect: iam.Effect.ALLOW,
          actions: ['ce:GetCostAndUsage', 'ce:GetCostForecast', 'ce:GetDimensionValues', 'ce:GetTags'],
          resources: ['*'],
        }),
      ],
    });

    // -----------------------------------------------------------------
    // Analysts: read-only RDS + read-only S3, both AWS managed
    // -----------------------------------------------------------------

    analysts.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSReadOnlyAccess'));
    analysts.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'));

    // -----------------------------------------------------------------
    // Administrators: AWS-managed AdministratorAccess
    // -----------------------------------------------------------------

    administrators.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    // -----------------------------------------------------------------
    // Require-MFA: attached to all five groups
    // -----------------------------------------------------------------

    const requireMfa = new iam.ManagedPolicy(this, 'RequireMFAPolicy', {
      managedPolicyName: 'cdk-Require-MFA',
      description: 'Denies nearly all actions unless the user has authenticated with MFA.',
      groups: [developers, operations, finance, analysts, administrators],
      statements: [
        new iam.PolicyStatement({
          sid: 'AllowViewAccountInfo',
          effect: iam.Effect.ALLOW,
          actions: ['iam:GetAccountPasswordPolicy', 'iam:ListVirtualMFADevices'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'AllowManageOwnMFA',
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:CreateVirtualMFADevice',
            'iam:EnableMFADevice',
            'iam:ResyncMFADevice',
            'iam:DeactivateMFADevice',
            'iam:DeleteVirtualMFADevice',
          ],
          resources: ['arn:aws:iam::*:mfa/${aws:username}'],
        }),
        new iam.PolicyStatement({
          sid: 'DenyAllExceptMFAWhenUnauthenticated',
          effect: iam.Effect.DENY,
          notActions: [
            'iam:CreateVirtualMFADevice',
            'iam:EnableMFADevice',
            'iam:GetUser',
            'iam:ListMFADevices',
            'iam:ListVirtualMFADevices',
            'iam:ResyncMFADevice',
            'sts:GetSessionToken',
          ],
          resources: ['*'],
          conditions: {
            BoolIfExists: { 'aws:MultiFactorAuthPresent': 'false' },
          },
        }),
      ],
    });

    // -----------------------------------------------------------------
    // Users
    // -----------------------------------------------------------------
    // This is the one place CDK's "real code" nature genuinely pays
    // off versus CloudFormation: a plain .forEach() loop generates N
    // resources from an array, no hardcoded per-user blocks needed —
    // unlike the plain CloudFormation template, which needed 11
    // separate, manually written AWS::IAM::User blocks.

    const usersByGroup: Record<string, { group: iam.Group; names: string[] }> = {
      developers: { group: developers, names: ['cdk-dev1', 'cdk-dev2', 'cdk-dev3', 'cdk-dev4'] },
      operations: { group: operations, names: ['cdk-ops1', 'cdk-ops2'] },
      finance: { group: finance, names: ['cdk-finance-manager'] },
      analysts: { group: analysts, names: ['cdk-analyst1', 'cdk-analyst2', 'cdk-analyst3'] },
      administrators: { group: administrators, names: ['cdk-admin'] },
    };

    Object.entries(usersByGroup).forEach(([key, { group, names }]) => {
      names.forEach((userName) => {
        new iam.User(this, `User-${userName}`, {
          userName,
          groups: [group],
        });
      });
    });

    // -----------------------------------------------------------------
    // Account password policy — optional, off by default
    // -----------------------------------------------------------------
    // Neither CloudFormation nor CDK's standard iam.* constructs have
    // a resource type for the account-wide password policy, because
    // CDK compiles down to CloudFormation and CloudFormation has no
    // AWS::IAM::AccountPasswordPolicy type (see the CloudFormation
    // README for the same limitation, undocumented there).
    //
    // CDK *can* still do this, though — one genuine advantage over
    // plain CloudFormation — via AwsCustomResource, which wraps a raw
    // AWS SDK call (iam:UpdateAccountPasswordPolicy) inside a small,
    // CDK-managed Lambda function, without writing that Lambda
    // yourself. This is real, but it's also a singleton account-wide
    // setting — same caution as Terraform's aws_iam_account_password_policy:
    // applying this will overwrite whatever password policy already
    // exists, not create a parallel one. Left off by default; enable
    // deliberately, not by accident.

    if (props.managePasswordPolicy) {
      new AwsCustomResource(this, 'PasswordPolicyCustomResource', {
        onCreate: {
          service: 'IAM',
          action: 'updateAccountPasswordPolicy',
          parameters: {
            MinimumPasswordLength: 14,
            RequireUppercaseCharacters: true,
            RequireLowercaseCharacters: true,
            RequireNumbers: true,
            RequireSymbols: true,
            MaxPasswordAge: 90,
            PasswordReusePrevention: 5,
            AllowUsersToChangePassword: true,
          },
          physicalResourceId: PhysicalResourceId.of('cdk-account-password-policy'),
        },
        onUpdate: {
          service: 'IAM',
          action: 'updateAccountPasswordPolicy',
          parameters: {
            MinimumPasswordLength: 14,
            RequireUppercaseCharacters: true,
            RequireLowercaseCharacters: true,
            RequireNumbers: true,
            RequireSymbols: true,
            MaxPasswordAge: 90,
            PasswordReusePrevention: 5,
            AllowUsersToChangePassword: true,
          },
          physicalResourceId: PhysicalResourceId.of('cdk-account-password-policy'),
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
      });
    }

    // -----------------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------------

    new cdk.CfnOutput(this, 'DevelopersGroupArn', { value: developers.groupArn });
    new cdk.CfnOutput(this, 'OperationsGroupArn', { value: operations.groupArn });
    new cdk.CfnOutput(this, 'FinanceGroupArn', { value: finance.groupArn });
    new cdk.CfnOutput(this, 'AnalystsGroupArn', { value: analysts.groupArn });
    new cdk.CfnOutput(this, 'AdministratorsGroupArn', { value: administrators.groupArn });
    new cdk.CfnOutput(this, 'RequireMFAPolicyArn', { value: requireMfa.managedPolicyArn });
  }
}
