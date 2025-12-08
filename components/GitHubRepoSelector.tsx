import React, { useState, useEffect } from 'react';
import { Github, RefreshCw, Lock, Globe, Search, CheckCircle2, AlertCircle } from './Icons';
import * as GitHubService from '../services/github';

interface Props {
  repo: string;
  branch: string;
  token: string;
  onRepoChange: (repo: string) => void;
  onBranchChange: (branch: string) => void;
  onTokenChange: (token: string) => void;
}

export const GitHubRepoSelector: React.FC<Props> = ({ 
  repo, branch, token, onRepoChange, onBranchChange, onTokenChange 
}) => {
  const [mode, setMode] = useState<'SELECT' | 'MANUAL'>('SELECT');
  const [repos, setRepos] = useState<{ full_name: string; private: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(!!token);

  const loadRepos = async () => {
    if (!token) {
        setError("Please enter a Personal Access Token");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const list = await GitHubService.fetchUserRepos(token);
        setRepos(list);
        setIsVerified(true);
        setMode('SELECT');
    } catch (err) {
        setError("Invalid Token or Network Error");
        setIsVerified(false);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      if (token && repos.length === 0) {
          // Optional: Auto-load if token exists initially? 
          // Let's wait for user action or verify button to avoid spamming API on mount if token is invalid
      }
  }, []);

  const filteredRepos = repos.filter(r => r.full_name.toLowerCase().includes(repo.toLowerCase()) || repo === '');

  return (
    <div className="space-y-4 border border-border rounded-xl p-4 bg-surfaceHighlight/5">
        <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-textMuted uppercase flex items-center gap-2">
                <Github size={14} /> GitHub Integration
            </label>
            <div className="flex gap-2">
                 <button 
                    onClick={() => setMode(mode === 'SELECT' ? 'MANUAL' : 'SELECT')}
                    className="text-[10px] text-primary hover:underline"
                 >
                     {mode === 'SELECT' ? 'Switch to Manual Input' : 'Switch to List Select'}
                 </button>
            </div>
        </div>

        {/* Token Input */}
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"/>
                    <input 
                        type="password" 
                        value={token}
                        onChange={e => { onTokenChange(e.target.value); setIsVerified(false); }}
                        placeholder="Personal Access Token (ghp_...)"
                        className={`w-full bg-background border ${error ? 'border-red-500/50' : 'border-border'} rounded-lg pl-9 pr-3 py-2 text-sm text-text outline-none focus:border-primary transition-all`}
                    />
                </div>
                <button 
                    onClick={loadRepos}
                    disabled={isLoading || !token}
                    className="bg-surfaceHighlight border border-border hover:bg-primary/10 text-textMuted hover:text-text p-2 rounded-lg transition-colors"
                    title="Verify Token & Load Repos"
                >
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""}/>
                </button>
            </div>
            {error && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle size={10}/> {error}</p>}
            <p className="text-[10px] text-textMuted">
                Required for private repos. Generate at GitHub {'>'} Settings {'>'} Developer Settings.
            </p>
        </div>

        {/* Repo Selection */}
        <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
                {mode === 'SELECT' && isVerified && repos.length > 0 ? (
                    <div className="relative">
                         <select 
                            value={repo}
                            onChange={e => onRepoChange(e.target.value)}
                            className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary"
                         >
                             <option value="">Select Repository...</option>
                             {repos.map(r => (
                                 <option key={r.full_name} value={r.full_name}>
                                     {r.private ? '🔒' : '🌎'} {r.full_name}
                                 </option>
                             ))}
                         </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-textMuted">
                             ▼
                         </div>
                    </div>
                ) : (
                    <input 
                        type="text" 
                        value={repo}
                        onChange={e => onRepoChange(e.target.value)}
                        placeholder="username/repo"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />
                )}
            </div>
            
            {/* Branch Input */}
            <div className="col-span-1 relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-xs">Branch:</span>
                 <input 
                    type="text" 
                    value={branch}
                    onChange={e => onBranchChange(e.target.value)}
                    placeholder="main"
                    className="w-full bg-background border border-border rounded-lg pl-14 pr-2 py-2 text-sm text-text outline-none focus:border-primary"
                 />
            </div>
        </div>
    </div>
  );
};
