import { useState, useRef } from 'react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import { fileUploadApi } from '../../services/api';
import config from '../../config';

interface DocumentCellProps {
    value: string | null | undefined;
    onUpdate: (documents: string) => Promise<void>;
    apiBaseUrl?: string;
    onPreview?: (url: string, title: string) => void;
}

export const DocumentCell: React.FC<DocumentCellProps> = ({
    value,
    onUpdate,
    apiBaseUrl = config.API_URL,
    onPreview,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputFiles = e.target.files;
        if (!inputFiles || inputFiles.length === 0) return;

        setIsUploading(true);
        try {
            const response = await fileUploadApi.uploadSingle(inputFiles[0]);
            await onUpdate(response.path);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getProxiedUrl = (url: string) => {
        if (!url) return '';

        // If it's already a proxied path or doesn't start with http, prepend API base
        if (!url.startsWith('http')) {
            // Handle case where just a filename is stored (e.g., from old incorrect implementation)
            if (!url.startsWith('/api/uploads/')) {
                // If it's just a filename, convert it to the proper path format
                const filename = url.startsWith('uploads/') ? url.replace('uploads/', '') : url;
                return `${apiBaseUrl}/api/uploads/${filename}`;
            }
            return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        }

        // If it's a direct S3 URL, convert it to our proxy URL
        if (url.includes('s3.amazonaws.com')) {
            try {
                const urlObj = new URL(url);
                // Extract key (remove leading slash)
                const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
                // Prepend our API proxy base
                return `${apiBaseUrl}/api/uploads/${key.split('/').pop()}`;
            } catch (e) {
                return url;
            }
        }

        return url;
    };

    const handleViewFile = (fileUrl: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onPreview) return;
        onPreview(getProxiedUrl(fileUrl), 'Document');
    };

    const handleDeleteFile = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (value) {
            await fileUploadApi.deleteFile(value);
        }
        await onUpdate('');
    };

    const handleUploadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    if (!value || value.trim() === '') {
        return (
            <div className="flex items-center gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                />
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="p-1 bg-gray-50 text-gray-600 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors group flex items-center gap-0.5 disabled:opacity-50 cursor-cell"
                    title="Upload document"
                >
                    {isUploading ? (
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                    ) : (
                        <Upload size={14} className="group-hover:translate-y-[-1px] transition-transform" />
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center min-w-[40px]">
            <div className="relative group/file">
                <button
                    onClick={(e) => handleViewFile(value, e)}
                    className="p-1 bg-blue-50 text-blue-600 rounded border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-all cursor-cell shadow-sm"
                    title="View document"
                >
                    <FileText size={14} />
                </button>
                <button
                    onClick={handleDeleteFile}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center justify-center shadow-md z-10 hover:bg-red-600"
                    style={{ width: '14px', height: '14px', fontSize: '8px' }}
                    title="Remove document"
                >
                    ✕
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
            />
        </div>
    );
};
