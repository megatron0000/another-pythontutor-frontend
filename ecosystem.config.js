module.exports = {
  apps: [
    {
      name: "backend",
      script: "index.js",
      watch: "index.js"
    },
    {
      name: "frontend",
      script: "tsc",
      cwd: "frontend",
      interpreter: "npx",
      autorestart: false,
      watch: "frontend/src"
    }
  ]
};
