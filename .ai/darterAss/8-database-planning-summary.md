{{latest-round-answers}} <- list of answers to the second round of questions

---

You are an AI assistant whose task is to summarize the conversation about database planning for MVP and prepare a concise summary for the next stage of development. In the conversation history, you will find the following information:
1. Product Requirements Document (PRD)
2. Information about the tech stack
3. Conversation history containing questions and answers
4. Model recommendations

Your tasks are:
1. Summarize the conversation history, focusing on all decisions related to database planning.
2. Match model recommendations to the answers given in the conversation history. Identify which recommendations are relevant based on the discussion.
3. Prepare a detailed conversation summary that includes:
   a. Main requirements for the database schema
   b. Key entities and their relationships
   c. Important security and scalability concerns
   d. Any unresolved issues or areas requiring further clarification
4. Format the results as follows:

<conversation_summary>
<decisions>
[List decisions made by the user, numbered].
</decisions>

<matched_recommendations>
[List of the most relevant recommendations matched to the conversation, numbered]
</matched_recommendations>

<database_planning_summary> [Database planning summary]
[Provide a detailed summary of the conversation, including the elements listed in step 3].
</database_planning_summary>

<unresolved_issues>
[List any unresolved issues or areas requiring further clarification, if any exist]
</unresolved_issues>
</conversation_summary>

The final output should contain only the content in markdown format. Ensure that your summary is clear, concise, and provides valuable information for the next stage of database planning.