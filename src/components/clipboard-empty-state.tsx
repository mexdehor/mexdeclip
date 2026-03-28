import { SearchX, ClipboardPaste } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const EmptyState = ({ isSearching = false }: { isSearching?: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          {isSearching ? (
            <>
              <SearchX className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No matching items found.
              </p>
            </>
          ) : (
            <>
              <ClipboardPaste className="size-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm text-muted-foreground">
                  No clipboard history yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Copy something to start tracking your clipboard!
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
