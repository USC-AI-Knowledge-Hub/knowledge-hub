# AI Team board on Google Firebase

The AI Team boards (`/team`) and video picks (`/team/test`) keep their posts in Cloud Firestore, Google's
database. Each visitor's browser signs in anonymously, so nobody makes an account. There's no server:
`firestore.rules` checks every write. The free Spark plan needs no card and doesn't pause when the site is quiet.

## Set it up (about 10 minutes, once)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), sign in with a Google account
   and choose **Create a project**. Any name works, for example `usc-ai-hub-board`. Turn Google Analytics off.
2. **Turn on anonymous sign-in.** In the left menu, open **Build > Authentication**, choose **Get started**,
   then **Sign-in method > Anonymous**, switch it on and **Save**.
3. **Make the database.** Open **Build > Firestore Database > Create database**. Pick a location near your
   students (`us-west2`, Los Angeles, for USC) and **Start in production mode**.
4. **Add the rules.** In Firestore, open the **Rules** tab, replace everything with the contents of
   `firebase/firestore.rules` from this repository, and choose **Publish**.
5. **Get the web keys.** Open **Project settings** (the gear next to Project overview). Under **Your apps**,
   choose the web icon (`</>`), name it "Knowledge Hub", leave Hosting unticked and **Register app**. It shows a
   `firebaseConfig` block. You need two values from it: `apiKey` and `projectId`. They aren't secret: every
   visitor's browser gets them, and the rules are what protect the data.
6. **Give them to the site.** In GitHub, open the repository's **Settings > Secrets and variables > Actions >
   Variables** and add two repository variables:
   - `FIREBASE_API_KEY`: the `apiKey`
   - `FIREBASE_PROJECT_ID`: the `projectId`
7. **Deploy.** Run the "Daily videos and deploy" workflow from the Actions tab, or wait for the next push to main.
   The boards use Firebase as soon as both variables are set (Firebase wins over the old `BOARD_URL` Supabase
   variables, which you can delete).

Optional but worth it: in [Google Cloud console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials),
open the "Browser key" Firebase made and, under **Application restrictions**, choose **Websites** and add
`studentslearningai.com/*` and `localhost/*`. Other sites then can't use your key.

## What the rules enforce

- Names of 1 to 40 characters with no links, posts of 1 to 2,000 characters with at most two links.
- The block list: 1,255 words and phrases from the MIT-licensed `cuss` package, matched as whole words and
  through look-alikes such as `0` for `o` and `@` for `a`.
- 15 seconds between posts from one browser.
- Replies only one level deep, on the same board and topic, to posts that are still there.
- One reaction of each kind (and one vote on a video pick) per browser, which can be taken back.
- One report per browser per post; the third report hides the post.
- Only the browser that wrote a post can edit or delete it. Clearing the browser's data, or another device,
  means a new anonymous sign-in, which can't edit older posts.

## Moderating

Everything is in **Firestore Database > Data**:

- `posts`: every post. To hide one, set its `hidden` field to `true`; to bring a reported post back, set `hidden`
  to `false` and `reports` to `0`. To remove one for good, delete the document.
- `reports`: who reported what (by anonymous id, `{postId}_{uid}`).
- `reactions` and `users`: bookkeeping for the one-reaction rule and the pause between posts. Leave them alone.

To change the block list, edit `scripts/gen-firebase-rules.ts`, run `npm run firebase-rules`, commit, and publish
the new `firestore.rules` in the console as in step 4.

## Limits of the free plan

50,000 document reads, 20,000 writes and 1 GiB stored per day, which is plenty for a class. Each time a board
loads it reads every post on that board once, and an open page reloads every two minutes. If a day's reads run
out, the board shows "couldn't be reached" until the quota resets at midnight Pacific time. Nothing is charged
on the Spark plan.

## Tests

`npm run test:firebase` starts Google's Firestore and Auth emulators (it needs Java 11 or newer) and runs
`firebase/__tests__/`: the rules attacked directly, and the page's own Firebase code used end to end. CI runs it
on every pull request.
