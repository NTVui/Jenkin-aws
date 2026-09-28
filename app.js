const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("CI/CD deployment successful!");
});

app.listen(port, () => {
  console.log(`Application running at port ${port}`);
});
