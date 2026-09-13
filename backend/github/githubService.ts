/**
 * GitHub API Service
 * Handles repository URL parsing, tree fetching, commit history, and metadata retrieval.
 */

export interface GitHubRepoIdentifier {
  owner: string;
  repo: string;
  branch?: string;
  fullName: string;
  url: string;
}

export interface GitHubRepoMetadata {
  name: string;
  fullName: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  primaryLanguage: string;
  topics: string[];
  updatedAt: string;
  sizeKb: number;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubCommitItem {
  sha: string;
  message: string;
  author: string;
  date: string;
}

/**
 * Parses and validates GitHub URLs in various formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - http://github.com/owner/repo/tree/main
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(url: string): GitHubRepoIdentifier | null {
  if (!url || typeof url !== 'string') return null;

  let clean = url.trim();

  // Remove trailing slashes and .git suffix
  clean = clean.replace(/\.git\/?$/i, '').replace(/\/+$/, '');

  // Extract owner and repo from standard or tree URLs
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/tree\/([a-zA-Z0-9_.-]+))?/;
  const match = clean.match(regex);

  if (match) {
    const owner = match[1];
    const repo = match[2];
    const branch = match[3];
    return {
      owner,
      repo,
      branch,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  // Handle shorthand owner/repo format
  const shorthandMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shorthandMatch) {
    const owner = shorthandMatch[1];
    const repo = shorthandMatch[2];
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  return null;
}

function getGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ITCareerHub-Repo-Assessment/1.0',
  };

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  return headers;
}

/**
 * Fetches repository metadata from GitHub API
 */
export async function fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetch(url, { headers: getGitHubHeaders() });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
    }
    if (res.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please wait a moment or configure GITHUB_TOKEN.');
    }
    throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return {
    name: data.name,
    fullName: data.full_name,
    owner: data.owner?.login || owner,
    description: data.description || '',
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    openIssues: data.open_issues_count || 0,
    defaultBranch: data.default_branch || 'main',
    primaryLanguage: data.language || 'Unknown',
    topics: data.topics || [],
    updatedAt: data.updated_at || '',
    sizeKb: data.size || 0,
  };
}

/**
 * Fetches the complete repository file tree recursively
 */
export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTreeItem[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, { headers: getGitHubHeaders() });

  if (!res.ok) {
    if (res.status === 404) {
      // Try 'master' branch fallback if branch was 'main'
      if (branch === 'main') {
        return fetchRepoTree(owner, repo, 'master');
      }
      throw new Error(`Failed to fetch file tree for branch "${branch}".`);
    }
    throw new Error(`Failed to fetch file tree: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.tree)) {
    return [];
  }

  return data.tree;
}

/**
 * Fetches recent commit history for evolution and git history analysis
 */
export async function fetchRecentCommits(owner: string, repo: string, limit = 15): Promise<GitHubCommitItem[]> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`;
    const res = await fetch(url, { headers: getGitHubHeaders() });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      sha: (c.sha || '').substring(0, 7),
      message: (c.commit?.message || '').split('\n')[0],
      author: c.commit?.author?.name || c.author?.login || 'Contributor',
      date: c.commit?.author?.date || '',
    }));
  } catch {
    return [];
  }
}
