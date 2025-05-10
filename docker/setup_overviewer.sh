#!/bin/bash
# This script helps set up and troubleshoot Overviewer

# Check if we are running inside the container
if [ ! -d "/opt/overviewer" ]; then
  echo "This script must be run inside the container"
  exit 1
fi

# Go to Overviewer directory
cd /opt/overviewer

# Print Python and Pillow versions
echo "Python version:"
python3 --version

echo "Pillow installation:"
python3 -m pip show Pillow

# Check for Pillow headers
echo "Checking for Imaging.h..."
PIL_PATH=$(python3 -c "import PIL; print(PIL.__path__[0])" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "PIL path: $PIL_PATH"
  if [ -f "$PIL_PATH/Imaging.h" ]; then
    echo "Found Imaging.h in $PIL_PATH"
    ln -sf "$PIL_PATH/Imaging.h" /usr/include/
  else
    echo "Imaging.h not found in $PIL_PATH"
  fi
else
  echo "Could not determine PIL path"
fi

# Look for Imaging.h in common locations
for path in \
  /usr/include/python3.9/Imaging.h \
  /usr/include/python3/Imaging.h \
  /usr/local/include/python3.9/Imaging.h \
  /usr/include/Imaging.h
do
  if [ -f "$path" ]; then
    echo "Found Imaging.h at $path"
    ln -sf "$path" /usr/include/
  fi
done

# Try to build Overviewer
echo "Building Overviewer..."
python3 setup.py build -v

# Verify if module was built
python3 -c "import c_overviewer; print('c_overviewer module is available')" 2>/dev/null
if [ $? -eq 0 ]; then
  echo "Successfully built c_overviewer module"
else
  echo "c_overviewer module is not available"
  echo "Checking for build artifacts..."
  ls -la build/lib*/
fi

echo "Setup completed"