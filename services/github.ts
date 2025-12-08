
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: { name: string; date: string };
    message: string;
  };
  html_url: string;
}

export const getHeaders = (token?: string) => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
};

export const fetchRepoTree = async (
  owner: string, 
  repo: string, 
  branch: string = 'main', 
  token?: string
): Promise<GitHubTreeItem[]> => {
  try {
    // Get the latest commit SHA first to get the tree SHA
    const branchRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}`, {
      headers: getHeaders(token)
    });
    
    if (!branchRes.ok) throw new Error('Branch not found');
    const branchData = await branchRes.json();
    const treeSha = branchData.commit.commit.tree.sha;

    // Recursive tree fetch
    const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, {
      headers: getHeaders(token)
    });

    if (!treeRes.ok) throw new Error('Failed to fetch tree');
    const treeData = await treeRes.json();
    
    return treeData.tree;
  } catch (error) {
    console.error('GitHub API Error:', error);
    throw error;
  }
};

export const fetchFileContent = async (
  owner: string, 
  repo: string, 
  path: string, 
  branch: string = 'main',
  token?: string
): Promise<string> => {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
      headers: getHeaders(token)
    });

    if (!res.ok) throw new Error('Failed to fetch file content');
    const data = await res.json();

    // Content is base64 encoded
    const content = atob(data.content.replace(/\n/g, ''));
    return content;
  } catch (error) {
    console.error('GitHub Content Error:', error);
    throw error;
  }
};

export const fetchCommits = async (
  owner: string, 
  repo: string, 
  limit: number = 10,
  token?: string
): Promise<GitHubCommit[]> => {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=${limit}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch commits');
    return await res.json();
  } catch (error) {
    console.error('GitHub Commits Error:', error);
    return [];
  }
};

export const fetchUserRepos = async (token: string): Promise<{ full_name: string; private: boolean }[]> => {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&type=all`, {
      headers: getHeaders(token)
    });
    
    if (!res.ok) throw new Error('Failed to fetch repositories');
    return await res.json();
  } catch (error) {
    console.error('GitHub Repos Error:', error);
    throw error;
  }
};
