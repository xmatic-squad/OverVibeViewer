@echo off
:: OverVibeViewer (OVV) Start Script for Windows
:: This script builds and starts the OVV Docker container

echo Starting OverVibeViewer (OVV)...
echo ==================================

:: Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker is not installed. Please install Docker first.
    echo Visit https://docs.docker.com/get-docker/ for installation instructions.
    pause
    exit /b 1
)

:: Set current directory to the project root
cd /d "%~dp0.."

:: Stop and remove existing container if it's running
docker ps -a | findstr "overvibeviewer" >nul
if %ERRORLEVEL% equ 0 (
    echo Stopping and removing existing OverVibeViewer container...
    docker stop overvibeviewer >nul 2>nul
    docker rm overvibeviewer >nul 2>nul
)

:: Build the Docker image
echo Building the Docker image (this may take a few minutes for the first run)...
docker build -t overvibeviewer:latest -f docker\Dockerfile .

:: Define the port for the web application
set PORT=3000

:: Run the Docker container
echo Starting the OverVibeViewer container...
docker run -d ^
    --name overvibeviewer ^
    -p %PORT%:%PORT% ^
    --restart unless-stopped ^
    --volume /var/run/docker.sock:/var/run/docker.sock ^
    --volume "%USERPROFILE%:/host_home" ^
    overvibeviewer:latest

:: Check if container started successfully
docker ps | findstr "overvibeviewer" >nul
if %ERRORLEVEL% equ 0 (
    echo OverVibeViewer is now running!
    
    :: Wait a moment for server to start
    echo Opening browser at http://localhost:%PORT%
    timeout /t 3 >nul
    
    :: Open browser automatically
    start "" "http://localhost:%PORT%"
    
    echo To stop the application, run: docker stop overvibeviewer ^&^& docker rm overvibeviewer
) else (
    echo Failed to start OverVibeViewer container. Check Docker logs for details.
    docker logs overvibeviewer
    exit /b 1
)

pause