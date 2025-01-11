import mongoose, { model, Schema } from "mongoose";

export interface UserDocument {
  _id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: "string",
      required: [true, "Name is required"],
    },
    phone: {
      type: "string",
      required: [true, "Phone number is required"],
      match: [
        /^\+?[1-9]\d{1,15}$/,
        "Please enter a valid phone number e.g. +256751124310",
      ],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models?.User || model<UserDocument>("User", UserSchema);

export default User;
