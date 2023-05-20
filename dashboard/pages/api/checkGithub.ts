
export const config = {
    runtime: 'edge'
}

export default async function github(req: any, res: any) {
    const body = await req.json()

    const url = body.repositoryUrl;
    // exact user and repo name
    // example https://github.com/aframevr/aframe
    // > aframevr/aframe
    // if does not match, return 400
    const regex = /github\.com\/(.*)\/(.*)/;
    const match = url.match(regex);
    if (!match) {
        return new Response(JSON.stringify({ error: 'No URL provided' }), {
            status: 400,
        })
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
        return new Response(JSON.stringify({ error: response.message }), {
            status: 400,
        })
    }
    return new Response(JSON.stringify({ error: 'Valid repository' }), {
        status: 200,
    })
}