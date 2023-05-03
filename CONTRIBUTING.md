# I’m in! Now what?

[Join the Embedbase Discord Server!](https://discord.gg/pMNeuGrDky).

## Current Stack

* Embeddings
  - [x] [openai embeddings](https://platform.openai.com/docs/guides/embeddings)
  - [ ] [cohere embeddings](https://cohere.ai/embed)
  - [ ] [Google PaLM embeddings](https://developers.googleblog.com/2023/03/announcing-palm-api-and-makersuite.html)
  - [x] local (BERT, LLaMa, Vicuna, etc.)
* Vector database
  - [x] [supabase](https://supabase.com/)
  - [x] postgres
  - [x] qdrant
  - [x] local (memory, sqlite, etc.)
* [fastapi](https://github.com/tiangolo/fastapi)
* Authentication (optional)
  - [x] [firebase](https://firebase.google.com/)
  - [x] [supabase](https://supabase.com/)

### Taking on Tasks

We have a growing task list of
[issues](https://github.com/different-ai/embedbase/issues). Find an issue that
appeals to you and make a comment that you'd like to work on it. Include in your
comment a brief description of how you'll solve the problem and if there are any
open questions you want to discuss.

If the issue is currently unclear but you are interested, please post in Discord
and someone can help clarify the issue in more detail.

We write the documentation using Nextra in the `docs` folder in https://github.com/different-ai/embedbase. It is automatically indexed on changes in Embedbase Cloud and provide a GPT-4-QA interface.

### Submitting Work

We're all working on different parts of Embedbase together. To make
contributions smoothly we recommend the following:

1.  [Fork this project repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
    and clone it to your local machine. (Read more
    [About Forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks)) or use gitpod.io.
1.  Before working on any changes, try to
    [sync the forked repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
    to keep it up-to-date with the upstream repository.
1.  On a
    [new branch](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository)
    in your fork (aka a "feature branch" and not `main`) work on a small focused
    change that only touches on a few files.
1.  Package up a small bit of work that solves part of the problem
    [into a Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)
    and
    [send it out for review](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review).
1.  If you're lucky, we can merge your change into `main` without any problems.
    If there are changes to files you're working on, resolve them by:
    1.  First try to rebase as suggested
        [in these instructions](https://timwise.co.uk/2019/10/14/merge-vs-rebase/#should-you-rebase).
    1.  If rebasing feels too painful, merge as suggested
        [in these instructions](https://timwise.co.uk/2019/10/14/merge-vs-rebase/#should-you-merge).
1.  Once you've resolved conflicts (if any), finish the review and
    [squash and merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges#squash-and-merge-your-commits)
    your PR (when squashing try to clean up or update the individual commit
    messages to be one sensible single one).
1.  Merge in your change and move on to a new issue or the second step of your
    current issue.

Additionally, if someone is working on an issue that interests you, ask if they
need help on it or would like suggestions on how to approach the issue. If so,
share wildly. If they seem to have a good handle on it, let them work on their
solution until a challenge comes up.

#### Tips

- At any point you can compare your feature branch to the upstream/main of
  `different-ai/embedbase` by using a URL like this:
  https://github.com/different-ai/embedbase/compare/main...bobm4894:embedbase:my-example-feature-branch.
  Obviously just replace `bobm4894` with your own GitHub user name and
  `my-example-feature-branch` with whatever you called the feature branch you
  are working on, so something like
  `https://github.com/different-ai/embedbase/compare/main...<your_github_username>:embedbase:<your_branch_name>`.
  This will show the changes that would appear in a PR, so you can check this to
  make sure only the files you have changed or added will be part of the PR.
- Try not to work on the `main` branch in your fork - ideally you can keep this
  as just an updated copy of `main` from `different-ai/embedbase`.
- If your feature branch gets messed up, just update the `main` branch in your
  fork and create a fresh new clean "feature branch" where you can add your
  changes one by one in separate commits or all as a single commit.

### When does a review finish

A review finishes when all blocking comments are addressed and at least one
owning reviewer has approved the PR. Be sure to acknowledge any non-blocking
comments either by making the requested change, explaining why it's not being
addressed now, or filing an issue to handle it later.

### Releasing

#### Embedbase Core

To release a new version of Embedbase project, bump the version in `pyproject.toml` and run:

```bash
make release
```

#### Embedbase Python SDK

For the Python SDK, bump the version in `sdk/embedbase-py/pyproject.toml` and run:

```bash
make release/sdk-py
```

#### Embedbase Javascript SDK

For the Javascript SDK, just push to main, we use semantic-release to automatically release when a change has been made to the main branch.
