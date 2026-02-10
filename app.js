import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";

dotenv.config();

const app = express();
app.use(express.json());

await connectDB();

app.get("/", (req, res) => {
  res.send("Designated Driving API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
