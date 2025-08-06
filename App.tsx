import React, { useState, useCallback } from 'react';
import { Bank, EntityOption, Transaction } from './types.ts';
import { BANKS, ENTITY_OPTIONS } from './constants.ts';
import { extractTransactions } from './services/geminiService.ts';
import ResultsTable from './components/ResultsTable.tsx';
import { ProcessIcon, DownloadIcon, SpinnerIcon, FileUploadIcon } from './components/Icons.tsx';

type InputMode = 'text' | 'file';

function App() {
  const [bank, setBank] = useState<Bank>(Bank.POPULAR);
  const [entity, setEntity] = useState<EntityOption>(EntityOption.GVAL);
  const [statementText, setStatementText] = useState<string>('');
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.type !== "application/pdf") {
            setError("Please upload a PDF file.");
            setStatementFile(null);
            return;
        }
        setStatementFile(file);
        setStatementText(""); // Clear text input
        setError(null);
    }
  };

  const handleProcessStatement = useCallback(async () => {
    const input = inputMode === 'file' ? statementFile : statementText.trim();
    if (!input) {
      setError(`Please ${inputMode === 'file' ? 'upload a file' : 'paste the statement text'}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTransactions([]);

    try {
      const result = await extractTransactions(input, bank);
      setTransactions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [statementText, statementFile, inputMode, bank]);

  const handleExportCsv = useCallback(() => {
    if (transactions.length === 0) {
      setError("No transactions to export.");
      return;
    }

    const header = "Fecha|Detalle|Movimiento|Saldo|Entidad";
    const rows = transactions.map(t => {
      // Format numbers with comma as decimal separator, no thousand separators for CSV
      const movement = t.movement.toFixed(2).replace('.', ',');
      const balance = t.balance.toFixed(2).replace('.', ',');
      // Quote detail and escape internal quotes to create a valid CSV
      const detail = `"${t.detail.replace(/"/g, '""')}"`;
      return [t.date, detail, movement, balance, entity].join('|');
    });

    const csvContent = [header, ...rows].join('\n');
    // Add BOM for better Excel compatibility
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `extracto_${bank.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [transactions, entity, bank]);
  
  const isProcessDisabled = isLoading || (inputMode === 'text' && !statementText.trim()) || (inputMode === 'file' && !statementFile);

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Extractor Bancario</h1>
          <p className="text-gray-600 mt-1">Extraiga datos de extractos bancarios usando IA</p>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Configuración</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="bank-select" className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <select
                    id="bank-select"
                    value={bank}
                    onChange={(e) => setBank(e.target.value as Bank)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="entity-select" className="block text-sm font-medium text-gray-700 mb-1">Entidad (para exportar)</label>
                  <select
                    id="entity-select"
                    value={entity}
                    onChange={(e) => setEntity(e.target.value as EntityOption)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                  >
                    {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Cargar Extracto</h2>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => { setInputMode('text'); setStatementFile(null); setError(null);}} className={`${inputMode === 'text' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
                            Pegar Texto
                        </button>
                        <button onClick={() => { setInputMode('file'); setStatementText(''); setError(null); }} className={`${inputMode === 'file' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
                            Subir PDF
                        </button>
                    </nav>
                </div>
                
                <div className="mt-4">
                  {inputMode === 'text' ? (
                      <div>
                          <label htmlFor="statement-text" className="sr-only">Statement Text</label>
                          <textarea
                              id="statement-text"
                              value={statementText}
                              onChange={(e) => setStatementText(e.target.value)}
                              placeholder="Pegue el texto del extracto bancario aquí..."
                              className="w-full h-48 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs font-mono"
                          />
                      </div>
                  ) : (
                      <div>
                          {statementFile ? (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50 text-sm">
                                  <span className="font-mono text-gray-700 truncate" aria-label="Selected file">{statementFile.name}</span>
                                  <button onClick={() => setStatementFile(null)} className="text-red-600 hover:text-red-800 ml-4 flex-shrink-0 font-bold p-1" title="Remove file">
                                      &times;
                                  </button>
                            </div>
                          ) : (
                             <div className="mt-1">
                                <label htmlFor="file-upload" className="relative cursor-pointer flex w-full justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 hover:border-blue-400 transition-colors">
                                      <div className="space-y-1 text-center">
                                        <FileUploadIcon />
                                        <div className="flex text-sm text-gray-600">
                                            <span className="font-medium text-blue-600">
                                                Subir archivo
                                            </span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="application/pdf" />
                                            <p className="pl-1">o arrastrar y soltar</p>
                                        </div>
                                        <p className="text-xs text-gray-500">Solo PDF</p>
                                    </div>
                                </label>
                            </div>
                          )}
                      </div>
                  )}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Acciones</h2>
                <div className="flex flex-col space-y-3">
                    <button
                        onClick={handleProcessStatement}
                        disabled={isProcessDisabled}
                        className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <SpinnerIcon /> : <ProcessIcon />}
                        {isLoading ? 'Procesando...' : 'Procesar Extracto'}
                    </button>
                    <button
                        onClick={handleExportCsv}
                        disabled={transactions.length === 0 || isLoading}
                        className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <DownloadIcon />
                        Exportar a CSV
                    </button>
                </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-8">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            <div className="h-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <ResultsTable transactions={transactions} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;