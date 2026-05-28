'use client';

import React from 'react';
import { Server, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ForwardContractsView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Server className="h-6 w-6 text-emerald-600" />
            Forward Contracts
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Manage forward credit contracts and pricing</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Forward contract data will be available after configuration.
        </CardContent>
      </Card>
    </div>
  );
}
