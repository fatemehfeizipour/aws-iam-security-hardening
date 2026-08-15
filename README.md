# AWS IAM Security Hardening - Fitness App Startup (Portfolio Project)

A hands-on cloud security consulting project simulating a real-world engagement: taking a startup from "everyone shares root credentials" to a documented, least-privilege IAM structure with a secured root user and a hardened network architecture.

> 🧪 This is a fictional client scenario (StartupCo, a 10-person fitness app startup) used to practice and demonstrate AWS security fundamentals in a realistic, constraint-driven context - not a copy-paste tutorial.

## What's in this repo

```
├── docs/
│   └── PROJECT-DOCUMENTATION.md   # Full write-up: problem, architecture, IAM design, reasoning
├── diagrams/
│   ├── architecture-infrastructure.png
│   └── architecture-access-model.png
├── policies/
│   ├── developers-policy.json
│   ├── operations-policy.json
│   ├── finance-policy.json
│   ├── analysts-policy.json
│   └── require-mfa-policy.json
├── screenshots/
│   └── ...
└── iac/                              # Level 2 (in progress)
    ├── terraform/
    ├── cloudformation/
    └── cdk/
```

## The scenario

StartupCo launched fast and deferred security to hit their deadline:
- All 10 employees shared root account credentials
- No role separation, no MFA, no password policy
- Credentials shared over team chat

**The task:** design and implement IAM access controls for four distinct roles (Developers, Operations, Finance, Analysts), secure the root user, and produce architecture diagrams - following a real client brief with a high-level summary and a separate, more detailed implementation spec.

## What I built

- **Two-environment architecture** (dev/prod), each with a public-subnet ALB, private-subnet EC2 and RDS, NAT Gateway, and an S3 Gateway Endpoint - with CloudWatch modeled correctly as an account-level service, not a VPC resource
- **Five IAM groups** (Developers, Operations, Finance, Analysts, Administrators) with least-privilege policies - a mix of scoped AWS managed policies and custom JSON where managed policies were too broad
- **Root user fully secured**: MFA, key removal, credential rotation, and a CloudTrail → CloudWatch → SNS pipeline that alerts on any root login
- **Account-wide MFA enforcement** via a deny-unless-MFA policy, plus a strong password policy
- **A documented dev/prod isolation decision** (separate VPCs + tag-based IAM conditions, evaluated against separate accounts and naming-convention-only approaches)

Full reasoning, trade-offs, and screenshots are in [`./docs/PROJECT-DOCUMENTATION.md`](./docs/PROJECT-DOCUMENTATION.md).

## A few decisions worth highlighting

- Caught and corrected a common IAM mix-up: **CloudWatch, CloudWatch Logs, and CloudWatch Events are three separate permission namespaces**, easy to conflate when browsing AWS managed policies.
- Scoped Developers' S3 access to a **named bucket ARN** instead of the broader `AmazonS3ReadOnlyAccess`, since the client's S3 also stores user data that shouldn't be in developers' reach.
- Documented the distinction between **IAM-level RDS read-only** (API/metadata access) and **database-level read-only** (actual row/table access) - the brief's "read-only database access" for Analysts needs both, and only one is achievable through IAM alone.
- Debugged the root-login alarm pipeline through four distinct, non-obvious failure modes (wrong alarm type, an empty metric picker caused by CloudWatch only listing metrics with existing data, malformed multi-line test JSON, and an inverted threshold condition) before confirming it actually fires - documented in full in the project write-up, since the debugging process was as instructive as the final config.
- Deployed the same IAM structure three additional times via Terraform, CloudFormation, and CDK, hit a real MalformedPolicyDocument error on the first one (IAM Sid fields must be alphanumeric, unlike policy names), and applied that fix proactively to the other two before deploying them - both went clean on the first try as a direct result.

## Status

- ✅ Level 1 - AWS Console implementation (IAM, security, architecture)
- 🚧 Level 2 - Infrastructure as Code (Terraform, CloudFormation, CDK) - all three deployed against the live account, documented in [`iac/`](./iac/), including the one bug hit (an IAM policy Sid naming rule) and how catching it on the first tool made the next two deploy clean on the first try.

## Why this project

Built to practice real IAM design decisions under a realistic, imperfect brief - including catching my own mistakes (wrong managed policies, ambiguous requirements) along the way, which mirrors what actually happens in a real engagement more than a clean step-by-step tutorial would.

---

*Feedback and suggestions welcome - open an issue or reach out.*

Walkthrough video:

https://www.linkedin.com/posts/fatemeh-feyzipour_aws-cloudsecurity-iam-ugcPost-7492586192283095041-fKFb/?utm_source=share&utm_medium=member_desktop&rcm=ACoAADOdEekBNejZcME7HcR483AQlDee7t4jnBU

Medium blog:

https://medium.com/@fatemehfeizipur/from-everyone-shares-root-to-least-privilege-an-aws-iam-security-project-b810d175512b?sharedUserId=fatemehfeizipur