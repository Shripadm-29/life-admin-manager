import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from './supabaseClient';
import {
  DocumentExtractionSummary,
  DocumentPlanningContext,
} from './plannerTypes';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ExtractDocumentResponse {
  extracted_text: string;
  suggested_title?: string | null;
  suggested_due_date?: string | null;
  confidence?: number | null;
  metadata?: DocumentExtractionSummary;
}

const TEXT_LIMIT = 12000;

const getFileName = (filePath: string) => filePath.split('/').pop() || filePath;

const getFileExtension = (filePath: string) => {
  const fileName = getFileName(filePath);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
};

const truncateText = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, TEXT_LIMIT);

const extractTextFromPdf = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageTexts: string[] = [];
  const pageCount = Math.min(pdf.numPages, 20);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();
    if (text) {
      pageTexts.push(text);
    }
  }

  return truncateText(pageTexts.join('\n'));
};

const extractTextFromDocx = async (blob: Blob): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });
  return truncateText(result.value);
};

const extractRawText = async (filePath: string, blob: Blob): Promise<string> => {
  const extension = getFileExtension(filePath);
  if (['txt', 'md', 'csv', 'json'].includes(extension)) {
    return truncateText(await blob.text());
  }
  if (extension === 'pdf') {
    return extractTextFromPdf(blob);
  }
  if (extension === 'docx') {
    return extractTextFromDocx(blob);
  }
  return '';
};

const isImageFile = (filePath: string) => ['png', 'jpg', 'jpeg', 'webp'].includes(getFileExtension(filePath));

const getSignedDocumentUrl = async (filePath: string): Promise<string> => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 60 * 30);
  if (error || !data?.signedUrl) {
    throw error || new Error('Failed to create signed URL for document.');
  }
  return data.signedUrl;
};

const invokeExtraction = async (
  fileName: string,
  rawText: string,
  imageUrl?: string,
): Promise<ExtractDocumentResponse> => {
  const { data, error } = await supabase.functions.invoke<ExtractDocumentResponse>('document-extract', {
    body: {
      fileName,
      rawText,
      imageUrl,
    },
  });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to extract document details.');
  }

  return data;
};

export const ensureDocumentExtraction = async (
  documentId: string,
): Promise<DocumentPlanningContext> => {
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error || !document) {
    throw error || new Error('Document not found.');
  }

  const existingText = (document.extracted_text || '').trim();
  const metadata = document.extracted_metadata || {};
  if (existingText) {
    return {
      id: document.id,
      file_name: getFileName(document.file_path),
      extracted_text: existingText,
      extracted_title: document.extracted_title,
      extracted_due_date: document.extracted_due_date,
      extraction_confidence: document.extraction_confidence,
      metadata,
    };
  }

  const signedUrl = await getSignedDocumentUrl(document.file_path);
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error('Failed to download uploaded document.');
  }

  const blob = await response.blob();
  const rawText = await extractRawText(document.file_path, blob);
  const extracted = await invokeExtraction(
    getFileName(document.file_path),
    rawText,
    rawText ? undefined : isImageFile(document.file_path) ? signedUrl : undefined,
  );

  const extractedText = truncateText(extracted.extracted_text || rawText);
  const extractedMetadata = extracted.metadata || {};

  const { error: updateError } = await supabase
    .from('documents')
    .update({
      extracted_text: extractedText,
      extracted_metadata: extractedMetadata,
      extracted_title: extracted.suggested_title || document.extracted_title,
      extracted_due_date: extracted.suggested_due_date || document.extracted_due_date,
      extraction_confidence: extracted.confidence ?? document.extraction_confidence ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', document.id);

  if (updateError) {
    throw updateError;
  }

  return {
    id: document.id,
    file_name: getFileName(document.file_path),
    extracted_text: extractedText,
    extracted_title: extracted.suggested_title || document.extracted_title,
    extracted_due_date: extracted.suggested_due_date || document.extracted_due_date,
    extraction_confidence: extracted.confidence ?? document.extraction_confidence ?? 0,
    metadata: extractedMetadata,
  };
};

export const ensureTaskDocumentsExtracted = async (
  taskId: string,
): Promise<DocumentPlanningContext[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return Promise.all((data || []).map((document) => ensureDocumentExtraction(document.id)));
};