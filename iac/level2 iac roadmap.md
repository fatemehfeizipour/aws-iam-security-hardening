# Level 2: The Same IAM Setup, Built Three Ways

Level 1 built the IAM structure by hand in the AWS Console: 5 groups, 4 custom policies, 11 users, MFA enforcement. Level 2 rebuilds that exact same structure three more times - once each with Terraform, CloudFormation, and CDK -so all four versions exist side by side in the same AWS account, each with its own name prefix so they don't collide:

| Version | Prefix | Example |
|---|---|---|
| Console (Level 1) | none | `Developers` |
| Terraform | `tf-` | `tf-Developers` |
| CloudFormation | `cf-` | `cf-Developers` |
| CDK | `cdk-` | `cdk-Developers` |

**Why bother building the same thing four times?** Because the point isn't the IAM structure -that was already finished in Level 1. The point is learning what each tool actually does differently, by watching all three try to build the identical thing and seeing where they diverge.

---

## Terraform

**What it is:** you write `.tf` files describing what should exist. Terraform compares that against a **state file** - its own private memory of what it already built -and only changes what's different.

**What happened when I deployed it:** `terraform apply` failed partway through with:
```
MalformedPolicyDocument: Statement IDs (SID) must be alpha-numeric.
```
Every IAM policy statement has a `Sid` field, and AWS requires it to be letters and numbers only -no hyphens. My policy names (`tf-S3AppFilesAccess`) were fine with a hyphen, but I'd also put a hyphen in the internal `Sid` field, which AWS rejects. Fix: removed the hyphen from the `Sid` values only (`TfS3AppFilesAccess`), re-ran `apply`, and the remaining resources deployed successfully.

**One-sentence takeaway:** a policy's *name* and a policy's *Sid* follow different naming rules, even though they look like they should be the same kind of thing.

---

## CloudFormation

**What it is:** AWS's own native templating system. You write a YAML file describing resources; AWS itself tracks what it created via something called a "stack" -no separate state file to manage, since AWS already owns that job.

**What happened when I deployed it:** it worked on the first try, with zero errors -because I already knew about the `Sid` rule from the Terraform run and fixed it in the template before deploying.

**One-sentence takeaway:** a mistake caught once, in the first tool, saves you from repeating it in the next two.

**One real limitation I hit:** CloudFormation has no built-in way to manage the account-wide password policy at all -that resource type simply doesn't exist in CloudFormation. Terraform has it (`aws_iam_account_password_policy`); CloudFormation doesn't. I documented this as an honest gap rather than working around it.

---

## CDK

**What it is:** you write real code (I used TypeScript) instead of a config file. That code doesn't talk to AWS directly -running `cdk deploy` first converts your code into a CloudFormation template, then hands that template to CloudFormation to actually build it. CDK is a translator sitting on top of CloudFormation, not a fourth separate system.

**What happened when I deployed it:** also worked cleanly on the first try, same reason as CloudFormation -the `Sid` fix was already applied before I ran anything.


**Where CDK genuinely saved effort:** creating 11 users. In CloudFormation, that meant 11 separate, nearly-identical blocks of YAML, copy-pasted with just the username changed each time. In CDK, it was one loop over a list of names -about 6 lines total, regardless of whether there were 11 users or 100.

---

## The comparison, plainly

| | Terraform | CloudFormation | CDK |
|---|---|---|---|
| You write | A config file (HCL) | A config file (YAML) | Real code (TypeScript) |
| Works outside AWS too? | Yes | No | No |
| Can manage the password policy? | Yes, built in | No, not possible without extra work | Yes, but requires an extra workaround |
| Repeating similar resources (like 11 users) | One block per user, but with a loop feature (`for_each`) that avoids repetition | One block per user, copy-pasted by hand each time | One loop, a few lines, works for any number of users |
| What actually executes the change | Talks to AWS directly | Is the thing being talked to | Generates a CloudFormation template, then CloudFormation does the work |

## If I had to pick one, for what

- **Terraform** - if the company uses more than just AWS (Azure, GCP, etc.) and wants one consistent tool everywhere.
- **CloudFormation** - if the company is AWS-only and doesn't want to install or learn a separate tool, and doesn't mind writing repetitive YAML for things like a list of 11 users.
- **CDK** - if the team is comfortable writing real code and wants to avoid repetitive config for things that repeat a lot (many similar users, many similar resources).

## Status

All three deployed successfully to the live AWS account and are currently torn down between demo/recording sessions to keep the account clean - IAM resources like these cost nothing to run, so keeping or removing them is purely a tidiness choice, not a cost one. Rebuild commands:

```powershell
# Terraform
cd iac/terraform
terraform apply -auto-approve

# CloudFormation
cd iac/cloudformation
aws cloudformation create-stack --stack-name cf-iam-security-stack --template-body file://iam-stack.yaml --capabilities CAPABILITY_NAMED_IAM --parameters ParameterKey=AppBucketName,ParameterValue=cf-test-app-files-placeholder

# CDK
cd iac/CDK
npx cdk deploy --require-approval never
```
