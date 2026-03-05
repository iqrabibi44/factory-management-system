// Skeleton loading components — light theme version
export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
    <div className="card overflow-hidden">
        <div className="animate-pulse">
            {/* Header */}
            <div className="flex gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-3 bg-slate-200 rounded flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 px-4 py-3.5 border-b border-slate-100">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className={`h-3.5 bg-slate-100 rounded flex-1 ${c === 0 ? 'max-w-[120px]' : ''}`} />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonCard = () => (
    <div className="card p-5 animate-pulse space-y-3">
        <div className="h-36 bg-slate-100 rounded-xl" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
    </div>
);
