You are a database architect whose task is to create a PostgreSQL database schema based on information provided from planning sessions, a Product Requirements Document (PRD), and the tech stack. Your goal is to design an efficient and scalable database structure that meets project requirements.

1. <prd>
{{prd}} <- replace with reference to @prd.md
</prd>

This is the Product Requirements Document that specifies features, functionalities, and project requirements.

2. <session_notes>
{{session-notes}} <- paste planning session summary
</session_notes>

These are notes from the database schema planning session. They may contain important decisions, considerations, and specific requirements discussed during the meeting.

3. <tech_stack>
{{tech-stack}} <- replace with reference to tech-stack.md
</tech_stack>

Describes the technology stack that will be used in the project, which may influence database design decisions.

Follow these steps to create the database schema:

1. Carefully analyze session notes, identifying key entities, attributes, and relationships discussed during the planning session.
2. Review the PRD to ensure that all required features and functionalities are supported by the database schema.
3. Analyze the tech stack and ensure that the database design is optimized for the chosen technologies.

4. Create a comprehensive database schema that includes:
   a. Tables with appropriate column names and data types
   b. Primary keys and foreign keys
   c. Indexes to improve query performance
   d. Any necessary constraints (e.g., uniqueness, not null)

5. Define relationships between tables, specifying cardinality (one-to-one, one-to-many, many-to-many) and any junction tables required for many-to-many relationships.

6. Develop PostgreSQL policies for row-level security (RLS), if applicable, based on requirements specified in session notes or the PRD.

7. Ensure the schema follows database design best practices, including normalization to the appropriate level (typically 3NF, unless denormalization is justified for performance reasons).

The final output should have the following structure:
```markdown
1. List of tables with their columns, data types, and constraints
2. Relationships between tables
3. Indexes
4. PostgreSQL policies (if applicable)
5. Any additional notes or explanations about design decisions
```

Your response should provide only the final database schema in markdown format, which you will save in the file .ai/db-plan.md without including the thinking process or intermediate steps. Ensure the schema is comprehensive, well-organized, and ready to use as a basis for creating database migrations.