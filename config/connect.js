import { connect } from "mongoose";

const connectDB = async (uri) => {
  try {
    await connect(uri);
    console.log("Connected to Database...");
  } catch (error) {
    console.log(`Error in connect.js: ${error}`);
  }
};

export default connectDB;
