# Project workflow

- The user requests automatic commits and pushes after each successfully completed task.
- Review the task's changes, run the relevant checks, then commit and push to the current branch's remote without asking for an additional confirmation. Respect tool-required permission prompts.
- Include unrelated existing changes only when the user explicitly requests them. Do not commit secrets, generated build files, or operating-system metadata.
- If validation or pushing fails, explain the blocker and do not claim that the work was pushed. Never force-push without explicit authorization.
