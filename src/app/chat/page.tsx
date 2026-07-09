import { ChatClient } from "@/components/chat/chat-client";
import { PageHeader } from "@/components/ui";

export default function ChatPage() {
  return (
    <>
      <PageHeader title="AI Q&A" description="Ответы строятся только по индексированному контексту хранилища; найденные источники показываются рядом." />
      <ChatClient />
    </>
  );
}
