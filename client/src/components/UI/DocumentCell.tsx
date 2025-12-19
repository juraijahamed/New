import { useState, useRef } from 'react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import { fileUploadApi } from '../../services/api';

interface DocumentCellProps {
    value: string | null | undefined;
    onUpdate: (documents: string) => Promise<void>;
    apiBaseUrl?: string;
    onPreview?: (url: string, title: string) => void;
    multiple?: boolean;
}

export const DocumentCell: React.FC<DocumentCellProps> = ({
    value,
    onUpdate,
    apiBaseUrl = 'http://localhost:3001',
    onPreview,
    multiple = false,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            if (multiple) {
                const fileArray = Array.from(files);
                const response = await fileUploadApi.uploadMultiple(fileArray);
                const paths = response.files.map(f => f.path);
                const existingDocs = value ? value.split(',').filter(f => f.trim()) : [];
                const newDocs = [...existingDocs, ...paths].join(',');
                await onUpdate(newDocs);
            } else {
                const response = await fileUploadApi.uploadSingle(files[0]);
                await onUpdate(response.path);
            }
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

    const handleViewClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!value || !onPreview) return;
        
        const files = value.split(',').filter(f => f.trim());
        const firstFile = files[0]?.trim();
        if (firstFile) {
            onPreview(
                `${apiBaseUrl}${firstFile}`,
                files.length > 1 ? `Documents (${files.length} files)` : 'Document'
            );
        }
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
                    multiple={multiple}
                    onChange={handleFileChange}
                />
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors group flex items-center gap-1 disabled:opacity-50"
                    title="Upload document"
                >
                    {isUploading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Upload size={16} />
                    )}
                    <span className="text-xs font-medium">
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </span>
                </button>
            </div>
        );
    }

    const files = value.split(',').filter(f => f.trim());
    const fileCount = files.length;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleViewClick}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors group flex items-center gap-1"
                title={fileCount > 1 ? `View ${fileCount} documents` : "View Document"}
            >
                <FileText size={16} />
                <span className="text-xs font-medium">
                    {fileCount > 1 ? `${fileCount} files` : 'View'}
                </span>
            </button>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple={multiple}
                onChange={handleFileChange}
            />
            <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors group flex items-center gap-1 disabled:opacity-50"
                title="Add more documents"
            >
                {isUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Upload size={14} />
                )}
            </button>
        </div>
    );
};
