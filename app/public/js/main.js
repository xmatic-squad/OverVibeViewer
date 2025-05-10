// OverVibeViewer client-side JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const mapForm = document.getElementById('map-form');
  const worldPathInput = document.getElementById('world-path');
  const versionSelect = document.getElementById('version-select');
  const browseButton = document.getElementById('browse-button');
  const generateButton = document.getElementById('generate-button');
  const resetButton = document.getElementById('reset-button');
  const consoleOutput = document.getElementById('console-output');
  const consoleText = document.getElementById('console-text');
  const clearConsoleButton = document.getElementById('clear-console');
  const successMessage = document.getElementById('success-message');
  const outputPathElement = document.getElementById('output-path');
  const dropzone = document.getElementById('dropzone');
  const progressBar = document.getElementById('progress-bar');
  
  // File browser elements
  const fileBrowserModal = document.getElementById('file-browser-modal');
  const modalClose = document.querySelector('.modal-close');
  const currentPathElement = document.getElementById('current-path');
  const fileListElement = document.getElementById('file-list');
  const goUpButton = document.getElementById('go-up-button');
  const cancelBrowserButton = document.getElementById('cancel-browser');
  const selectFolderButton = document.getElementById('select-folder');
  
  // State
  let currentPath = '/host_home';
  let selectedPath = null;
  
  // Generate a client ID for Socket.IO tracking
  const clientId = 'client_' + Math.random().toString(36).substring(2, 15);
  
  // Connect to Socket.IO
  const socket = io();
  
  // Socket.IO events
  socket.on('connect', () => {
    console.log('Connected to server');
  });
  
  socket.on('overviewer-output', (data) => {
    if (data.clientId === clientId) {
      addConsoleMessage(data.data);
      updateProgress(data.progress || 0);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  });
  
  socket.on('overviewer-error', (data) => {
    if (data.clientId === clientId) {
      addConsoleMessage(`ERROR: ${data.data}`, true);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  });
  
  socket.on('overviewer-complete', (data) => {
    if (data.clientId === clientId) {
      if (data.success) {
        // Show success message
        consoleOutput.style.display = 'none';
        successMessage.style.display = 'block';
        outputPathElement.textContent = data.outputPath;
      } else {
        addConsoleMessage(`Ошибка: процесс завершился с кодом ${data.code}`, true);
      }
      
      // Re-enable form
      enableForm();
      resetButton.style.display = 'inline-block';
    }
  });
  
  // Load available Minecraft versions
  fetch('/api/versions')
    .then(response => response.json())
    .then(data => {
      // Populate version dropdown
      versionSelect.innerHTML = '';
      data.versions.forEach(version => {
        const option = document.createElement('option');
        option.value = version.id;
        option.textContent = version.name;
        if (version.id === data.defaultVersion) {
          option.selected = true;
        }
        versionSelect.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error loading versions:', error);
    });
  
  // Drag and drop functionality
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('dragover');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('dragover');
    }, false);
  });
  
  dropzone.addEventListener('drop', (e) => {
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const item = items[0];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          // This is a directory, set the path
          worldPathInput.value = entry.fullPath;
        } else {
          // This is a file, not a directory
          alert('Пожалуйста, перетащите папку, а не файл');
        }
      }
    }
  });
  
  // Click on dropzone to browse
  dropzone.addEventListener('click', () => {
    browseButton.click();
  });
  
  // File browser functionality
  
  // Open file browser when browse button is clicked
  browseButton.addEventListener('click', () => {
    openFileBrowser();
  });
  
  // Close file browser when close button is clicked
  modalClose.addEventListener('click', () => {
    closeFileBrowser();
  });
  
  // Close file browser when cancel button is clicked
  cancelBrowserButton.addEventListener('click', () => {
    closeFileBrowser();
  });
  
  // Handle file selection
  selectFolderButton.addEventListener('click', () => {
    if (selectedPath) {
      worldPathInput.value = selectedPath;
      closeFileBrowser();
    }
  });
  
  // Go up one directory
  goUpButton.addEventListener('click', () => {
    if (currentPath === '/host_home') return;
    
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath === '') {
      currentPath = '/';
    } else {
      currentPath = parentPath;
    }
    
    // Make sure we never go above /host_home
    if (currentPath === '/' || !currentPath.startsWith('/host_home')) {
      currentPath = '/host_home';
    }
    
    loadDirectoryContents(currentPath);
  });
  
  // Load directory contents
  function loadDirectoryContents(path) {
    fetch(`/api/directories?path=${encodeURIComponent(path)}`)
      .then(response => response.json())
      .then(data => {
        // Update path display
        currentPathElement.textContent = data.currentPath;
        currentPath = data.currentPath;
        
        // Clear selection
        selectedPath = null;
        selectFolderButton.disabled = true;
        
        // Clear file list
        fileListElement.innerHTML = '';
        
        // Populate file list
        data.contents.forEach(item => {
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          fileItem.dataset.path = item.path;
          fileItem.dataset.isDirectory = item.isDirectory;
          fileItem.dataset.isMinecraftWorld = item.isMinecraftWorld;
          
          const fileIcon = document.createElement('span');
          fileIcon.className = item.isDirectory ? 'file-icon' : 'file-icon file';
          fileIcon.textContent = item.isDirectory ? '📁' : '📄';
          
          // Add a special icon for folders that are Minecraft worlds
          if (item.isDirectory && item.isMinecraftWorld) {
            fileIcon.textContent = '🌎';
            fileIcon.className = 'file-icon minecraft-world';
          }
          
          const fileName = document.createElement('span');
          fileName.className = 'file-name';
          fileName.textContent = item.name;
          
          const fileSize = document.createElement('span');
          fileSize.className = 'file-size';
          if (!item.isDirectory) {
            fileSize.textContent = formatFileSize(item.size);
          }
          
          fileItem.appendChild(fileIcon);
          fileItem.appendChild(fileName);
          fileItem.appendChild(fileSize);
          
          // Add event listeners - double click to navigate, single click to select
          fileItem.addEventListener('dblclick', () => {
            if (item.isDirectory) {
              loadDirectoryContents(item.path);
            }
          });
          
          fileItem.addEventListener('click', () => {
            if (item.isDirectory) {
              selectFile(fileItem);
            }
          });
          
          fileListElement.appendChild(fileItem);
        });
      })
      .catch(error => {
        console.error('Error loading directory contents:', error);
        alert('Ошибка при загрузке содержимого директории');
      });
  }
  
  // Select a file
  function selectFile(fileItem) {
    // Only allow selecting directories for Minecraft worlds
    if (fileItem.dataset.isDirectory === 'false') {
      alert('Пожалуйста, выберите папку, а не файл');
      return;
    }
    
    // Clear previous selection
    const selectedItems = fileListElement.querySelectorAll('.selected');
    selectedItems.forEach(item => item.classList.remove('selected'));
    
    // Select this item
    fileItem.classList.add('selected');
    selectedPath = fileItem.dataset.path;
    
    // Enable select button
    selectFolderButton.disabled = false;
  }
  
  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
  }
  
  // Open file browser
  function openFileBrowser() {
    fileBrowserModal.style.display = 'block';
    loadDirectoryContents(currentPath);
  }
  
  // Close file browser
  function closeFileBrowser() {
    fileBrowserModal.style.display = 'none';
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === fileBrowserModal) {
      closeFileBrowser();
    }
  });
  
  // Clear console button
  clearConsoleButton.addEventListener('click', () => {
    consoleText.innerHTML = '';
  });
  
  // Form submission
  mapForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const worldPath = worldPathInput.value.trim();
    const minecraftVersion = versionSelect.value;
    
    if (!worldPath) {
      alert('Пожалуйста, выберите папку с миром Minecraft');
      return;
    }
    
    // Disable form during processing
    disableForm();
    
    // Show console output
    consoleOutput.style.display = 'block';
    successMessage.style.display = 'none';
    consoleText.textContent = 'Запуск процесса генерации карты...\n';
    progressBar.style.width = '0%';
    
    try {
      const response = await fetch('/api/generate-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId
        },
        body: JSON.stringify({
          worldPath,
          minecraftVersion
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        addConsoleMessage(`Ошибка: ${result.error}`, true);
        enableForm();
      } else {
        addConsoleMessage(`Запущена генерация карты. Выходная папка: ${result.outputPath}`);
        progressBar.style.width = '5%';
      }
    } catch (error) {
      console.error('Error:', error);
      addConsoleMessage(`Ошибка: ${error.message}`, true);
      enableForm();
    }
  });
  
  // Reset button handler
  resetButton.addEventListener('click', () => {
    worldPathInput.value = '';
    consoleOutput.style.display = 'none';
    successMessage.style.display = 'none';
    consoleText.textContent = '';
    resetButton.style.display = 'none';
    progressBar.style.width = '0%';
  });
  
  // Helper functions
  function addConsoleMessage(message, isError = false) {
    const line = document.createElement('div');
    line.textContent = message;
    if (isError) {
      line.style.color = '#F44336';
    }
    consoleText.appendChild(line);
    
    // Auto-scroll to bottom
    const container = consoleText.parentElement;
    container.scrollTop = container.scrollHeight;
  }
  
  function updateProgress(percent) {
    // Extract progress from log messages if possible
    let progressValue = percent;
    if (typeof percent === 'string' && percent.includes('%')) {
      const match = percent.match(/(\d+)%/);
      if (match) {
        progressValue = parseInt(match[1], 10);
      }
    }
    
    if (!isNaN(progressValue) && progressValue > 0) {
      progressBar.style.width = `${Math.min(progressValue, 100)}%`;
    }
  }
  
  function disableForm() {
    worldPathInput.disabled = true;
    versionSelect.disabled = true;
    browseButton.disabled = true;
    generateButton.disabled = true;
    dropzone.style.pointerEvents = 'none';
    dropzone.style.opacity = '0.5';
  }
  
  function enableForm() {
    worldPathInput.disabled = false;
    versionSelect.disabled = false;
    browseButton.disabled = false;
    generateButton.disabled = false;
    dropzone.style.pointerEvents = 'auto';
    dropzone.style.opacity = '1';
  }
});