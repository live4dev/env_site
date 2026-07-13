import { ChatClient } from "@/components/chat/chat-client";
import { PageHeader } from "@/components/ui";

export default async function ChatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const initialQuestion = Array.isArray(params.q) ? params.q[0] : params.q;
  return (
    <>
      <PageHeader title="AI Q&A" description="Ответы строятся только по индексированному контексту хранилища; найденные источники показываются рядом." />
      <ChatClient initialQuestion={initialQuestion ?? ""} />
    </>
  );
}
