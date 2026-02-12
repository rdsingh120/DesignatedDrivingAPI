import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/connect.js";
import authRoutes from "./routes/auth.route.js";
import estimateRoutes from "./routes/estimate.routes.js";
import tripRoutes from "./routes/trip.route.js";


const server = express();

server.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
server.use(express.json());
server.use("/api/estimates", estimateRoutes); 
server.use("/api/trips", tripRoutes);

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
