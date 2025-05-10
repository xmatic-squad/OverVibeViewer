# Minecraft Client Files

This directory is used to store Minecraft client jar files needed by Overviewer.

## Automatic Download

The Minecraft client jar files will be automatically downloaded during the Docker build process. You don't need to manually add any files to this directory.

The Docker build process will:
1. Download the appropriate Minecraft client jar for version 1.21.4
2. Extract the necessary assets from the jar
3. Make the assets available to Overviewer for texture rendering

## Supported Versions

Currently, the system supports:
- Minecraft 1.21.4

## Adding New Versions

To add support for a new Minecraft version:

1. Update the Dockerfile to download the appropriate client jar
2. Add the new version to the Overviewer configuration
3. Update the version selection dropdown in the web interface

The jar file URL can be found from the Mojang version manifest. For more information, see:
https://piston-meta.mojang.com/mc/game/version_manifest_v2.json