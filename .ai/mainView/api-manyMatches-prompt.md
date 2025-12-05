According to database implemantation plan @.ai/1-db-plan.md  and migration @supabase/migrations/20251203120000_add_tournament_types_and_match_results_columns.sql  adjust all files related to these changes. 
Prepare implemantation plan for models and api objects.
Take into consideration the following files:
@src/db/database.types.ts  
add to the api tournament-types to the @api folder. Use the current structure as an example.
modify tournaments ts files: @src/pages/api/tournaments/index.ts @src/pages/api/tournaments/index.ts  adjust api to the current strusture of database, use migration for preparing api changes @supabase/migrations/20251203120000_add_tournament_types_and_match_results_columns.sql 
Adjust @src/types.ts  to the current strusture of database, use migration for preparing api changes
If needed adjust additional objects

  Ensure your plan for these changes is comprehensive, well-structured, and addresses all aspects of the input materials. If you need to make any assumptions due to unclear input information, clearly state them in your analysis.

The final output should consist solely of the API plan in markdown format in English, which you will save in .ai/mainView/api-manyMatches-implementation-plan.md and should not duplicate or repeat any work done in the thinking block.