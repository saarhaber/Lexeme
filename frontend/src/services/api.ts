import { API_BASE_URL } from '../config/api';

export interface Book {
  id: number;
  title: string;
  author: string;
  language: string;
  upload_date: string;
  processing_status: string;
  file_path?: string;
}

export interface UploadResponse {
  book_id: number;
  status: string;
  message: string;
  processing_steps: string[];
}

export class ApiService {
  static async uploadBook(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading file:', file.name, 'Size:', file.size);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/book`, {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          console.error('Upload error response:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  static async getBook(bookId: number): Promise<Book> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`);

    if (!response.ok) {
      throw new Error('Failed to load book data');
    }

    return response.json();
  }

  static async getBookVocabulary(bookId: number) {
    const response = await fetch(`${API_BASE_URL}/vocab/book/${bookId}`);

    if (!response.ok) {
      throw new Error('Failed to load vocabulary data');
    }

    return response.json();
  }
}
