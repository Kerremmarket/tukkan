#!/usr/bin/env python3
"""
Build script for Tukkan deployment
This script builds the React frontend and prepares the app for deployment
"""

import os
import subprocess
import sys
import shutil

def run_command(command, cwd=None):
    """Run a command and handle errors"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=True, capture_output=True, text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    """Main build process"""
    print("🏗️  Building Tukkan for production deployment...")
    
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    print("\n📦 Installing frontend dependencies...")
    if not run_command("npm install"):
        print("❌ Failed to install frontend dependencies")
        sys.exit(1)
    
    print("\n🔨 Building React frontend...")
    if not run_command("npm run build"):
        print("❌ Failed to build frontend")
        sys.exit(1)
    
    print("\n📁 Checking build output...")
    dist_path = os.path.join(project_root, 'dist')
    if not os.path.exists(dist_path):
        print("❌ Build output not found in dist/ directory")
        sys.exit(1)
    
    # Check if index.html exists
    index_path = os.path.join(dist_path, 'index.html')
    if not os.path.exists(index_path):
        print("❌ index.html not found in dist/ directory")
        sys.exit(1)
    
    print("\n📋 Installing backend dependencies...")
    backend_path = os.path.join(project_root, 'backend')
    if not run_command("pip install -r requirements.txt", cwd=backend_path):
        print("❌ Failed to install backend dependencies")
        sys.exit(1)
    
    print("\n✅ Build completed successfully!")
    print("\n📝 Deployment ready:")
    print("   - Frontend built in: dist/")
    print("   - Backend ready in: backend/")
    print("   - Database will be created automatically")
    print("\n🚀 Ready to deploy to Railway!")

if __name__ == "__main__":
    main() 