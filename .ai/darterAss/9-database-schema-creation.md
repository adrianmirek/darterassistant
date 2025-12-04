You are a database architect whose task is to create a PostgreSQL database schema based on information provided from planning sessions, a Product Requirements Document (PRD), and the tech stack. Your goal is to design an efficient and scalable database structure that meets project requirements.

1. <prd>
{{prd}} <- replace with reference to @prd.md
</prd>

This is the Product Requirements Document that specifies features, functionalities, and project requirements.

2. <session_notes>
<conversation_summary>

<decisions>
1. Introduce a separate `tournaments` table (`id, user_id, name, date`) alongside `tournament_match_results`.  
2. Use a lookup/reference table `match_types` for `match_type`.  
3. Do not persist AI-generated feedback in MVP (ephemeral only).  
4. Support a single goal type (`target_avg`) per user, enforce non-overlapping `start_date`/`end_date`.  
5. Apply `NUMERIC(5,2)` and `INTEGER` with `CHECK` constraints for score, percentage, and count fields.  
6. Create indexes on `(user_id, date DESC)` in `tournaments` and on `tournament_id` in `tournament_match_results`.  
7. Defer table partitioning for MVP.  
8. Enable Row-Level Security on `tournaments`, `tournament_match_results`, and `goals` with `auth.uid() = user_id` policies.  
9. Enforce `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` for user-owned tables.  
10. Define a dedicated SQL view `goal_progress` aggregating data from `tournament_match_results`.  
11. Rename `tournament_results` to `tournament_match_results` for clarity.  
</decisions>

<matched_recommendations>
1. Persist AI feedback ephemerally rather than storing history.  
2. Enforce non-overlapping goal date ranges via a GIST exclusion constraint.  
3. Use `NUMERIC(5,2)` and `INTEGER` with `CHECK` constraints for numeric fields.  
4. Index `(user_id, date DESC)` and `(tournament_id)` for efficient queries.  
5. Defer partitioning until scale demands it.  
6. Apply RLS policies restricting access to rows where `auth.uid() = user_id`.  
7. Add `FOREIGN KEY` constraints to `auth.users(id)` with cascading deletes.  
8. Create a SQL view for goal progress aggregation.  
</matched_recommendations>

<database_planning_summary>
Main requirements:
- Track users’ tournament entries and detailed match results.  
- Manage per-user improvement goals with exclusive date ranges.  
- Enforce strong data integrity, constraints, and row-level security.  

Key entities & relationships:
- `auth.users` (Supabase) → `tournaments` (1-to-many by `user_id`).  
- `tournaments` → `tournament_match_results` (1-to-many by `tournament_id`).  
- `match_types` lookup table linked to `tournament_match_results`.  
- `goals` per user with exclusive date‐range constraint.  
- `goal_progress` view aggregates `tournament_match_results` within each goal’s date window.  

Security & scalability:
- RLS on all user-scoped tables ensures each user sees only their own rows.  
- Foreign keys to `auth.users` with `ON DELETE CASCADE` maintain referential integrity.  
- Essential indexes support fast retrieval of recent tournaments and match results.  
- Partitioning deferred; revisit when row counts grow significantly.  
- Dedicated SQL view improves clarity and can be materialized later if performance demands.  
</database_planning_summary>

<unresolved_issues>
1. Seeding strategy for the `match_types` table (initial data load).  
2. Time-zone handling or choice of `TIMESTAMP WITH TIME ZONE` vs `DATE` for tournament dates.  
3. Performance tuning or materialization approach for the `goal_progress` view at scale.  
4. Future requirements for storing AI feedback history if analytics become necessary.  
</unresolved_issues>

</conversation_summary>
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