import type { Metadata } from "next";
import { ChatInterface } from "@/components/chat/ChatInterface";

export const metadata: Metadata = {
  title: "Chat",
  description: "Ask questions across your uploaded knowledge base.",
};

export default function ChatPage() {
  return <ChatInterface />;
}
