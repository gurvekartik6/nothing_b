const path = require("path");
const express = require("express");
const api = require("../api/index.js");

const app = api;
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "..");

app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin", "index.html"));
});

app.get("/admin/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kartik blog running at http://localhost:${PORT}`);
  });
}

module.exports = app;
