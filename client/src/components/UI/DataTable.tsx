import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from '@tanstack/react-table';
import React, { useState } from 'react';

interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    onEdit?: (data: TData) => void;
}

export function DataTable<TData>({ columns, data, onEdit }: DataTableProps<TData>) {
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [copiedCell, setCopiedCell] = useState<{ row: number; col: number } | null>(null);

    // Handle Copy
    React.useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCell) {
                // Find the cell content
                const cellValue = document.querySelector(`[data-cell-id="${selectedCell.row}-${selectedCell.col}"]`)?.textContent;
                if (cellValue) {
                    try {
                        await navigator.clipboard.writeText(cellValue);
                        setCopiedCell(selectedCell);
                        setTimeout(() => setCopiedCell(null), 500); // Reset after 500ms
                    } catch (err) {
                        console.error('Failed to copy: ', err);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const handleCellClick = (rowIndex: number, colIndex: number) => {
        if (selectedCell?.row === rowIndex && selectedCell?.col === colIndex) {
            setSelectedCell(null); // Unselect
        } else {
            setSelectedCell({ row: rowIndex, col: colIndex }); // Select
        }
    };

    return (
        <div className="w-full overflow-auto">
            <table className="w-full border-collapse" style={{ fontFamily: "'Segoe UI', Calibri, Arial, sans-serif" }}>
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header, colIndex) => (
                                <th
                                    key={header.id}
                                    className="text-white text-xs font-semibold text-left px-3 py-2.5 whitespace-nowrap"
                                    style={{
                                        background: 'linear-gradient(180deg, #DAA520 0%, #B8860B 100%)',
                                        borderRight: colIndex < headerGroup.headers.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                                        borderBottom: '2px solid #8B6914',
                                        minWidth: colIndex === 0 ? '40px' : '100px'
                                    }}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="text-center py-12 text-gray-400"
                                style={{ background: '#fdf9f3' }}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-4xl">📋</span>
                                    <span>No data available</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        table.getRowModel().rows.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                onDoubleClick={(e) => {
                                    e.stopPropagation(); // Prevent text selection or other bubbling issues
                                    onEdit && onEdit(row.original);
                                }}
                                className={`transition-colors ${onEdit ? 'cursor-pointer hover:bg-orange-50' : ''}`}
                                title={onEdit ? 'Double-click to edit' : undefined}
                                style={{
                                    background: rowIndex % 2 === 0 ? '#ffffff' : '#fdf9f3'
                                }}
                            >
                                {row.getVisibleCells().map((cell, colIndex) => {
                                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                                    const isCopied = copiedCell?.row === rowIndex && copiedCell?.col === colIndex;

                                    return (
                                        <td
                                            key={cell.id}
                                            data-cell-id={`${rowIndex}-${colIndex}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCellClick(rowIndex, colIndex);
                                            }}
                                            className="text-xs px-3 py-2 transition-all relative"
                                            style={{
                                                borderRight: '1px solid #e8ddd0',
                                                borderBottom: '1px solid #e8ddd0',
                                                cursor: 'cell',
                                                outline: isCopied ? '2px solid #22c55e' : (isSelected ? '2px solid #DAA520' : 'none'),
                                                outlineOffset: '-2px',
                                                background: isCopied ? 'rgba(34, 197, 94, 0.2)' : (isSelected ? 'rgba(218, 165, 32, 0.15)' : undefined),
                                                color: '#5D4037',
                                                userSelect: 'none', // Prevent native text selection to use ours
                                                transition: 'background-color 0.2s, outline-color 0.2s'
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            {isCopied && (
                                                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
