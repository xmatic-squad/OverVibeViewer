const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// API route to list directories
app.get('/api/directories', async (req, res) => {
  try {
    let basePath = req.query.path || '/host_home';
    
    // Validate path to prevent directory traversal
    if (!basePath.startsWith('/host_home') && basePath !== '/host_home') {
      basePath = '/host_home';
    }
    
    // Check if path exists
    if (!(await exists(basePath))) {
      return res.status(404).json({ error: 'Путь не существует' });
    }
    
    // Get directory contents
    const items = await readdir(basePath);
    const contents = [];
    
    for (const item of items) {
      // Skip hidden files and folders
      if (item.startsWith('.')) continue;
      
      const itemPath = path.join(basePath, item);
      try {
        const stats = await stat(itemPath);
        
        // Check if this is a Minecraft world directory
        const isWorld = await isMinecraftWorld(itemPath);
        
        contents.push({
          name: item,
          path: itemPath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
          isMinecraftWorld: isWorld
        });
      } catch (error) {
        console.error(`Error stating ${itemPath}:`, error);
      }
    }
    
    // Sort directories first, then files
    contents.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    res.json({
      currentPath: basePath,
      contents
    });
  } catch (error) {
    console.error('Error listing directories:', error);
    res.status(500).json({ error: 'Ошибка при получении списка директорий' });
  }
});

// API route to handle map generation
app.post('/api/generate-map', async (req, res) => {
  let { worldPath, minecraftVersion } = req.body;
  const clientId = req.headers['x-client-id'];
  
  if (!worldPath) {
    return res.status(400).json({ error: 'Необходимо указать путь к миру Minecraft' });
  }
  
  try {
    console.log(`Checking path: ${worldPath}`);
    
    // Ensure the world path exists
    if (!(await exists(worldPath))) {
      return res.status(400).json({ 
        error: `Путь к миру Minecraft не существует: ${worldPath}` 
      });
    }
    
    // Find the actual world folder - either this folder or a subfolder
    let actualWorldPath = worldPath;
    const isCurrentFolderWorld = await hasLevelDat(worldPath);
    
    if (!isCurrentFolderWorld) {
      // Check if this folder contains "world", "world_nether", or "world_the_end" subfolders
      const subfolders = ['world', 'world_nether', 'world_the_end'];
      let worldFolderFound = false;
      
      for (const subfolder of subfolders) {
        const subfolderPath = path.join(worldPath, subfolder);
        if (await exists(subfolderPath) && await hasLevelDat(subfolderPath)) {
          actualWorldPath = subfolderPath;
          worldFolderFound = true;
          console.log(`Found world folder: ${actualWorldPath}`);
          break;
        }
      }
      
      if (!worldFolderFound) {
        return res.status(400).json({
          error: `Выбранная папка не содержит файлы мира Minecraft. Пожалуйста, выберите папку, содержащую level.dat или папки world, world_nether, world_the_end.`
        });
      }
    }
    
    // Determine output path (same directory as actual parent world)
    const worldDir = path.dirname(actualWorldPath);
    const worldName = path.basename(actualWorldPath);
    const outputPath = path.join(worldDir, `${worldName}_map`);
    
    console.log(`World directory: ${worldDir}`);
    console.log(`World name: ${worldName}`);
    console.log(`Output path: ${outputPath}`);
    
    // Create output directory if it doesn't exist
    if (!(await exists(outputPath))) {
      await mkdir(outputPath, { recursive: true });
    }
    
    // Generate Overviewer config file
    const configTemplate = fs.readFileSync('/opt/overviewer.conf', 'utf-8');
    let configContent = configTemplate
      .replace(/WORLD_PATH/g, actualWorldPath)
      .replace(/OUTPUT_PATH/g, outputPath);
    
    // Set minecraft jar based on version
    configContent = configContent.replace(
      'return "/opt/minecraft/client-1.21.4.jar"',
      `return "/opt/minecraft/client-${minecraftVersion}.jar"`
    );
    
    const configPath = '/tmp/overviewer-config.py';
    fs.writeFileSync(configPath, configContent);
    
    // Debug: Log the config file for troubleshooting
    console.log('Config file content:');
    console.log(configContent);
    
    // Run the pre-built Overviewer binary
    let overviewerProcess = null;

    try {
      // Inform client that we're starting the map generation
      io.emit('overviewer-output', {
        clientId,
        data: 'Запуск генерации карты с использованием Overviewer...',
        progress: 5
      });

      console.log('Starting Overviewer with config:', configPath);

      // Execute Overviewer using the helper script
      overviewerProcess = spawn('/usr/local/bin/run_overviewer', [
        configPath
      ]);

      // Set up process output handling
      setupOverviewerProcess(overviewerProcess);
    } catch (e) {
      console.error('Error launching Overviewer:', e);
      io.emit('overviewer-error', {
        clientId,
        data: `Ошибка при запуске Overviewer: ${e.message}`
      });
    }

    // Function to set up process output handling
    function setupOverviewerProcess(process) {
      // Progress tracking
      let progressPercent = 0;

      // Set up stdout handler
      process.stdout.on('data', (data) => {
        const dataStr = data.toString();
        console.log(`Overviewer output: ${dataStr}`);

        // Try to extract progress information
        if (dataStr.includes('rendering') || dataStr.includes('processing')) {
          // Increment progress slightly for every render line
          progressPercent += 0.5;
          if (progressPercent > 95) progressPercent = 95;
        }

        io.emit('overviewer-output', {
          clientId,
          data: dataStr,
          progress: progressPercent
        });
      });

      // Set up stderr handler
      process.stderr.on('data', (data) => {
        const dataStr = data.toString();
        console.log(`Overviewer error: ${dataStr}`);
        io.emit('overviewer-error', { clientId, data: dataStr });
      });

      // Set up close handler
      process.on('close', (code) => {
        console.log(`Overviewer process exited with code ${code}`);
        if (code === 0) {
          io.emit('overviewer-output', {
            clientId,
            data: 'Карта успешно создана!',
            progress: 100
          });
          io.emit('overviewer-complete', { clientId, success: true, outputPath });
        } else {
          io.emit('overviewer-complete', { clientId, success: false, code });
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Генерация карты запущена',
      outputPath
    });
    
  } catch (error) {
    console.error('Error generating map:', error);
    res.status(500).json({ error: `Ошибка при генерации карты: ${error.message}` });
  }
});

// Helper function to check for level.dat file
async function hasLevelDat(folderPath) {
  const levelDatPath = path.join(folderPath, 'level.dat');
  return await exists(levelDatPath);
}

// Helper function to validate if a path contains a Minecraft world
async function isMinecraftWorld(worldPath) {
  try {
    // Check for level.dat file
    if (await hasLevelDat(worldPath)) {
      return true;
    }
    
    // Check for standard world subfolders
    const subfolders = ['world', 'world_nether', 'world_the_end'];
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(worldPath, subfolder);
      if (await exists(subfolderPath) && await hasLevelDat(subfolderPath)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error validating Minecraft world:', error);
    return false;
  }
}

// API route to get available Minecraft versions
app.get('/api/versions', (req, res) => {
  // For now, we only support version 1.21.4
  res.json({
    versions: [
      { id: '1.21.4', name: 'Minecraft 1.21.4' }
    ],
    defaultVersion: '1.21.4'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`OverVibeViewer запущен на порту ${PORT}`);
  console.log(`Доступен по адресу: http://localhost:${PORT}`);
});