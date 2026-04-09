//index.js
import { connectDB } from "./src/config/db.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.route.js";
import vehicleRoutes from "./src/routes/vehicle.route.js";
import estimateRoutes from "./src/routes/estimate.routes.js";
import tripRoutes from "./src/routes/trip.route.js";
import driverProfileRoutes from "./src/routes/driverProfile.route.js";
import ratingRoutes from "./src/routes/rating.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import path from "path";
import fs from "fs";
import driverRoutes from "./src/routes/driver.route.js";
import notificationRoutes from "./src/routes/notification.route.js";



const server = express();

server.use(
  cors({
    origin: ["http://localhost:5173", process.env.CLIENT_URL
      ,"https://deploy-preview-24--drivly-project.netlify.app",
    ],
    credentials: true,
  }),
);

const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

server.use("/uploads", express.static("uploads"));

server.use(express.json());
server.use("/api/estimates", estimateRoutes); 
server.use("/api/trips", tripRoutes);
server.use("/api/vehicles", vehicleRoutes);
server.use("/api/driver-profiles", driverProfileRoutes);
server.use("/api/ratings", ratingRoutes);
server.use("/api/users", userRoutes);
server.use("/api/drivers", driverRoutes);
server.use("/api/notifications", notificationRoutes);

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
