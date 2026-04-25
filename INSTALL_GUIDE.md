# Installation Guide

## Issue: Python Dependencies Failing to Install

If you're getting errors building `pydantic-core` or other packages, try these solutions:

### Solution 1: Use Python 3.11 or 3.12 (Recommended)

Python 3.14 is very new and some packages may not have pre-built wheels yet. Install Python 3.11 or 3.12:

```bash
# Using Homebrew on macOS
brew install python@3.12

# Then use it specifically
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Solution 2: Install Build Dependencies

If you want to stay with Python 3.14, install build tools:

```bash
# Install Xcode Command Line Tools (if not already installed)
xcode-select --install

# Then try again
cd backend
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and setuptools first
pip install --upgrade pip setuptools wheel

# Try installing with verbose output to see what's failing
pip install -v -r requirements.txt
```

### Solution 3: Install Packages Individually

Try installing packages one by one to identify which one is problematic:

```bash
cd backend
source venv/bin/activate

# Install core packages first
pip install fastapi==0.115.0
pip install uvicorn==0.30.0
pip install sqlalchemy==2.0.31
pip install httpx==0.27.0

# Then the rest
pip install -r requirements.txt
```

### Solution 4: Alternative Requirements (Use this if all else fails)

If nothing works, I can create a simplified requirements file with more compatible versions.

## Quick Start After Installation Success

### Backend
```bash
cd backend
source venv/bin/activate  # Or: venv\Scripts\activate on Windows

# Create .env file
cp .env.example .env
# Edit .env and add your PEECAI_API_KEY

# Run server
python3 main.py
```

### Frontend
```bash
cd frontend
npm install  # You've already done this successfully!
npm run dev
```

## What to Check

1. **Python Version**: Run `python3 --version`
   - Best: 3.11.x or 3.12.x
   - Should work: 3.10.x
   - May have issues: 3.14.x (too new)

2. **pip Version**: Run `pip --version`
   - Should be 23.0 or higher

3. **Build Tools**: On macOS, run `xcode-select -p`
   - Should show: `/Library/Developer/CommandLineTools`
   - If not: run `xcode-select --install`

## Alternative: Run with Docker

If all else fails, you can run the application in Docker (I can create a Dockerfile if needed).
