#!/bin/bash
# Simple script to run Overviewer with the correct environment

# Check if config file was provided
if [ "$1" == "" ]; then
  echo "Usage: $0 /path/to/config.py"
  exit 1
fi

CONFIG_PATH="$1"

# Check if the config file exists
if [ ! -f "$CONFIG_PATH" ]; then
  echo "Config file not found: $CONFIG_PATH"
  exit 1
fi

# Print environment info
echo "=== Overviewer Run Environment ==="
echo "Running as user: $(whoami)"
echo "Working directory: $(pwd)"
echo "Python version: $(python3 --version)"
echo "Config path: $CONFIG_PATH"
echo "=================================="

# Check if the Overviewer is correctly installed
if [ ! -f "/opt/overviewer/overviewer.py" ]; then
  echo "Overviewer not found at /opt/overviewer/overviewer.py"
  exit 1
fi

# List Overviewer files to verify installation
echo "Verifying Overviewer installation:"
ls -la /opt/overviewer/

# Run Overviewer
cd /opt/overviewer
echo "Starting Overviewer..."
python3 overviewer.py --config="$CONFIG_PATH"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "Overviewer completed successfully"
else
  echo "Overviewer exited with code $EXIT_CODE"
fi

exit $EXIT_CODE