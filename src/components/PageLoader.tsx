import { Loader2 } from 'lucide-react';

export const PageLoader = () => {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading experience...</p>
            </div>
        </div>
    );
};
