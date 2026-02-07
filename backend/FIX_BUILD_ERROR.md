# Fix better-sqlite3 Build Error

## Problem
`better-sqlite3` requires `distutils` which was removed in Python 3.12+. You're using Python 3.14.

## Solution Options

### Option 1: Install setuptools (Recommended)

Run this command in your terminal:

```bash
python3 -m pip install setuptools
```

Or if you get permission errors:

```bash
sudo python3 -m pip install setuptools
```

Then try installing again:

```bash
cd backend
npm install
```

### Option 2: Use Python 3.11 or earlier

If you have pyenv or another Python version manager:

```bash
# Install Python 3.11
pyenv install 3.11.9
pyenv local 3.11.9

# Then install
npm install
```

### Option 3: Skip better-sqlite3 (if not needed)

If you're only using Redis and don't need SQLite, you can remove it:

```bash
cd backend
npm uninstall better-sqlite3 sqlite3
```

Then update `src/db/init.js` to not use SQLite (only if you don't need the users/reminders tables).

### Option 4: Use prebuilt binary

Try installing with:

```bash
npm install better-sqlite3 --build-from-source=false
```

Or set environment variable:

```bash
export npm_config_build_from_source=false
npm install
```

## Quick Fix (Try This First)

```bash
# Install setuptools
python3 -m pip install --user setuptools

# Or with sudo if needed
sudo python3 -m pip install setuptools

# Then install npm packages
cd backend
npm install
```

## Verify Fix

After installing setuptools, verify:

```bash
python3 -c "import distutils; print('distutils available')"
```

If this prints "distutils available", then try `npm install` again.

