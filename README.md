# POC For Using GigGitGadget with Another Git Repo

This project provides a template for using
[GitGitGadget](https://github.com/gitgitgadget/git) with another project.

## Repos
- ggguser (this one) is the equivalent of gitgitgadget with the customzations
- gggmonitored is the equivalent of gitgitgadget/git and user/git
- gggmail is the equivalent of the git mail repo (lore.git)
- gitgitgadget

## Workflow
1. Check out and build ggguser and gidgitgadget in separate sub-directories
1. Check out gggmonitored and gggmail to separate sub-directories.
1. Generate a config file from a generic template.  The real purpose
here is to demonstrate how sub-optimizations can occur.  For instance,
gidgitgadget could determine the base is really git-gui and set it here.
1. Run a test using the generated config.

## Misc comments (to be organized)
generic changes

azure-function
+ ci-helper
    - needs config -- done
    - commitsInSeen - how to handle
+ gitgitgadget
    - needs tracking branches, repo, owner, -- done
    - valid owners - does this belong here? moved to cihelper --done
+ mail-archive-helper.ts
    - mostly minor except whats cooking
    - need strategy for special emails
+ mail-commit-mapping.ts
    - needs config or constructor with several values --done
+ patch-series.ts
    - author (GitGitGadget), repo, controlling owner (gitgitgadget), patch signature -- done?
+ project-options.ts
    - strategy for special commits to determine upstreamBranch, midUrlPrefix, cc
	- The checks are beyond basic table running
        OR MAYBE NOT - could provide an array to run with strings to use with rev-parse with
        project: containing projectInfo or projectInfo[] which adds baseIncludes string like git-gui.sh
+ misc-helper.ts
    - needs config -- done
	- add /help command

+ commit-lint
    - done? Is more needed for constructor?
+ git-notes
    - done
+ github-glue
    - done
+ patch-series-metadata.ts
    - done
+ send-mail.ts
    - changes are not generic related?


### github workflow effect:
config always comes from workflow
+ mail-archive-helper.ts
    - need to handle 'start' range.  Current default commit does not work (and is probably outdatad at this point)
      Also, the commit is not saved away from the repo - this is done in a separate step in the azure pipeline
      There seems to be a problem in setString (GitNotes) if the initial empty config has been set.,  Not sure why
      line 45 is failing with the empty blob.
    - whats cooking - need strategy for special emails
    - replyToThis not handled
	- no harm for other uses even though it only applies to git
	- but what if they want their own?
+ project-options.ts
    - special commits part of workflow? so can be set as config
	- really only one special item here and that is git-gui check and could be done in workflow
	- more work needed here - see comments above
+ misc-helper.ts
    - need to review set-app-token and privateKey for CreateAppAuth.  Is gitgitgadget-git used?
	- need to review set-app-token and setting token in config.  I have
        gitgitgadget.webstech.githubToken set in my config for working with
        github-glue on my test repo.  If config is set at runtime (for gitgitgadget) based on repo owner then
        is there any reason not to just always set gitgitgadget.<owner>.githubToken and use that in github-glue?

### Test scenario:
Repo x workflow
- checkout x, ggg, testrepo
- run script to set some vars and write config
- run test:config with named repo

### Misc Helper Commands
- update-open-prs
- update-commit-mappings
- handle-open-prs
- lookup-upstream-commit <commit>
- set-upstream-commit <original commit> <new commit>
- set-tip-commit-in-git.git <PR URL> <tip commit in baseowner/repo>
- set-previous-iteration - very complex
- update-commit-mapping <message id>
- annotate-commit <commit> <commit in baseowner/repo>
- identify-merge-commit <upstream branch> <tip commit>
- get-gitgitgadget-options
- get-mail-meta <messageid>
- get-pr-meta <owner> <pr #>
- get-pr-commits <owner> <pr #>
- handle-pr <owner> <pr #>
  work with a pr that has already been seen/submitted
  normally used to recover from a problem?
- add-pr-comment <pr url> <comment>
- set-app-token - no can do
- handle-pr-comment <repo owner (optional)> <commentid>
  could be triggered by a comment - would work with command handler
- handle-pr-push <repo owner (optional)> <pr #>
  could be triggered by a push
- handle-new-mails - need to set gitConfig("gitgitgadget.loreGitDir")

### Config settings
gitConfig(`remote.${this.project.publishToRemote}.url
gitConfig("gitgitgadget.loreGitDir")
    process.env.GIT_AUTHOR_NAME = config.mail.author;
    process.env.GIT_AUTHOR_EMAIL = `${config.mail.author}@fakehost.com`;
    await worktree.git([ "config", "--add", "gitgitgadget.publishRemote",
        `https://github.com/${config.repo.baseOwner}/${config.repo.name}`, ]);
    await worktree.git([ "config", "--add", "gitgitgadget.smtpUser", "joe_user@example.com", ]);
    await worktree.git([ "config", "--add", "gitgitgadget.smtpHost", "localhost", ]);
    await worktree.git([ "config", "--add", "gitgitgadget.smtpPass", "secret", ]);
    await worktree.git([ "config", "--add", "gitgitgadget.smtpOpts", eMailOptions.smtpOpts, ]);
gitConfig(`gitgitgadget${infix}.githubToken`
    const notes = new GitNotes(gggRemote.workDir);
    await notes.set("", {allowedUsers: ["ggg", "user1"]}, true);
