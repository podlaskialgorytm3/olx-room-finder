"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceVsDistrictPanel } from "@/components/analysis/price-vs-district-panel";
import { OutliersPanel } from "@/components/analysis/outliers-panel";
import { InitialCostPanel } from "@/components/analysis/initial-cost-panel";
import { ValueScorePanel } from "@/components/analysis/value-score-panel";

export default function AnalysisPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zaawansowana analiza</h1>
        <p className="mt-1 text-muted-foreground">
          Głębsza analiza cen: porównania z medianą dzielnicy, nietypowe oferty, koszt wejścia i wskaźnik opłacalności.
        </p>
      </div>

      <Tabs defaultValue="price-vs-district">
        <TabsList>
          <TabsTrigger value="price-vs-district">Koszt całkowity vs dzielnica</TabsTrigger>
          <TabsTrigger value="outliers">Outliers</TabsTrigger>
          <TabsTrigger value="initial-cost">Koszt wejścia</TabsTrigger>
          <TabsTrigger value="value">Value score</TabsTrigger>
        </TabsList>
        <TabsContent value="price-vs-district">
          <PriceVsDistrictPanel />
        </TabsContent>
        <TabsContent value="outliers">
          <OutliersPanel />
        </TabsContent>
        <TabsContent value="initial-cost">
          <InitialCostPanel />
        </TabsContent>
        <TabsContent value="value">
          <ValueScorePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
