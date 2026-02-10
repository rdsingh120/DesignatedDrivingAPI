// src/models/Payment.model.js
import mongoose from "mongoose";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "./constants.js";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true, unique: true, index: true },

    method: { type: String, enum: Object.values(PAYMENT_METHOD), default: PAYMENT_METHOD.MOCK },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "CAD", uppercase: true, maxlength: 3 },

    paidAt: { type: Date },
    receiptRef: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
