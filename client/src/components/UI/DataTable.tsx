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
    compact?: boolean;
    highlightInfo?: {
        rowId: string | number;
        columnKey?: string;
    } | null;
}

export function DataTable<TData>({ columns, data, onEdit, compact = false, highlightInfo }: DataTableProps<TData>) {
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [copiedCell, setCopiedCell] = useState<{ row: number; col: number } | null>(null);

    // Handle Copy
    React.useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCell) {
                e.preventDefault();
                // Find the cell element
                const cellElement = document.querySelector(`[data-cell-id="${selectedCell.row}-${selectedCell.col}"]`);
                if (cellElement) {
                    // Try to get text content, removing extra whitespace
                    let cellValue = cellElement.textContent?.trim() || '';

                    // If the cell contains an EditableCell or other nested component,
                    // try to get the display value from the inner div
                    const displayDiv = cellElement.querySelector('.absolute.inset-0');
                    if (displayDiv) {
                        cellValue = displayDiv.textContent?.trim() || cellValue;
                    }

                    // Remove any extra whitespace and newlines
                    cellValue = cellValue.replace(/\s+/g, ' ').trim();

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

    // Handle Highlighting
    React.useEffect(() => {
        if (highlightInfo && data.length > 0) {
            const { rowId, columnKey } = highlightInfo;
            const rowIndex = data.findIndex((item: any) => String(item.id) === String(rowId));

            if (rowIndex !== -1) {
                // Find column index
                let colIndex = 0;
                if (columnKey) {
                    colIndex = columns.findIndex((col: any) => col.accessorKey === columnKey);
                    if (colIndex === -1) colIndex = 0;
                }

                // Wait for the table to render
                setTimeout(() => {
                    // Scroll target cell into view
                    const targetCellIdentifier = `[data-cell-id="${rowIndex}-${colIndex}"]`;
                    const targetCellElement = document.querySelector(targetCellIdentifier) as HTMLElement;

                    if (targetCellElement) {
                        targetCellElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    }

                    // Highlight entire column using attribute selector suffix
                    const columnCells = document.querySelectorAll(`[data-cell-id$="-${colIndex}"]`);
                    columnCells.forEach((cell) => {
                        cell.classList.add('animate-cue-shining');
                    });

                    // Set as selected cell for focus
                    setSelectedCell({ row: rowIndex, col: colIndex });

                    // Remove effect after animation completes (0.8s * 3 = 2.4s)
                    setTimeout(() => {
                        columnCells.forEach((cell) => {
                            cell.classList.remove('animate-cue-shining');
                        });
                    }, 2500);
                }, 300);
            }
        }
    }, [highlightInfo, data, columns]);

    const handleCellClick = (rowIndex: number, colIndex: number) => {
        if (selectedCell?.row === rowIndex && selectedCell?.col === colIndex) {
            setSelectedCell(null); // Unselect
        } else {
            setSelectedCell({ row: rowIndex, col: colIndex }); // Select
        }
    };

    return (
        <div className="w-full overflow-auto">
            <table className="w-full border-collapse" style={{ fontFamily: "'Segoe UI', Calibri, Arial, sans-serif", tableLayout: 'auto' }}>
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header, colIndex) => (
                                <th
                                    key={header.id}
                                    className={`text-xs font-semibold text-left whitespace-nowrap ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}
                                    style={{
                                        background: 'var(--table-header-bg)',
                                        color: 'var(--table-header-text)',
                                        borderRight: colIndex < headerGroup.headers.length - 1 ? '1px solid var(--table-header-border)' : 'none',
                                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                                        boxShadow: 'inset 0 -2px 0 rgba(218, 165, 32, 0.9)',
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
                                className="transition-colors"
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
                                                const target = e.target as HTMLElement;

                                                // Don't select if clicking on buttons or interactive elements
                                                if (target.tagName === 'BUTTON' || target.closest('button')) {
                                                    return;
                                                }

                                                // Don't select if clicking on input elements
                                                if (target.tagName === 'INPUT' || target.closest('input')) {
                                                    return;
                                                }

                                                // Don't select if clicking on select elements
                                                if (target.tagName === 'SELECT' || target.closest('select')) {
                                                    return;
                                                }

                                                // Handle cell selection
                                                handleCellClick(rowIndex, colIndex);
                                            }}
                                            className={`text-xs transition-all relative ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}
                                            style={{
                                                borderRight: '1px solid #e0d5c7',
                                                borderBottom: '1px solid #e0d5c7',
                                                cursor: 'cell',
                                                outline: isCopied ? '2px solid #22c55e' : (isSelected ? '2px solid #DAA520' : 'none'),
                                                outlineOffset: '-2px',
                                                background: isCopied ? 'rgba(34, 197, 94, 0.2)' : (isSelected ? 'rgba(218, 165, 32, 0.15)' : undefined),
                                                color: '#5D4037',
                                                userSelect: 'none', // Prevent native text selection to use ours
                                                transition: 'background-color 0.2s, outline-color 0.2s',
                                                position: 'relative', // Ensure absolute children are positioned relative to this cell
                                                overflow: 'hidden', // Prevent content from expanding cell
                                                minWidth: 0 // Allow cell to shrink if needed
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
