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
    const files = value ? value.split(',').filter(f => f.trim()) : [];

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

    const handleViewFile = (fileUrl: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onPreview) return;
        onPreview(`${apiBaseUrl}${fileUrl}`, 'Document');
    };

    const handleDeleteFile = async (e: React.MouseEvent) => {
        e.stopPropagation();
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
                    className="p-1 px-2.5 bg-gray-50 text-gray-600 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors group flex items-center gap-1.5 disabled:opacity-50 cursor-cell"
                    title="Upload document"
                >
                    {isUploading ? (
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                    ) : (
                        <Upload size={14} className="group-hover:translate-y-[-1px] transition-transform" />
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                        {isUploading ? '...' : 'Docs'}
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center min-w-[40px]">
            <div className="relative group/file">
                <button
                    onClick={(e) => handleViewFile(value, e)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-all cursor-cell shadow-sm"
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
