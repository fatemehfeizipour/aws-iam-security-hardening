# CloudFormation — IAM Security Project

Recreates the same five-group IAM structure as the console build and the Terraform version, this time as a native CloudFormation template. Resources are prefixed `cf-` to avoid colliding with the original console-built resources and the `tf-` prefixed Terraform resources — all three can safely coexist in the same account.

## Deploy

**Console:**
1. CloudFormation → Create stack → Upload `iam-stack.yaml`
2. Stack name: e.g. `cf-iam-security-stack`
3. Parameter `AppBucketName`: enter a real bucket name, or leave the default placeholder for a test run
4. Review, acknowledge IAM resource creation capability (CloudFormation requires explicit acknowledgment for stacks that create IAM resources), Create stack

**CLI:**
```powershell
aws cloudformation create-stack `
  --stack-name cf-iam-security-stack `
  --template-body file://iam-stack.yaml `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameters ParameterKey=AppBucketName,ParameterValue=test-app-files-placeholder
```

Check status:
```powershell
aws cloudformation describe-stacks --stack-name cf-iam-security-stack
```

## Known gotchas (learned the hard way, fixed proactively here)

- **`Sid` values must be alphanumeric only, no hyphens.** This surfaced as a `MalformedPolicyDocument` error during the Terraform build (`tf-S3AppFilesAccess` as a Sid failed; `TfS3AppFilesAccess` worked). Fixed here from the start — every `Sid` in this template uses `Cf` instead of `cf-`.
- **No native password policy resource.** CloudFormation has no `AWS::IAM::AccountPasswordPolicy` type. This template deliberately excludes it — see the comment block in `iam-stack.yaml` for the reasoning. The account password policy remains managed via the console/Terraform, not duplicated here.
- **No native looping.** Unlike Terraform's `for_each`, CloudFormation has no built-in way to generate N near-identical resources from a list. Each of the 11 users is a separate, hardcoded resource block. For a real team this would be a genuine argument for Terraform or CDK over plain CloudFormation, if user counts change often.

## Clean up

```powershell
aws cloudformation delete-stack --stack-name cf-iam-security-stack
```
Deleting the stack removes every resource it created — groups, custom policies, and users — cleanly, in one step.
