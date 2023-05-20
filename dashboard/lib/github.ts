// import fetch from "cross-fetch";

interface GithubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: 'file' | 'dir';
    _links: {
        self: string;
        git: string;
        html: string;
    };
}

// get all files from agithub repo
export const getAllFilesFromGithubRepo = async (url: string, githubToken: string): Promise<GithubFile[]> => {
    if (!url) {
        throw new Error('No url provided');
    }
    if (!githubToken) {
        throw new Error('No github token provided');
    }
    const response = await fetch(url, {
        headers: {
            Authorization: `token ${githubToken}`,
        },
    });
    const data: GithubFile[] = await response.json();

    const dataList: GithubFile[] = [];
    for (const item of data) {
        if (item.type === 'file') {
            dataList.push(item);
        } else if (item.type === 'dir') {
            const subdirFiles = await getAllFilesFromGithubRepo(item._links.self, githubToken);
            dataList.push(...subdirFiles);
        }
    }
    return dataList;
};

function getGitHubRawContentUrl(url: string): string {
    const [, owner, repo, , branchName = "main", ...filePathParts] =
        url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?\/?(.*)/) ?? [];

    if (!owner || !repo) {
        throw new Error("Invalid GitHub repository URL");
    }

    const filePath = filePathParts.join("/");
    const ending = branchName ? `?ref=${branchName}` : "";

    return `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}${ending}`;
}

const allowedExtensions = [
    ".md", ".mdx", ".sol", ".txt", ".json", ".csv",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html",
    ".yaml", ".yml", ".toml", ".sh", ".php", ".go",
    ".java", ".c", ".cpp", ".cs", ".rs", ".rb", ".r",
    ".lua", ".swift", ".kt", ".scala", ".dart", ".erl", ".exs",
    ".ex", ".elm", ".elm", ".hs",
];

export const getGithubContent = async (humanUrl: string, token: string) => {
    const url = getGitHubRawContentUrl(humanUrl);
    const files = await getAllFilesFromGithubRepo(url, token);
    const filteredFiles = files.filter((file) => {
        const extension = file.name.split(".").pop();
        return allowedExtensions.includes(`.${extension}`);
    });
    const githubFiles = filteredFiles.map(
        async (file) => {
            return {
                content: await fetch(file.download_url, {
                    headers: {
                        Authorization: `token ${token}`,
                    },
                }).then((res) => res.text()),
                metadata: file,
            };
        }
    );

    return await Promise.all(githubFiles);
};

// extract repo name from url
// e.g. https://github.com/gnosis/hashi should return gnosis-hashi
export const getRepoName = (url: string) => {
    const urlParts = url.split("/");
    const repo = urlParts.slice(3, 5).join("-");
    return repo;
};

export const getUserAndRepo = (url: string) => {
    const regex = /github\.com\/(.*)\/(.*)/;
    const match = url.match(regex);
    if (!match) {
        return [];
    }
    const user = match[1];
    const repo = match[2].replace("/", "");
    return [user, repo];
};