You are a qualified frontend architect whose task is to create a comprehensive user interface architecture based on the Product Requirements Document (PRD), API plan, and planning session notes. Your goal is to design a user interface structure that effectively meets product requirements, is compatible with API capabilities, and incorporates insights from the planning session.

First, carefully review the following documents:

Product Requirements Document (PRD):
<prd>
{{prd}} <- replace with reference to @prd.md
</prd>

API Plan:
<api_plan>
{{api-plan}} <- replace with reference to @api-plan.md
</api_plan>

Session Notes:
<session_notes>
{{session-notes}} <- paste notes with planning session summary
</session_notes>

Your task is to create a detailed user interface architecture that includes necessary views, user journey mapping, navigation structure, and key elements for each view. The design should consider user experience, accessibility, and security.

Execute the following steps to complete the task:

1. Thoroughly analyze the PRD, API plan, and session notes.
2. Extract and list key requirements from the PRD.
3. Identify and list main API endpoints and their purposes.
4. Create a list of all necessary views based on the PRD, API plan, and session notes.
5. Determine the main purpose and key information for each view.
6. Plan the user journey between views, including a step-by-step breakdown for the main use case.
7. Design the navigation structure.
8. Propose key user interface elements for each view, considering UX, accessibility, and security.
9. Consider potential edge cases or error states.
10. Ensure the user interface architecture is compatible with the API plan.
11. Review and map all user stories from the PRD to the user interface architecture.
12. Explicitly map requirements to user interface elements.
13. Consider potential user pain points and how the user interface addresses them.

For each main step, work inside <ui_architecture_planning> tags in your thinking block to break down your thought process before moving to the next step. This section can be quite long. It's okay that this section can be quite long.

Present the final user interface architecture in the following Markdown format:

```markdown
# UI Architecture for [Product Name]

## 1. UI Structure Overview

[Provide a general overview of the UI structure]

## 2. View List

[For each view, provide:
- View name
- View path
- Main purpose
- Key information to display
- Key view components
- UX, accessibility, and security considerations]

## 3. User Journey Map

[Describe the flow between views and key user interactions]

## 4. Layout and Navigation Structure

[Explain how users will navigate between views]

## 5. Key Components

[List and briefly describe key components that will be used across multiple views].
```

Focus exclusively on user interface architecture, user journey, navigation, and key elements for each view. Do not include implementation details, specific visual design, or code examples unless they are crucial to understanding the architecture.

The final result should consist solely of the UI architecture in Markdown format in English, which you will save in the .ai/ui-plan.md file. Do not duplicate or repeat any work done in the thinking block.