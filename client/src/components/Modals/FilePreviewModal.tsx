import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl?: string; // This expects a full URL (http://localhost:3001/uploads/...)
    title?: string;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, fileUrl, title = 'File Preview' }) => {
    if (!isOpen || !fileUrl) return null;

    const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
    const isPdf = fileUrl.match(/\.pdf$/i);

    return (
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
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors"
                                title="Open in new tab"
                            >
                                <ExternalLink size={20} />
                            </a>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
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
                            />
                        ) : isPdf ? (
                            <iframe
                                src={fileUrl}
                                className="w-full h-[70vh] bg-white rounded-lg shadow-sm border border-gray-200"
                                title="PDF Preview"
                            />
                        ) : (
                            <div className="text-center p-12 bg-white rounded-xl shadow-sm">
                                <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Download size={32} />
                                </div>
                                <h4 className="text-lg font-medium text-gray-900 mb-2">File type not supported for preview</h4>
                                <p className="text-gray-500 mb-6">You can download or view this file externally.</p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/25"
                                >
                                    <Download size={18} />
                                    Download File
                                </a>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FilePreviewModal;
