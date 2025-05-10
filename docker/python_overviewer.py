#!/usr/bin/env python3
"""
Python Overviewer Wrapper
This script attempts to run Overviewer without requiring compiled modules.
It is a fallback option for environments where compilation fails.
"""

import os
import sys
import subprocess
import importlib.util
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("PythonOverviewer")

def check_module_exists(module_name):
    """Check if a Python module can be imported"""
    try:
        spec = importlib.util.find_spec(module_name)
        return spec is not None
    except ImportError:
        return False

def run_overviewer_pure_python(args):
    """Run Overviewer in pure Python mode"""
    # Set environment variables to bypass C module requirements
    env = os.environ.copy()
    env['OVERVIEWER_NO_COMPILED'] = '1'
    
    # Check prerequisites
    if not check_module_exists('PIL'):
        logger.error("Pillow (PIL) is not installed. Please install it with: pip install Pillow")
        return 1
    
    if not check_module_exists('numpy'):
        logger.warning("NumPy is not installed. Some features may not work.")
    
    # Find the Overviewer script
    overviewer_path = '/opt/overviewer/overviewer.py'
    if not os.path.exists(overviewer_path):
        logger.error(f"Could not find Overviewer script at {overviewer_path}")
        return 1
    
    # Run Overviewer with the Python interpreter
    cmd = [sys.executable, overviewer_path] + args
    logger.info(f"Running command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            env=env,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Print output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        return result.returncode
    except Exception as e:
        logger.error(f"Failed to run Overviewer: {e}")
        return 1

if __name__ == "__main__":
    logger.info("Starting Python Overviewer wrapper")
    
    # Remove the script name from arguments
    args = sys.argv[1:]
    
    if not args:
        logger.error("No arguments provided. Please provide a configuration file with --config.")
        sys.exit(1)
    
    # Run Overviewer
    exit_code = run_overviewer_pure_python(args)
    sys.exit(exit_code)