# Stage 04: REG.RU inspection and recovery runbook

**NOT EXECUTED. HOST_ACCESS_NOT_AVAILABLE. BACKUP_NOT_EXECUTED. NOT FOR DEPLOYMENT.** No authenticated REG.RU account access, actual document root, server configuration, file inventory, backup or restoration has been independently established. Defaults and historical Git files are not proof of the present server.

## Owner/provider inspection, read only

1. Sign in through the provider's official interface; do not send credentials in chat. Record the hosting product and the account/site/domain, exact document roots for both hostnames, web server, runtime and upload limits.
2. Inspect existing files including hidden files, `.htaccess`, permissions, symlinks, separate applications, databases, forms, analytics, log storage and backup retention. Record the current DNS, TLS and redirect configuration without changing it.
3. Record actual MIME and range behavior for MP4, CSS, JS, fonts, PDFs, true 404 handling, cache headers, compression and storage limits. Document any dependencies outside the webroot.

## Backup and isolated restoration — before any future replacement

1. Obtain a complete dated download/export of the actual document root including dotfiles, applicable configuration, permissions, databases and external dependencies. Write it to a separate private location, never the current webroot. Record source paths, sizes, SHA-256, timestamp and metadata; compare source and copy counts and hashes.
2. Restore the copy into an isolated local sandbox or an explicitly authorized private staging location. Verify representative old routes, assets, application/database dependencies, redirects and error behavior; record results and retain the untouched backup. A local copy of GitHub is not a verified live backup.
3. Stop if any relevant files, hidden configuration, dependencies, permissions or restore checks are missing. Do not proceed to replacement without separately authorized G3/G4 and a complete current backup.

## Future deployment and rollback — NOT EXECUTED

After explicit gates and go-live authorization only, determine actual webroot, approved file set and hosting behavior; make and validate a fresh full backup; prepare a reviewed upload/removal list including hidden files and unrelated data; deploy using the verified provider procedure and run route, asset, MIME, HTTPS, redirect, cache and action smoke checks. Stop on missing backup, unclear file ownership, unexpected behavior or unapproved legal/rights state. On failure, use the provider's verified restoration method to replace only the authorized affected files/config with the validated backup and restore dependencies/permissions; repeat old-site smoke tests. Exact commands depend on real hosting access and are intentionally not invented.

## Future legal-document integration map

Keep the two source venue commercial PDFs distinct from any legal policies. Determine approved document text, owner, legal basis, permitted publication and paths before adding links. Verify existing source links and all target files on a private staging server after approval; do not invent operator identity or publish unapproved drafts. D01/D02/D04 remain deferred, not approved. G3 and G4 are not accepted.
