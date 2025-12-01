
import React, { useState, useEffect } from 'react';
import { AppSettings, Toast, Language } from '../types';
import { fetchOpenRouterModels } from '../services/ai';
import { RefreshCw, Terminal, Save, Database, AlertCircle, Globe, Mic } from './Icons';
import { createDynamicClient } from '../lib/supabase';
import { translations } from '../lib/translations';

interface Props {
  settings: AppSettings;
  onUpdate: (settings: Partial<AppSettings>) => void;
  showToast: (msg: string, type: 'SUCCESS' | 'ERROR' | 'INFO') => void;
}

export const SettingsView: React.FC<Props> = ({ settings, onUpdate, showToast }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [dbTestStatus, setDbTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  
  // Ensure we have a valid language, default to 'en'
  const lang = localSettings.language || 'en';
  const t = translations[lang];

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onUpdate(localSettings);
    showToast('Settings saved successfully', 'SUCCESS');
  };

  const loadModels = async () => {
    setIsLoadingModels(true);
    const models = await fetchOpenRouterModels();
    if (models.length > 0) {
      const newSettings = { ...localSettings, availableModels: models };
      setLocalSettings(newSettings);
      onUpdate(newSettings); 
      showToast(`Fetched ${models.length} models`, 'SUCCESS');
    } else {
      showToast('Failed to fetch models', 'ERROR');
    }
    setIsLoadingModels(false);
  };

  const testDbConnection = async () => {
      setDbTestStatus('TESTING');
      const client = createDynamicClient(
        localSettings.supabaseUrl || '', 
        localSettings.supabaseKey || '',
        localSettings.supabaseSchema || 'public'
      );
      
      if (!client) {
          setDbTestStatus('FAILED');
          showToast('Invalid URL or Key format', 'ERROR');
          return;
      }
      
      const { error } = await client.from('projects').select('count', { count: 'exact', head: true });
      
      if (error) {
          console.error(error);
          setDbTestStatus('FAILED');
          showToast(`Connection failed: ${error.message}. Schema '${localSettings.supabaseSchema}'?`, 'ERROR');
      } else {
          setDbTestStatus('SUCCESS');
          showToast('Connected to Supabase!', 'SUCCESS');
      }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
        <p className="text-textMuted">Configure your AI assistant and environment.</p>
      </div>

      <div className="bg-surface p-6 rounded-xl border border-border space-y-6">
        
        {/* Language */}
        <div className="p-5 bg-surfaceHighlight/30 border border-border rounded-lg flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Globe className="text-primary" size={20}/>
             <div>
                <h4 className="text-sm font-bold text-text">Language / Idioma</h4>
                <p className="text-xs text-textMuted">Select interface language</p>
             </div>
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => setLocalSettings({ ...localSettings, language: 'en' })}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${localSettings.language === 'en' ? 'bg-primary text-white' : 'bg-background text-textMuted hover:text-text'}`}
              >
                English
              </button>
              <button 
                 onClick={() => setLocalSettings({ ...localSettings, language: 'pt' })}
                 className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${localSettings.language === 'pt' ? 'bg-primary text-white' : 'bg-background text-textMuted hover:text-text'}`}
              >
                Português
              </button>
           </div>
        </div>

        {/* User Info & Keys */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-2">User Name</label>
            <input
              type="text"
              value={localSettings.userName}
              onChange={e => setLocalSettings({ ...localSettings, userName: e.target.value })}
              className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-2">OpenRouter API Key</label>
            <input
              type="password"
              value={localSettings.openRouterKey}
              onChange={e => setLocalSettings({ ...localSettings, openRouterKey: e.target.value })}
              placeholder="sk-or-..."
              className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-2 flex items-center gap-1">
                <Mic size={12}/> Groq API Key (For Audio)
            </label>
            <input
              type="password"
              value={localSettings.groqApiKey || ''}
              onChange={e => setLocalSettings({ ...localSettings, groqApiKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary"
            />
          </div>
        </div>
        
        {/* Supabase Config */}
        <div className="p-5 bg-surfaceHighlight/30 border border-border rounded-lg space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Database className="text-primary" size={20} />
                <h4 className="text-sm font-bold text-text">Database Configuration (Supabase)</h4>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-textMuted uppercase mb-2">Project URL</label>
                    <input
                      type="text"
                      value={localSettings.supabaseUrl || ''}
                      onChange={e => setLocalSettings({ ...localSettings, supabaseUrl: e.target.value })}
                      className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-2">Anon Key (Public)</label>
                        <input
                        type="password"
                        value={localSettings.supabaseKey || ''}
                        onChange={e => setLocalSettings({ ...localSettings, supabaseKey: e.target.value })}
                        className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-2">Database Schema</label>
                        <input
                        type="text"
                        value={localSettings.supabaseSchema || ''}
                        onChange={e => setLocalSettings({ ...localSettings, supabaseSchema: e.target.value })}
                        className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary placeholder-textMuted/30"
                        />
                    </div>
                 </div>
             </div>
             
             <div className="flex items-center justify-between pt-2">
                 <p className="text-xs text-textMuted">Leave empty to use Offline Mode (LocalStorage).</p>
                 <button 
                    onClick={testDbConnection}
                    disabled={dbTestStatus === 'TESTING' || !localSettings.supabaseUrl}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                        dbTestStatus === 'SUCCESS' ? 'bg-green-500/20 text-green-500' :
                        dbTestStatus === 'FAILED' ? 'bg-red-500/20 text-red-500' :
                        'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                 >
                     {dbTestStatus === 'TESTING' ? 'Testing...' : dbTestStatus === 'SUCCESS' ? 'Connection OK' : 'Test Connection'}
                 </button>
             </div>
        </div>

        {/* Data Management */}
        <div className="p-5 bg-surfaceHighlight/30 border border-border rounded-lg space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Database className="text-blue-400" size={20} />
                <h4 className="text-sm font-bold text-text">Data Management</h4>
             </div>
             <div className="flex gap-4">
                <button 
                    onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage.getItem('devcontext_pro_db_v6')));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href",     dataStr);
                        downloadAnchorNode.setAttribute("download", "devcontext_backup.json");
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                    }}
                    className="px-4 py-2 bg-surface border border-border rounded hover:bg-surfaceHighlight text-xs"
                >
                    Download Backup (JSON)
                </button>
                <button 
                    onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.readAsText(file);
                            reader.onload = (readerEvent) => {
                                const content = readerEvent.target?.result as string;
                                try {
                                    const parsed = JSON.parse(content); 
                                    // This is a rough import, assuming direct storage dump format
                                    // In production, use services/storage.ts importData
                                    if(parsed) {
                                        localStorage.setItem('devcontext_pro_db_v6', JSON.parse(content)); 
                                        window.location.reload();
                                    }
                                } catch (e) { alert("Invalid JSON"); }
                            }
                        }
                        input.click();
                    }}
                    className="px-4 py-2 bg-surface border border-border rounded hover:bg-surfaceHighlight text-xs"
                >
                    Import Backup (JSON)
                </button>
             </div>
        </div>

        {/* Models */}
        <div className="border-t border-border pt-6">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-xs font-bold text-textMuted uppercase">AI Model Selection</label>
            <button onClick={loadModels} disabled={isLoadingModels} className="text-xs text-primary flex items-center gap-1 hover:underline">
              <RefreshCw size={12} className={isLoadingModels ? 'animate-spin' : ''} /> Refresh Models
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <select
                value={localSettings.defaultModel}
                onChange={e => setLocalSettings({ ...localSettings, defaultModel: e.target.value })}
                className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none"
              >
                <option value="google/gemini-2.0-flash-001">Google: Gemini 2.0 Flash</option>
                <option value="anthropic/claude-3-haiku">Anthropic: Claude 3 Haiku</option>
                <option value="openai/gpt-4o-mini">OpenAI: GPT-4o Mini</option>
                {localSettings.availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Or type model ID manually..."
                value={localSettings.defaultModel}
                onChange={e => setLocalSettings({ ...localSettings, defaultModel: e.target.value })}
                className="w-full bg-background border border-border p-3 rounded-lg text-sm text-text outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="border-t border-border pt-6">
          <label className="block text-xs font-bold text-textMuted uppercase mb-2 flex items-center gap-2">
            <Terminal size={14} /> Custom System Prompt
          </label>
          <textarea
            value={localSettings.customSystemPrompt}
            onChange={e => setLocalSettings({ ...localSettings, customSystemPrompt: e.target.value })}
            className="w-full h-64 bg-[#0d1117] border border-border rounded-lg p-4 font-mono text-xs text-gray-300 outline-none resize-none"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-primary hover:bg-primaryHover text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-primary/20 flex items-center gap-2 transition-all">
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
