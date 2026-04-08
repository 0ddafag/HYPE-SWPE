# GitHub Push Flow

Use this if you want a clean first commit from this folder.

## 1. Initialize Git

```bash
git init
git branch -M main
```

## 2. Review What Will Be Committed

```bash
git status --short
```

You should see the dashboard files, but not `.DS_Store`, `.vercel`, or local `.env` files because they are ignored by `.gitignore`.

## 3. Create the Initial Commit

```bash
git add .
git commit -m "Initial HYPE SWPE dashboard"
```

## 4. Create the GitHub Repo

Option A: GitHub web UI

1. Create a new empty repository on GitHub.
2. Do not add a README, `.gitignore`, or license there.

Option B: GitHub CLI

```bash
gh repo create YOUR_REPO_NAME --public --source=. --remote=origin --push
```

## 5. Connect the Local Repo If You Used the Web UI

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 6. Future Updates

```bash
git add .
git commit -m "Describe the change"
git push
```
