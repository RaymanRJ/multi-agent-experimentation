# Site hosting (AWS)

Hosts the project site (`src/site/`) on AWS, as music-viz does: a private S3 bucket behind
CloudFront, with a free ACM certificate and a Route 53 record for the site's domain. GitHub Actions
(`.github/workflows/site.yaml`) builds the site and deploys it on every push to `main`.

```
GitHub Actions ──(OIDC, no stored keys)──▶ S3 bucket (private) ◀── CloudFront (HTTPS, ACM cert) ◀── Route 53
```

| Module | What it makes |
|---|---|
| `modules/s3` | The private bucket the built site is synced to; only the distribution can read it |
| `modules/acm` | The certificate (in us-east-1, as CloudFront requires), validated through DNS records in the zone |
| `modules/cloudfront` | The distribution: HTTPS only, compression, AWS's security headers, the site's own `404.html` |
| `modules/route53` | IPv4 and IPv6 alias records from the domain to the distribution |
| `modules/iam` | The role GitHub Actions takes on through GitHub's OIDC provider, only from `main` of this repository |

**What it costs:** the certificate is free. S3 and CloudFront cost pennies a month for a small
static site, and the hosted zone you already have is $0.50 a month whatever it serves.

## Set it up

You need an AWS account with a public Route 53 hosted zone for your domain, and AWS credentials on
your machine (`~/.aws`). Terraform runs in Docker, so nothing else needs installing. Run everything
from this folder.

1. **A bucket for Terraform state.** If you already have one (music-viz's works: it can hold
   state for many projects under different keys), skip this. Otherwise:

   ```sh
   docker run --rm -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE amazon/aws-cli \
     s3api create-bucket --bucket <state-bucket> --region us-east-1
   docker run --rm -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE amazon/aws-cli \
     s3api put-bucket-versioning --bucket <state-bucket> --versioning-configuration Status=Enabled
   docker run --rm -v "$HOME/.aws:/root/.aws:ro" -e AWS_PROFILE amazon/aws-cli \
     s3api put-public-access-block --bucket <state-bucket> --public-access-block-configuration \
     BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
   ```

2. **Configure.** Copy `backend.hcl.example` to `backend.hcl` and `site.auto.tfvars.example` to
   `site.auto.tfvars`, and fill both in. Both copies are gitignored; only the examples are public.
   - `domain_name`: the site's address, e.g. `multi-agent-experiment.rrjamal.ca`.
   - `hosted_zone_name`: the zone it belongs to, e.g. `rrjamal.ca`.
   - `create_github_oidc_provider`: leave `false` if music-viz already made GitHub's OIDC provider in
     this AWS account (an account has only one).

3. **Create the infrastructure.** The first apply takes a while: CloudFront and the certificate's DNS
   validation take several minutes.

   ```sh
   docker compose run --rm terraform init -backend-config=backend.hcl
   docker compose run --rm terraform plan
   docker compose run --rm terraform apply
   ```

4. **Connect GitHub.** Store the outputs as repository secrets with the
   [GitHub CLI](https://cli.github.com). They're secrets rather than variables, so they're masked in
   the Actions logs of this public repository:

   ```sh
   tf() { docker compose run --rm -T terraform output -raw "$1"; }
   gh secret set AWS_REGION --body "$(tf aws_region)"
   gh secret set AWS_DEPLOY_ROLE_ARN --body "$(tf deploy_role_arn)"
   gh secret set SITE_BUCKET --body "$(tf bucket_name)"
   gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "$(tf distribution_id)"
   ```

5. **Deploy.** Push to `main`, or run the `site` workflow by hand from the Actions tab.

If the deploy fails with "Not authorized to perform sts:AssumeRoleWithWebIdentity", the repository
probably uses GitHub's immutable OIDC subject format: set `github_oidc_subject_prefix` as the example
tfvars describes, and apply again.

## How the deploy signs in

This repository's workflows use only GitHub's own actions. So instead of AWS's
`configure-aws-credentials` action (which music-viz uses), the deploy job asks GitHub for an OIDC
token itself and trades it for 15-minute credentials with `aws sts assume-role-with-web-identity`,
using the AWS CLI that GitHub's Ubuntu runners include. Every value is masked before it reaches the
job's environment. The role, made by `modules/iam`, trusts only workflows on `main` of this
repository, and may only sync the bucket and invalidate the distribution.
