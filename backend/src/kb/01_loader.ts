import { Document } from "@langchain/core/documents";
import { LoadFileArgs, SupportedMime } from "../types/kb";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

export async function loadFileAsDocuments(
  args: LoadFileArgs,
): Promise<Document[]> {
  const { filePath, mimeType, originalName } = args;
  const extension = getExtension(originalName);

  const isMarkdown =
    mimeType === "text/markdown" ||
    extension === "md" ||
    extension === "markdown";

  const isText = mimeType === "text/plain" || extension === "txt";
  const isPDF = mimeType === "application/pdf" || extension === "pdf";

  if (isPDF) {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    return docs.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: originalName,
      },
    }));
  } else if (isMarkdown || isText) {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();
    return docs.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: originalName,
      },
    }));
  } else {
    return [] as Document[];
  }
}

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1);
}
