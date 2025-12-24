import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from '@tanstack/react-table';
import React, { useState, useRef, useEffect } from 'react';

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

export function DataTable<TData>({ columns, data, compact = false, highlightInfo }: DataTableProps<TData>) {
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [copiedCell, setCopiedCell] = useState<{ row: number; col: number } | null>(null);

    // Virtualization State
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600); // Default estimate

    const ROW_HEIGHT = compact ? 36 : 48;
    const VIRTUALIZATION_THRESHOLD = 200; // Enable virtualization for lists larger than this

    const useVirtualization = data.length > VIRTUALIZATION_THRESHOLD;

    // Handle Scroll for Virtualization
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    // Monitor Container Height
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Handle Copy
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCell) {
                e.preventDefault();
                // Find the cell element using absolute index
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

    // Virtualization Calculations
    const allRows = table.getRowModel().rows;

    let visibleRows = allRows;
    let paddingTop = 0;
    let paddingBottom = 0;

    if (useVirtualization) {
        const totalRows = allRows.length;
        const totalHeight = totalRows * ROW_HEIGHT;

        const overscan = 10;
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
        const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + (overscan * 2);
        const endIndex = Math.min(totalRows, startIndex + visibleCount);

        visibleRows = allRows.slice(startIndex, endIndex);
        paddingTop = startIndex * ROW_HEIGHT;
        paddingBottom = Math.max(0, totalHeight - (endIndex * ROW_HEIGHT));
    }

    // Handle Highlighting
    useEffect(() => {
        if (highlightInfo && data.length > 0) {
            const { rowId, columnKey } = highlightInfo;
            // Use loose comparison for IDs
            const rowIndex = data.findIndex((item: any) => String(item.id) === String(rowId));

            if (rowIndex !== -1) {
                // Find column index
                let colIndex = 0;
                if (columnKey) {
                    colIndex = columns.findIndex((col: any) => col.accessorKey === columnKey);
                    if (colIndex === -1) colIndex = 0;
                }

                // Scroll to the row if virtualized
                if (useVirtualization && containerRef.current) {
                    // Center the row
                    const rowTop = rowIndex * ROW_HEIGHT;
                    const halfContainer = containerHeight / 2;
                    containerRef.current.scrollTo({
                        top: Math.max(0, rowTop - halfContainer + (ROW_HEIGHT / 2)),
                        behavior: 'smooth'
                    });
                } else if (!useVirtualization && containerRef.current) {
                    // Native scroll behavior for non-virtualized
                    // Wait for render
                    setTimeout(() => {
                        const targetCell = document.querySelector(`[data-cell-id="${rowIndex}-${colIndex}"]`);
                        if (targetCell) {
                            targetCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }

                // Wait for scroll/render
                setTimeout(() => {
                    // Start Animation
                    const columnCells = document.querySelectorAll(`[data-cell-id$="-${colIndex}"]`);
                    // Note: In virtualized table, only visible cells will be selected
                    columnCells.forEach((cell) => {
                        cell.classList.add('animate-cue-shining');
                    });

                    // Set as selected cell for focus
                    setSelectedCell({ row: rowIndex, col: colIndex });

                    // Remove effect after animation completes
                    setTimeout(() => {
                        columnCells.forEach((cell) => {
                            cell.classList.remove('animate-cue-shining');
                        });
                    }, 2500);
                }, useVirtualization ? 500 : 300); // Slightly longer wait for virtualization
            }
        }
    }, [highlightInfo, data, columns, useVirtualization, ROW_HEIGHT, containerHeight]);

    const handleCellClick = (rowIndex: number, colIndex: number) => {
        if (selectedCell?.row === rowIndex && selectedCell?.col === colIndex) {
            setSelectedCell(null); // Unselect
        } else {
            setSelectedCell({ row: rowIndex, col: colIndex }); // Select
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-auto relative"
            onScroll={handleScroll}
        >
            <table className="w-full border-collapse" style={{ fontFamily: "'Segoe UI', Calibri, Arial, sans-serif", tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-10 shadow-sm">
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
                    {useVirtualization && paddingTop > 0 && (
                        <tr>
                            <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                        </tr>
                    )}

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
                        visibleRows.map((row) => (
                            <tr
                                key={row.id}
                                className="transition-colors"
                                style={{
                                    background: row.index % 2 === 0 ? '#ffffff' : '#fdf9f3',
                                    height: `${ROW_HEIGHT}px`
                                }}
                            >
                                {row.getVisibleCells().map((cell, colIndex) => {
                                    const rowIndex = row.index; // Use absolute index
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
                                                minWidth: 0, // Allow cell to shrink if needed
                                                height: 'inherit' // Ensure cell takes row height
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

                    {useVirtualization && paddingBottom > 0 && (
                        <tr>
                            <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
