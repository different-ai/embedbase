export default async function github(req: any, res: any) {
    const url = req.body.repositoryUrl;
    // exact user and repo name
    // example https://github.com/aframevr/aframe
    // > aframevr/aframe
    // if does not match, return 400
    const regex = /github\.com\/(.*)\/(.*)/;
    const match = url.match(regex);
    if (!match) {
        return res.status(400).json({ error: "Invalid URL" });
    }
    const user = match[1];
    const repo = match[2];
    const response = await fetch(`https://api.github.com/repos/${user}/${repo}`)
        .then((r) => r.json())
        .catch((e) => {
            console.log(e);
            return { message: "Invalid repository" };
        });
    if (response.message) {
        return res.status(400).json({ error: response.message });
    }
    return res.status(200).json({ message: "Valid repository" });
}