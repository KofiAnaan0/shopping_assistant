import { connectionMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "../../../../models/User";

export async function POST(req: Request) {
  try {
    const { name, phone } = await req.json();

    await connectionMongoDB();

    const userFound = await User.findOne({ phone });
    if (userFound) {
      console.log("Phone number exist: ", userFound);

      return NextResponse.json({
        success: false,
        message: "Phone number exists",
      });
    }

    const user = new User({
      name,
      phone,
    });

    const savedUser = await user.save();
    console.log("User data saved successfully!! ", savedUser);

    return NextResponse.json({ message: "User data saved!!", savedUser });
  } catch (error) {
    console.error("Something went wrong: ", error);

    return NextResponse.json({
      error: "Something went wrong",
      details: error,
    });
  }
}
