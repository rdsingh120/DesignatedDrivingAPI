//index.js
import { connectDB } from "./src/config/db.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.route.js";
import vehicleRoutes from "./src/routes/vehicle.route.js";
import estimateRoutes from "./src/routes/estimate.routes.js";
import tripRoutes from "./src/routes/trip.route.js";


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
server.use("/api/vehicles", vehicleRoutes);

const port = process.env.PORT || 3000;


server.use("/api/auth", authRoutes);

server.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Designated Driving Server is running",
  });
});

server.listen(port, async () => {
  try {
    await connectDB();
    console.log("Server is listening on port " + port);
  } catch (error) {
    console.log(`Error in index.js: ${error}`);
  }
});
