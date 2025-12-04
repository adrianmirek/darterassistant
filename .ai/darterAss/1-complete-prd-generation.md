You are an experienced product manager whose task is to create a comprehensive Product Requirements Document (PRD) based on the following descriptions:

<project_description>
### Main goal
While there are applications that manage dart tournaments, none currently focus on personal performance tracking across multiple tournaments.
Darter Assistant aims to be the personal analytics and improvement platform for dart players — a place to store, analyze, and improve results over time.

### MVP - Minimum Viable Product
- Record results from all tournaments they participate in.
- View list of tournaments by logged user.
- Write personal goal (average between start and end date)
- Track progress toward personal goals (e.g., target average, win ratio, consistency).
- Basic account system (email + password).
- AI Integration (Motivational Assistant). Basic AI assistant that provides short, positive feedback messages or motivational insights after each tournament.
Example: “Your average improved by 4%! Keep aiming for 180s!”
Early personalization: adjusts feedback tone based on recent performance trends.

### Not included in MVP
- Real-time match data entry or live tournament integration.
- Social or data-sharing features.
- Integration with official tournament management apps.
- Advanced analytics (e.g., heatmaps, shot accuracy).
- Training plan generator.
- View detailed performance statistics by tournament and over time.

### Success Criteria
- 90% of users use the app regularly (at least 2 tournaments saved per month).
- 75% of users create at least one personal improvement goal (e.g., “reach 70 average”).
- Positive feedback score ≥ 4.5/5 on app store reviews after launch.
</project_description>

<project_details>
<conversation_summary>

<decisions>
1. Use a simple email + password sign-up and login flow with “forgot password” (no email confirmation).  
2. Backend technology: .NET Core API with SQL Server and Entity Framework ORM.  
3. No onboarding/tutorial in MVP.  
4. Stats entry form presented as a single, scrollable page.  
5. In MVP users can only add tournament entries—no edit or delete functionality.  
6. Field-level validation required, with detailed rules to be defined later.  
7. No visualization progress with a line chart for average over time and a progress bar for goal completion - not in MVP.  
8. AI motivational feedback triggered on demand via a “Get Feedback” button, displayed as a toast.  
9. Frontend technology: Astro + React.  
10. 4-week timeline broken into 1-week sprints.  
</decisions>

<matched_recommendations>
1. Implement email + password flow with “forgot password” and defer social login.  
2. Define and implement field-level validations (min/max checks) before submission.  
3. Start with a single, scrollable form for stats entry to minimize complexity.    
5. Add a “Get Feedback” button and simple toast component for AI motivational messages.  
6. Prototype the simplest data-entry flow first and plan additional import options later.  
</matched_recommendations>

<prd_planning_summary>
The team will build a web-only MVP for “Darter Assistant” to track personal performance across tournaments. Core features include user authentication via email + password with “forgot password,” and a single-page form to record tournament stats (place, date, match type, result, AVG, first-9 AVG, CheckOut %, counts of 60+ through 180, high finish, best leg, worst leg). Users can view their list of saved tournaments and set personal average-based goals. An on-demand “Get Feedback” button triggers brief AI-powered motivational toasts.

Key user stories:
- As a player, I can sign up, log in, and recover my password.
- As a player, I can add tournament results in a single form.
- As a player, I can view my tournament history.
- As a player, I can set and track an average-based improvement goal.
- As a player, I can request motivational feedback after saving a tournament.

Success criteria:
- 90% of users save at least two tournaments per month (tracked via backend events).  
- 75% of users create at least one personal improvement goal (tracked via goal-creation events).  
- Positive user feedback (≥4.5/5) measured via app reviews or in-app surveys.

</prd_planning_summary>

<unresolved_issues>
- Precise numeric validation rules (e.g., valid AVG range, percentage bounds).  
</unresolved_issues>

</conversation_summary>
</project_details>

Follow these steps to create a comprehensive and well-organized document:

1. Divide the PRD into the following sections:
   a. Project Overview
   b. User Problem
   c. Functional Requirements
   d. Project Boundaries
   e. User Stories
   f. Success Metrics

2. In each section, provide detailed and relevant information based on the project description and answers to clarifying questions. Make sure to:
   - Use clear and concise language
   - Provide specific details and data as needed
   - Maintain consistency throughout the document
   - Address all points listed in each section

3. When creating user stories and acceptance criteria
   - List ALL necessary user stories, including basic, alternative, and edge case scenarios.
   - Assign a unique requirement identifier (e.g., US-001) to each user story for direct traceability.
   - Include at least one user story specifically for secure access or authentication, if the application requires user identification or access restrictions.
   - Ensure that no potential user interaction is omitted.
   - Ensure that each user story is testable.

Use the following structure for each user story:
- ID
- Title
- Description
- Acceptance Criteria

4. After completing the PRD, review it against this checklist:
   - Is each user story testable?
   - Are the acceptance criteria clear and specific?
   - Do we have enough user stories to build a fully functional application?
   - Have we included authentication and authorization requirements (if applicable)?

5. PRD Formatting:
   - Maintain consistent formatting and numbering.
   - Do not use bold formatting in markdown ( ** ).
   - List ALL user stories.
   - Format the PRD in proper markdown.

Prepare the PRD with the following structure:

```markdown
# Product Requirements Document (PRD) - {{app-name}}
## 1. Product Overview
## 2. User Problem
## 3. Functional Requirements
## 4. Product Boundaries
## 5. User Stories
## 6. Success Metrics
```

Remember to fill each section with detailed, relevant information based on the project description and our clarifying questions. Ensure the PRD is comprehensive, clear, and contains all relevant information needed for further product development.

The final output should consist solely of the PRD in the specified markdown format, which you will save in the file .ai/prd.md