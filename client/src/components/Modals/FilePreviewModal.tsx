import React, { useState, useEffect } from 'react';
import { X, Download, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast } from '../UI/Toast';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl?: string; // This expects a full URL (http://localhost:3001/uploads/...)
    title?: string;
    onEdit?: () => void;
    onRemove?: () => void;
    onDownload?: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    isOpen,
    onClose,
    fileUrl,
    title = 'File Preview',
    onEdit,
    onRemove,
    onDownload
}) => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !fileUrl) return null;

    const handleDownload = async () => {
        if (onDownload) {
            onDownload();
            return;
        }

        try {
            // Fetch the file as a blob to force download
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Failed to fetch file');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from URL
            const filename = fileUrl.split('/').pop() || 'file';
            link.download = filename;

            // Force download
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL
            window.URL.revokeObjectURL(url);

            // Show success notification
            setToastMessage(`File downloaded: ${filename}`);
            setShowToast(true);
        } catch (error) {
            console.error('Download error:', error);
            setToastMessage('Failed to download file');
            setShowToast(true);
        }
    };

    const getFileType = (url: string) => {
        const pathOnly = url.split('?')[0];
        const ext = pathOnly.split('.').pop()?.toLowerCase() || '';
        return {
            isImage: ['jpeg', 'jpg', 'gif', 'png', 'webp', 'svg'].includes(ext),
            isPdf: ext === 'pdf'
        };
    };

    const { isImage, isPdf } = getFileType(fileUrl);

    return (
        <>
            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
            <AnimatePresence>
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                {title}
                            </h3>
                            <div className="flex items-center gap-2">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                        className="p-2 hover:bg-blue-50 rounded-full text-gray-500 hover:text-blue-600 transition-colors"
                                        title="Edit document"
                                    >
                                        <Edit size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload();
                                    }}
                                    className="p-2 hover:bg-green-50 rounded-full text-gray-500 hover:text-green-600 transition-colors"
                                    title="Download"
                                >
                                    <Download size={20} />
                                </button>
                                {onRemove && (
                                    <button
                                        onClick={onRemove}
                                        className="p-2 hover:bg-red-50 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                                        title="Remove document"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center min-h-[300px]">
                            {isImage ? (
                                <img
                                    src={fileUrl}
                                    alt="Preview"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : isPdf ? (
                                <iframe
                                    src={fileUrl}
                                    className="w-full h-[70vh] bg-white rounded-lg shadow-sm border border-gray-200"
                                    title="PDF Preview"
                                    onError={() => {
                                        console.error('Failed to load PDF');
                                    }}
                                />
                            ) : (
                                <div className="text-center p-12 bg-white rounded-xl shadow-sm">
                                    <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Download size={32} />
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">File type not supported for preview</h4>
                                    <p className="text-gray-500 mb-6">You can download or view this file externally.</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload();
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/25"
                                    >
                                        <Download size={18} />
                                        Download File
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        </>
    );
};

export default FilePreviewModal;
