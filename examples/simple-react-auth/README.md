## simple-react-auth

This is a simple React app that is using **Embedbase** in an authenticated way.
It is identical to [simple-react](https://github.com/another-ai/embedbase/tree/main/examples/simple-react) except that it is passing an id token to the **Embedbase** API.

1. [Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup).
2. Enable Google as a sign-in method in the Firebase console:

    a. In the [Firebase console](https://console.firebase.google.com/), open the Auth section.
    
    b. On the Sign in method tab, enable the Google sign-in method and click Save.

3. [Get your Firebase config](https://console.firebase.google.com/u/0/project/obsidian-ai/settings/general/web:NjRmMWIwZDAtMmE3OC00YTM5LThlMjItYzcxZWUzM2I2NjQ5) and add it to the `src/fb.json` file 


```bash
docker-compose up
```

Start the front-end in another terminal:

```bash
npm i
npm start
```
