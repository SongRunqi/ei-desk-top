const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const express = require("express");
const bodyParser = require("body-parser");

let mainWindow = null;
const PORT = 2999;

// Express 服务器配置
const setupServer = () => {
  const server = express();
  server.use(bodyParser.json());
  server.use(bodyParser.urlencoded({ extended: true }));

  // API 路由
  server.post("/api/trigger", (req, res) => {
    const params = req.body;
    console.log("Received parameters:", params);

    // 确保窗口存在再发送消息
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("trigger-vue-function", params);
      res.json({ status: "success" });
    } else {
      res
        .status(500)
        .json({ status: "error", message: "Window not available" });
    }
  });

  // 错误处理中间件
  server.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  });

  return server;
};

const createWindow = () => {
  // 创建窗口
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // 添加安全相关配置
      sandbox: true,
      webSecurity: true,
    },
  });

  // 日志输出用于调试
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Dev URL:", MAIN_WINDOW_VITE_DEV_SERVER_URL);
  console.log(
    "Production path:",
    path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
  );
  console.log("Current directory:", __dirname);

  // 加载应用
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // 生产环境路径
    const indexPath = path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
    );
    console.log("Loading file:", indexPath);

    try {
      mainWindow.loadFile(indexPath);
    } catch (error) {
      console.error("Failed to load index.html:", error);
    }
  }

  // 开发工具
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // 监听窗口加载完成事件
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window loaded successfully");
  });

  // 监听加载失败事件
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    },
  );
};

// 应用初始化
app.whenReady().then(() => {
  createWindow();

  // 启动 Express 服务器
  const server = setupServer();
  server
    .listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    })
    .on("error", (error) => {
      console.error("Server failed to start:", error);
    });

  // macOS 应用激活处理
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 窗口关闭处理
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 应用退出处理
app.on("before-quit", () => {
  // 清理资源
});
