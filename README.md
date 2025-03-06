# Recipe_Cost_Calculator

# Author: Dan Ross

# Date: 2025-03-05

# Recipe Cost Calculator

A simple browser-based application for calculating recipe costs.

## Features

- Add recipes with customizable ingredients
- Calculate total recipe costs and cost per portion
- Export recipe data as CSV files
- Import recipes from text

## Getting Started

These instructions will help you run the Recipe Cost Calculator locally on your computer.

### Prerequisites

- A web browser
- Git (optional, for version control)
- For the Electron version: [Node.js](https://nodejs.org/) installed on your system

## Running the Application

### Option 1: Run locally with a basic HTTP server (Easiest)

#### For Windows:

1. Download or clone this repository
2. Navigate to the project directory in Command Prompt or PowerShell
3. If you have Python installed, start a simple HTTP server:
   ```
   python -m http.server 8000
   ```
   or for Python 2:
   ```
   python -m SimpleHTTPServer 8000
   ```
4. Open your browser and go to `http://localhost:8000`

#### For Mac:

1. Download or clone this repository
2. Open Terminal (Applications > Utilities > Terminal)
3. Navigate to the project directory:
   ```bash
   cd path/to/recipe-calculator
   ```
4. Start a Python HTTP server (Python comes pre-installed on most Macs):
   ```bash
   python -m SimpleHTTPServer 8000   # For Python 2
   ```
   or
   ```bash
   python3 -m http.server 8000       # For Python 3
   ```
5. Open your browser and navigate to `http://localhost:8000`

#### For Linux:

1. Download or clone this repository
2. Open Terminal
3. Navigate to the project directory
4. Start a Python HTTP server:
   ```bash
   python -m SimpleHTTPServer 8000   # For Python 2
   ```
   or
   ```bash
   python3 -m http.server 8000       # For Python 3
   ```
5. Open your browser and go to `http://localhost:8000`

### Option 2: Run as an Electron app

1. Make sure Node.js is installed on your system
2. Navigate to the project directory in your terminal or command prompt
3. Initialize npm (if not already done):
   ```
   npm init -y
   ```
4. Install Electron:
   ```
   npm install --save-dev electron
   ```
5. Create a main.js file in the project root:

   ```javascript
   const { app, BrowserWindow } = require("electron");
   const path = require("path");

   function createWindow() {
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: {
         nodeIntegration: true,
       },
     });

     win.loadFile("index.html");
   }

   app.whenReady().then(() => {
     createWindow();

     app.on("activate", () => {
       if (BrowserWindow.getAllWindows().length === 0) {
         createWindow();
       }
     });
   });

   app.on("window-all-closed", () => {
     if (process.platform !== "darwin") {
       app.quit();
     }
   });
   ```

6. Add this to your package.json scripts:
   ```json
   "scripts": {
     "start": "electron ."
   }
   ```
7. Run the app:
   ```
   npm start
   ```

### Option 3: Package as a desktop application

#### For Windows:

```
npm install --save-dev electron-packager
npx electron-packager . RecipeCalculator --platform=win32 --arch=x64
```

#### For Mac:

```
npm install --save-dev electron-packager
npx electron-packager . RecipeCalculator --platform=darwin --arch=x64
```

#### For Linux:

```
npm install --save-dev electron-packager
npx electron-packager . RecipeCalculator --platform=linux --arch=x64
```

## Using the Recipe Cost Calculator

1. Enter the recipe name, yield amount, and portion size
2. Add ingredients and their quantities
3. Click "Calculate Recipe" to see the cost breakdown
4. Use the "Copy to Clipboard" or "Download CSV" buttons to export your recipe

## License

This project is licensed under the MIT License
