You are a GitHub Actions specialist in the stack @tech-stack.md @package.json

Create a "pull-request.yml" scenario based on @github-action.mdc

Workflow:
The "pull-request.yml" scenario should work as follows:

- Linting code
- Then two parallel - unit-test and e2e-test
- Finally - status-comment (comment to PR about the status of the whole)

Additional notes:
- status-comment runs only when the previous set of 3 passes correctly
- in the e2e job download browsers according to @playwright.config.ts
- in the e2e job set the "integration" environment and variables from secrets according to @.env.example
- collect coverage of unit tests and e2e tests