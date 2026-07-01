import { History, ListChecks, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { AiHistoryPage } from './AiHistoryPage';
import { AiSettingsPage } from './AiSettingsPage';
import { AiTestGeneratorPage } from './AiTestGeneratorPage';

export type AiTestGeneratorTab = 'generate' | 'history' | 'settings';

type AiTestGeneratorModulePageProps = {
  initialTab?: AiTestGeneratorTab;
};

const tabs: Array<{
  id: AiTestGeneratorTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'generate', label: 'Gerar Testes', icon: ListChecks },
  { id: 'history', label: 'Historico', icon: History },
  { id: 'settings', label: 'Configuracoes', icon: Settings },
];

export function AiTestGeneratorModulePage({
  initialTab = 'generate',
}: AiTestGeneratorModulePageProps) {
  const [activeTab, setActiveTab] = useState<AiTestGeneratorTab>(initialTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            AI Test Generator
          </h1>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'generate' ? <AiTestGeneratorPage embedded /> : null}
      {activeTab === 'history' ? <AiHistoryPage embedded /> : null}
      {activeTab === 'settings' ? <AiSettingsPage embedded /> : null}
    </div>
  );
}
