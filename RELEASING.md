# Releasing

Releases are published to npm by GitHub Actions through [npm trusted publishing](https://docs.npmjs.com/trusted-publishers). No npm token is stored anywhere; npmjs.com trusts the `release.yml` workflow in this repository and issues a short-lived credential per run. Every release gets provenance attestations automatically.

## One-time setup (already done for this package)

On npmjs.com, open the package → Settings → Publishing access → Trusted publisher → GitHub Actions, and enter:

| Field                | Value                |
| -------------------- | -------------------- |
| Organization or user | `theengineeringmind` |
| Repository           | `auto-skeleton`      |
| Workflow filename    | `release.yml`        |
| Environment name     | leave blank          |

Two details on that form that break publishing if wrong:

- **Environment name must be truly empty.** Typing `none` makes npm require a GitHub environment called "none", and the workflow's identity has no environment, so npm answers "OIDC permission denied".
- **Tick "Allow npm publish".** Without it a trusted publisher may only run `npm stage publish`, and a direct `npm publish` is refused with the same "permission denied" error.

When no entry exists on the package at all, the workflow log shows "OIDC token exchange error - package not found".

Publishing access is set to "Require two-factor authentication and disallow tokens", so only this workflow or a maintainer entering a 2FA code can publish. Token-based publishing is refused by design.

## Cutting a release

1. Update `CHANGELOG.md` with a heading for the new version.
2. Bump the version and tag in one step. This runs the full check first:

   ```bash
   pnpm version minor   # or patch / major
   ```

3. Push the commit and the tag:

   ```bash
   git push origin main --follow-tags
   ```

4. The `Release` workflow verifies the tag matches `package.json`, runs `pnpm check` via `prepublishOnly`, and publishes. If the version is already on npm the workflow exits cleanly without publishing.
5. Create the GitHub release from the tag:

   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --notes-from-tag
   ```

## If a release fails

- **"Unable to authenticate" or 404 on publish:** the trusted publisher on npmjs.com does not match this repository or workflow filename exactly. Re-check the table above.
- **Tag mismatch:** the tag must be `v` followed by the exact `package.json` version.
- **Check failures:** fix on `main`, then move the tag to the new commit with `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`. The workflow re-runs and skips nothing, because the version was never published.
