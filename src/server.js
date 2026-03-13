const app = require("./app");
const { port } = require("./config/env");

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
