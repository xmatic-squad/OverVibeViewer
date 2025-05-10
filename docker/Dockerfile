# OverVibeViewer (OVV) Dockerfile
# This builds a container with The Minecraft Overviewer and a web application

FROM debian:bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pil \
    python3-numpy \
    python3-dev \
    python3-pip \
    python3-pil.imagetk \
    build-essential \
    wget \
    git \
    unzip \
    curl \
    openjdk-17-jre \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Pillow development headers
RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    libpng-dev \
    zlib1g-dev \
    python3-dev \
    python3-setuptools \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /opt/minecraft /opt/overviewer

# Set up environment for Pillow headers
RUN python3 -c "from PIL import _imaging; print('PIL properly installed')" || echo "PIL import failed, fixing headers"
RUN python3 -c "import PIL; print(PIL.__path__[0])" > /tmp/pil_path.txt
RUN cat /tmp/pil_path.txt && \
    PIL_PATH=$(cat /tmp/pil_path.txt) && \
    ln -sf $PIL_PATH/Imaging.h /usr/include/ || \
    ln -sf /usr/include/python3.9/Imaging.h /usr/include/ || \
    ln -sf /usr/include/python3/Imaging.h /usr/include/ || \
    ln -sf /usr/local/include/python3.9/Imaging.h /usr/include/ || \
    echo "Could not find Imaging.h, continuing anyway"

# Download and install pre-built Minecraft Overviewer
WORKDIR /tmp
RUN apt-get update && apt-get install -y wget xz-utils && \
    wget https://github.com/GregoryAM-SP/The-Minecraft-Overviewer/releases/download/1.21.1/overviewer-v1.21.1-LINUX.tar.xz && \
    mkdir -p /opt/overviewer && \
    tar -xf overviewer-v1.21.1-LINUX.tar.xz -C /opt/overviewer --strip-components=1 && \
    rm overviewer-v1.21.1-LINUX.tar.xz && \
    # Install Python dependencies
    python3 -m pip install --upgrade pip && \
    python3 -m pip install numpy Pillow && \
    # Verify the installation
    ls -la /opt/overviewer && \
    # Make sure the binary is executable
    chmod +x /opt/overviewer/overviewer.py

# Download Minecraft client
WORKDIR /opt/minecraft
RUN wget -O client-1.21.4.jar "https://piston-data.mojang.com/v1/objects/a7e5a6024bfd3cd614625aa05629adf760020304/client.jar"

# Create a wrapper script to run overviewer.py directly
RUN echo '#!/bin/bash\npython3 /opt/overviewer/overviewer.py --config="$1"' > /usr/local/bin/overviewer && \
    chmod +x /usr/local/bin/overviewer

# Add the Overviewer setup script
COPY docker/setup_overviewer.sh /usr/local/bin/setup_overviewer
RUN chmod +x /usr/local/bin/setup_overviewer

# Setup Node.js application
WORKDIR /app
COPY app/ /app/
RUN cd /app && npm install

# Copy Overviewer configuration and helper scripts
COPY docker/overviewer.conf /opt/overviewer.conf
COPY docker/run_overviewer.sh /usr/local/bin/run_overviewer
RUN chmod +x /usr/local/bin/run_overviewer

# Expose web server port
EXPOSE 3000

# Start the application
CMD ["node", "/app/src/index.js"]