import "dotenv/config";
import express from "express";
import connectDB from "./config/connect.js";
import authRoutes from "./routes/auth.route.js"

const server = express();
server.use(express.json());

const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

server.use("/api/auth", authRoutes);

server.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Designated Driving Server is running",
  });
});


server.listen(port, async () => {
  try {
    await connectDB(uri);
    console.log("Server is listening on port " + port);
  } catch (error) {
    console.log(`Error in index.js: ${error}`);
  }
});
