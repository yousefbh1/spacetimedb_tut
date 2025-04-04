const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from the current directory (__dirname) and the dist directory
app.use(express.static(__dirname)); 
app.use('/dist', express.static(path.join(__dirname, 'dist'))); 

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Web client server running at http://localhost:${PORT}`);
  console.log('Make sure to run "npm run build" to compile the TypeScript code.');
  console.log(`Open your browser and navigate to http://localhost:${PORT} to access the chat application.`);
}); 