---
title: "git push hangs on networks that block port 22 (GitHub SSH)"
category: "workflow-tips"
date: "2026-04-29"
tags: [ssh, github, git, networking, firewall]
---

# git push hangs on networks that block port 22 (GitHub SSH)

## Context

Many corporate networks, public wifi, and some ISPs block outbound SSH on port 22. Pushing to GitHub via `git@github.com:...` URLs silently times out:

```
$ git push -u origin main
kex_exchange_identification: read: Operation timed out
banner exchange: Connection to 140.82.114.36 port 22: Operation timed out
fatal: Could not read from remote repository.
```

`gh` commands keep working because they use HTTPS (port 443).

## Diagnostic

Test SSH on port 22 vs 443:

```bash
ssh -T git@github.com                    # may hang or time out
ssh -T -p 443 git@ssh.github.com         # works on most networks
```

GitHub provides `ssh.github.com:443` specifically for this case — it speaks SSH on the HTTPS port.

## Three Workarounds

### Option A: HTTPS (simplest, recommended for most cases)

```bash
git remote set-url origin https://github.com/owner/repo.git
gh auth setup-git   # one-time: makes git use gh's stored token
git push -u origin main
```

Pros: no SSH config edits, works on every network that allows HTTPS.

Cons: requires `gh` to be installed and authenticated (which it usually is on dev machines).

### Option B: SSH config on port 443 (preserve SSH workflow)

Add to `~/.ssh/config`:

```
Host github.com
  HostName ssh.github.com
  User git
  Port 443
```

Then `git@github.com:owner/repo.git` URLs work transparently. SSH transport, just on the HTTPS port.

Pros: works everywhere, lets you keep `git@github.com:...` URLs in scripts and READMEs.

Cons: edits global SSH config (one-time, but worth knowing).

### Option C: One-off URL change

```bash
git remote set-url origin git@ssh.github.com:owner/repo.git
```

Pros: no config edit, scoped to one repo.

Cons: every repo needs the same fix; URL doesn't match the canonical `git@github.com` form.

## What was used here

This project hit the issue on first push. Solution applied: switch to HTTPS (Option A) for the initial push. When the user moved to a network where port 22 worked again, switched back to SSH:

```bash
git remote set-url origin git@github.com:alamine42/battuta.git
ssh -T git@github.com    # verify
```

## Prevention

- [ ] If you're on a new network and `git push` hangs more than 30 seconds, suspect port 22 first.
- [ ] If you commute between networks (home/office/cafe), Option B (SSH config on 443) is the most resilient — works on every network without per-push fiddling.
- [ ] In CI: prefer HTTPS with deploy tokens rather than SSH keys. Most CI runners can hit 443; some block 22.

## Related

- GitHub docs: "Using SSH over the HTTPS port" — describes ssh.github.com:443 setup
- `gh auth setup-git` — configures git's credential helper to use gh's auth
