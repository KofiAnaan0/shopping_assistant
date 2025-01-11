import UserData from "@/components/UserData";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "POC - Shopping Assistant",
  description: "This is an AI powered shopping assistant",
};

export default function Home() {
  return <UserData />;
}
