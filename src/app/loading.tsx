import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <Skeleton className="h-12 w-96 mx-auto" />
          <Skeleton className="h-6 w-80 mx-auto mt-4" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
                <Skeleton className="h-10 w-full mt-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8 md:mt-0 flex flex-col">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-72 mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <Skeleton className="flex-grow w-full min-h-[300px]" />
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
