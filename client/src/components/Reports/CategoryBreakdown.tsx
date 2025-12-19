import { clsx } from 'clsx';

interface CategoryItem {
    name: string;
    value: number; // Percentage or absolute
    displayValue: string;
    color: string; // Tailwind bg color class
    icon?: React.ReactNode;
}

interface BreakdownCardProps {
    title: string;
    items: CategoryItem[];
}

const CategoryBreakdown = ({ title, items }: BreakdownCardProps) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[var(--dark-brown)] mb-6">{title}</h3>
            <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                {item.icon}
                                {item.name}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{item.displayValue}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={clsx("h-2.5 rounded-full", item.color)}
                                style={{ width: `${item.value}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryBreakdown;
