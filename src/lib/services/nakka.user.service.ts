import type {
  RetrieveTournamentsMatchesResponseDTO,
  NakkaTournamentWithMatchesDTO,
  NakkaTournamentMatchDTO,
  NakkaMatchScrapedDTO,
  NakkaTournamentScrapedDTO,
  GetPlayerMatchesResponseDTO,
  NakkaPlayerMatchResult,
} from "@/types";
import {
  scrapeTournamentsByKeyword,
  scrapeTournamentMatches,
  scrapeMatchPlayerResults,
  importMatchPlayerResults,
} from "./nakka.service";
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Retrieves tournaments and their matches filtered by keyword and player nickname
 * This function does not persist data to database - it only scrapes and filters
 * @param tournament_keyword - Search keyword for tournaments (e.g., "agawa")
 * @param nick_name - Player nickname to filter matches (e.g., "Mirek")
 * @returns Object containing tournaments with matches, marking matches where player nickname is found
 */
export async function retrieveTournamentsMatchesByKeywordAndNickName(
  tournament_keyword: string,
  nick_name: string
): Promise<RetrieveTournamentsMatchesResponseDTO> {
  console.log(`Retrieving tournaments for keyword: "${tournament_keyword}", nickname: "${nick_name}"`);

  // Step 1: Scrape all tournaments matching the keyword
  const scrapedTournaments = await scrapeTournamentsByKeyword(tournament_keyword);
  console.log(`Found ${scrapedTournaments.length} tournaments`);

  const tournaments: NakkaTournamentWithMatchesDTO[] = [];

  // Normalize nickname for case-insensitive matching
  const normalizedNickname = nick_name.toLowerCase().trim();

  // Step 2: For each tournament, scrape matches and filter by nickname
  for (const tournament of scrapedTournaments) {
    try {
      console.log(`Processing tournament: ${tournament.tournament_name} (${tournament.nakka_identifier})`);

      // Scrape all matches for this tournament
      const scrapedMatches = await scrapeTournamentMatches(tournament.href);
      console.log(`Found ${scrapedMatches.length} matches for tournament ${tournament.nakka_identifier}`);

      // Process each match to check for nickname match and reorder players if needed
      const processedMatches: NakkaTournamentMatchDTO[] = scrapedMatches.map((match) =>
        processMatchForNickname(match, normalizedNickname)
      );

      // Add tournament with processed matches to result
      tournaments.push({
        nakka_identifier: tournament.nakka_identifier,
        tournament_date: tournament.tournament_date.toISOString(),
        tournament_name: tournament.tournament_name,
        href: tournament.href,
        tournament_matches: processedMatches,
      });

      console.log(
        `Tournament ${tournament.nakka_identifier}: ${processedMatches.filter((m) => m.isChecked).length}/${processedMatches.length} matches checked for "${nick_name}"`
      );
    } catch (error) {
      console.error(`Failed to process tournament ${tournament.nakka_identifier}:`, error);
      // Continue with next tournament on error
    }
  }

  console.log(`Successfully processed ${tournaments.length} tournaments`);

  return {
    tournaments,
  };
}

/**
 * Retrieves tournaments and their matches filtered by keyword and player nickname (Guest Version)
 * This function limits the results to 30 matches where the nickname is found
 * Also saves tournaments and matches to the database
 *
 * Optimization: Checks database first before scraping to avoid unnecessary web requests
 *
 * Returns normalized response format matching getPlayerMatchesByNickname
 *
 * @param supabase - Supabase client instance for database operations
 * @param tournament_keyword - Search keyword for tournaments (e.g., "agawa")
 * @param nick_name - Player nickname to filter matches (e.g., "Mirek")
 * @returns Object containing flat list of matches with tournament info and statistics (limited to 30 matches)
 */
export async function retrieveTournamentsMatchesByKeywordAndNickNameForGuest(
  supabase: SupabaseClient,
  tournament_keyword: string,
  nick_name: string
): Promise<GetPlayerMatchesResponseDTO> {
  console.log(`[Guest] Retrieving tournaments for keyword: "${tournament_keyword}", nickname: "${nick_name}"`);

  // Step 1: Scrape all tournaments matching the keyword (using stealth plugin to bypass Cloudflare)
  const scrapedTournaments = await scrapeTournamentsByKeyword(tournament_keyword);
  console.log(`[Guest] Found ${scrapedTournaments.length} tournaments`);

  const allMatches: NakkaPlayerMatchResult[] = [];
  const normalizedNickname = nick_name.toLowerCase().trim();
  const MAX_MATCHES = 30;

  // Step 2: For each tournament, check DB first, then scrape if needed
  for (const tournament of scrapedTournaments) {
    // Break if we already have 30 matches
    if (allMatches.length >= MAX_MATCHES) {
      console.log(`[Guest] Reached limit of ${MAX_MATCHES} matches, stopping tournament processing`);
      break;
    }

    try {
      console.log(`[Guest] Processing tournament: ${tournament.tournament_name} (${tournament.nakka_identifier})`);

      // Check if tournament exists in database and get its status
      const tournamentInfo = await getTournamentStatus(supabase, tournament.nakka_identifier);

      if (tournamentInfo && (tournamentInfo.status === 'matches_saved' || tournamentInfo.status === 'completed')) {
        // Tournament exists and all matches are already saved (matches_saved or completed)
        // Skip scraping and match saving process - just retrieve from DB
        console.log(
          `[Guest] Tournament ${tournament.nakka_identifier} exists with status '${tournamentInfo.status}', skipping match import`
        );

        const dbMatches = await getTournamentMatchesFromDB(
          supabase,
          tournament.nakka_identifier,
          normalizedNickname,
          MAX_MATCHES - allMatches.length
        );

        if (dbMatches.length > 0) {
          console.log(
            `[Guest] Found ${dbMatches.length} matches for "${nick_name}" in DB for tournament ${tournament.nakka_identifier}`
          );
          allMatches.push(...dbMatches);
        } else {
          console.log(
            `[Guest] Tournament ${tournament.nakka_identifier} exists in DB but no matches found for "${nick_name}"`
          );
        }
      } else {
        // Tournament either doesn't exist OR exists with status NULL/failed/in_progress
        // In all these cases, we need to scrape and save/upsert matches
        if (!tournamentInfo) {
          console.log(`[Guest] Tournament ${tournament.nakka_identifier} not in DB, scraping...`);
        } else {
          console.log(
            `[Guest] Tournament ${tournament.nakka_identifier} exists with status '${tournamentInfo.status}', need to save matches`
          );
        }

        // Scrape all matches for this tournament
        const scrapedMatches = await scrapeTournamentMatches(tournament.href);
        console.log(`[Guest] Found ${scrapedMatches.length} matches for tournament ${tournament.nakka_identifier}`);

        // Step 1: Ensure tournament exists in database
        let savedTournamentId: number;
        
        if (tournamentInfo) {
          // Tournament exists, use its ID
          savedTournamentId = tournamentInfo.tournamentId;
          console.log(
            `[Guest] Using existing tournament ${tournament.nakka_identifier} with ID ${savedTournamentId}`
          );
        } else {
          // Tournament doesn't exist, save it first
          const savedTournament = await saveTournament(supabase, tournament);
          if (!savedTournament) {
            console.error(`[Guest] Failed to save tournament ${tournament.nakka_identifier} to database`);
            continue; // Skip to next tournament
          }
          savedTournamentId = savedTournament.tournamentId;
          console.log(
            `[Guest] Saved new tournament ${tournament.nakka_identifier} with ID ${savedTournamentId}`
          );
        }

        // Step 2: Upsert matches to database
        console.log(`[Guest] Upserting matches for tournament ${tournament.nakka_identifier}...`);
        const upsertResult = await upsertTournamentMatches(
          supabase,
          savedTournamentId,
          tournament.nakka_identifier,
          scrapedMatches
        );

        // Step 3: Update tournament status based on upsert result
        let newStatus: string | null = null;
        if (upsertResult.allMatchesSaved) {
          newStatus = "matches_saved";
          console.log(
            `[Guest] All ${scrapedMatches.length} matches saved for tournament ${tournament.nakka_identifier}, updating status to matches_saved`
          );
        } else if (upsertResult.insertedCount > 0 || upsertResult.skippedCount > 0) {
          newStatus = "in_progress";
          console.log(
            `[Guest] Partial save for tournament ${tournament.nakka_identifier} (inserted: ${upsertResult.insertedCount}, skipped: ${upsertResult.skippedCount}), updating status to in_progress`
          );
        } else {
          console.log(
            `[Guest] No matches saved for tournament ${tournament.nakka_identifier}, keeping status as null`
          );
        }

        // Update tournament status if changed
        if (newStatus) {
          await supabase
            .schema("nakka")
            .from("tournaments")
            .update({ match_import_status: newStatus })
            .eq("tournament_id", savedTournamentId);
        }

        console.log(
          `[Guest] Tournament ${tournament.nakka_identifier} processing complete (ID: ${savedTournamentId}, status: ${newStatus})`
        );

        // Step 4: Process matches and collect only those that match the nickname
        for (const match of scrapedMatches) {
          // Stop if we've reached the limit
          if (allMatches.length >= MAX_MATCHES) {
            break;
          }

          const processedMatch = processMatchForNickname(match, normalizedNickname);

          // Only add matches where the nickname was found
          if (processedMatch.isChecked) {
            // Transform to NakkaPlayerMatchResult format
            const playerMatch = transformToPlayerMatchResult(tournament, match, processedMatch, savedTournamentId);
            allMatches.push(playerMatch);
          }
        }
      }

      console.log(
        `[Guest] Tournament ${tournament.nakka_identifier}: Total matches collected: ${allMatches.length}/${MAX_MATCHES}`
      );
    } catch (error) {
      console.error(`[Guest] Failed to process tournament ${tournament.nakka_identifier}:`, error);
      // Continue with next tournament on error
    }
  }

  console.log(
    `[Guest] Successfully collected ${allMatches.length} matching matches from ${scrapedTournaments.length} tournaments`
  );

  return {
    matches: allMatches,
    total_count: allMatches.length,
  };
}

/**
 * Gets tournament status from the database
 * @param supabase - Supabase client instance
 * @param nakka_identifier - Tournament identifier (e.g., "Nd6M_9511")
 * @returns Object with tournament_id and status if exists, null if not found
 */
async function getTournamentStatus(
  supabase: SupabaseClient,
  nakka_identifier: string
): Promise<{ tournamentId: number; status: string | null } | null> {
  try {
    const { data, error } = await supabase
      .schema("nakka")
      .from("tournaments")
      .select("tournament_id, match_import_status")
      .eq("nakka_identifier", nakka_identifier)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      tournamentId: data.tournament_id,
      status: data.match_import_status,
    };
  } catch (error) {
    console.error(`[DB] Error getting tournament status for ${nakka_identifier}:`, error);
    return null;
  }
}

/**
 * Retrieves tournament matches from database for a specific tournament and nickname
 * Uses database function for efficient querying with statistics included
 * @param supabase - Supabase client instance
 * @param nakka_identifier - Tournament identifier (e.g., "Nd6M_9511")
 * @param normalizedNickname - Normalized (lowercase, trimmed) nickname to search for
 * @param limit - Maximum number of matches to return
 * @returns Array of player match results with statistics
 */
async function getTournamentMatchesFromDB(
  supabase: SupabaseClient,
  nakka_identifier: string,
  normalizedNickname: string,
  limit: number
): Promise<NakkaPlayerMatchResult[]> {
  try {
    // Call the database function to get matches with statistics
    const { data, error } = await supabase.schema("nakka").rpc(
      "get_player_matches_by_tournament_and_nickname" as never,
      {
        tournament_nakka_identifier: nakka_identifier,
        search_nickname: normalizedNickname,
        match_limit: limit,
      } as never
    );

    if (error) {
      console.error(`[DB] Error retrieving matches for tournament ${nakka_identifier}:`, error);
      return [];
    }

    // Cast the data to our type
    const matches = (data || []) as unknown as NakkaPlayerMatchResult[];

    return matches;
  } catch (error) {
    console.error(`[DB] Exception retrieving matches for tournament ${nakka_identifier}:`, error);
    return [];
  }
}

/**
 * Transforms scraped match data to NakkaPlayerMatchResult format
 * Note: Statistics will be null since we haven't scraped the match details yet
 * @param tournament - Tournament scraped data
 * @param scrapedMatch - Original scraped match data
 * @param processedMatch - Processed match with player in correct position
 * @param tournamentId - Database tournament ID (if saved)
 * @returns Player match result in normalized format
 */
function transformToPlayerMatchResult(
  tournament: NakkaTournamentScrapedDTO,
  scrapedMatch: NakkaMatchScrapedDTO,
  processedMatch: NakkaTournamentMatchDTO,
  tournamentId: number | null
): NakkaPlayerMatchResult {
  return {
    // Tournament info
    tournament_id: tournamentId || 0, // Use 0 if not saved to DB
    nakka_tournament_identifier: tournament.nakka_identifier,
    tournament_name: tournament.tournament_name,
    tournament_date: tournament.tournament_date.toISOString(),
    tournament_href: tournament.href,

    // Match info
    tournament_match_id: 0, // Not available from scraping
    nakka_match_identifier: scrapedMatch.nakka_match_identifier,
    match_type: scrapedMatch.match_type,
    match_href: scrapedMatch.href,

    // Player-oriented match data
    player_name: processedMatch.player_name,
    player_code: processedMatch.player_code,
    opponent_name: processedMatch.opponent_name,
    opponent_code: processedMatch.opponent_code,

    // Player statistics (null since not scraped yet)
    average_score: null,
    first_nine_avg: null,
    checkout_percentage: null,
    score_60_count: null,
    score_100_count: null,
    score_140_count: null,
    score_180_count: null,
    high_finish: null,
    best_leg: null,
    worst_leg: null,
    player_score: null,
    opponent_score: null,

    // Opponent statistics (null since not scraped yet)
    opponent_average_score: null,
    opponent_first_nine_avg: null,
    opponent_checkout_percentage: null,
    opponent_score_60_count: null,
    opponent_score_100_count: null,
    opponent_score_140_count: null,
    opponent_score_180_count: null,
    opponent_high_finish: null,
    opponent_best_leg: null,
    opponent_worst_leg: null,

    // Metadata
    imported_at: new Date().toISOString(),
  };
}

/**
 * Processes a single match to check if it contains the player nickname
 * Reorders players so that the matched player is always player_name
 * @param match - Scraped match data
 * @param normalizedNickname - Normalized (lowercase, trimmed) nickname to search for
 * @returns Processed match DTO with isChecked flag and potentially reordered players
 */
function processMatchForNickname(match: NakkaMatchScrapedDTO, normalizedNickname: string): NakkaTournamentMatchDTO {
  // Check if either player name contains the nickname (case-insensitive)
  const firstPlayerMatches = match.first_player_name.toLowerCase().includes(normalizedNickname);
  const secondPlayerMatches = match.second_player_name.toLowerCase().includes(normalizedNickname);
  const isChecked = firstPlayerMatches || secondPlayerMatches;

  // Determine player order based on nickname match
  let player_name: string;
  let player_code: string;
  let opponent_name: string;
  let opponent_code: string;

  // If second player matches but first doesn't, swap them
  if (isChecked && secondPlayerMatches && !firstPlayerMatches) {
    player_name = match.second_player_name;
    player_code = match.second_player_code;
    opponent_name = match.first_player_name;
    opponent_code = match.first_player_code;
  } else {
    // Keep original order (first player is player_name)
    // This handles: both match, only first matches, or neither matches
    player_name = match.first_player_name;
    player_code = match.first_player_code;
    opponent_name = match.second_player_name;
    opponent_code = match.second_player_code;
  }

  return {
    nakka_match_identifier: match.nakka_match_identifier,
    match_type: match.match_type,
    player_name,
    player_code,
    opponent_name,
    opponent_code,
    href: match.href,
    isChecked,
  };
}

/**
 * Upserts tournament matches to the database using batch insert
 * Inserts new matches and skips existing ones (no updates)
 * Updates tournament status based on match count comparison
 * 
 * @param supabase - Supabase client instance
 * @param tournamentId - Database ID of the tournament
 * @param tournamentIdentifier - Nakka tournament identifier for logging
 * @param matches - Array of scraped match data
 * @returns Object with inserted count, skipped count, and whether all matches are saved
 */
async function upsertTournamentMatches(
  supabase: SupabaseClient,
  tournamentId: number,
  tournamentIdentifier: string,
  matches: NakkaMatchScrapedDTO[]
): Promise<{ insertedCount: number; skippedCount: number; allMatchesSaved: boolean }> {
  try {
    const scrapedCount = matches.length;
    console.log(`[Upsert] Starting batch upsert of ${scrapedCount} matches for tournament ${tournamentIdentifier}...`);

    // Prepare match records for batch upsert
    const matchRecords = matches.map((match) => ({
      tournament_id: tournamentId,
      nakka_match_identifier: match.nakka_match_identifier,
      match_type: match.match_type,
      first_player_name: match.first_player_name,
      first_player_code: match.first_player_code,
      second_player_name: match.second_player_name,
      second_player_code: match.second_player_code,
      href: match.href,
    }));

    // Perform batch upsert using ignoreDuplicates
    // This uses PostgreSQL's INSERT ... ON CONFLICT DO NOTHING
    // Inserts new matches, skips existing ones - all in ONE operation
    const { data: upsertedMatches, error: upsertError } = await supabase
      .schema("nakka")
      .from("tournament_matches" as unknown as "tournament_matches")
      .upsert(matchRecords, {
        onConflict: "tournament_id,nakka_match_identifier",
        ignoreDuplicates: true, // Skip duplicates instead of updating
      })
      .select("tournament_match_id");

    if (upsertError) {
      // Upsert failed
      console.error(`[Upsert] Batch upsert failed with error:`, upsertError);
      return { insertedCount: 0, skippedCount: 0, allMatchesSaved: false };
    }

    // Upsert succeeded - count what was actually inserted
    const insertedCount = upsertedMatches?.length || 0;
    console.log(`[Upsert] Batch upsert completed: ${insertedCount} new matches inserted`);

    // Count total matches now in database for this tournament
    const { count: totalCount, error: countError } = await supabase
      .schema("nakka")
      .from("tournament_matches" as unknown as "tournament_matches")
      .select("tournament_match_id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if (countError) {
      console.error(`[Upsert] Error counting total matches:`, countError);
      return { insertedCount, skippedCount: 0, allMatchesSaved: false };
    }

    const existingCount = totalCount || 0;
    const skippedCount = existingCount - insertedCount;
    
    console.log(
      `[Upsert] Total in DB: ${existingCount}, Inserted: ${insertedCount}, Skipped: ${skippedCount}, Scraped: ${scrapedCount}`
    );
    
    // Check if all scraped matches are now in database
    const allMatchesSaved = existingCount === scrapedCount;
    
    return { insertedCount, skippedCount, allMatchesSaved };
  } catch (error) {
    console.error(`[Upsert] Exception during upsert for tournament ${tournamentIdentifier}:`, error);
    return { insertedCount: 0, skippedCount: 0, allMatchesSaved: false };
  }
}

/**
 * Saves a tournament to the database or retrieves existing tournament
 * @param supabase - Supabase client instance
 * @param tournament - Tournament data from scraping
 * @returns Object with tournament_id and match_import_status, or null if failed
 */
async function saveTournament(
  supabase: SupabaseClient,
  tournament: NakkaTournamentScrapedDTO
): Promise<{ tournamentId: number; status: string | null } | null> {
  try {
    // Check if tournament already exists
    const { data: existingTournament } = await supabase
      .schema("nakka")
      .from("tournaments")
      .select("tournament_id, match_import_status")
      .eq("nakka_identifier", tournament.nakka_identifier)
      .single();

    if (existingTournament) {
      // Tournament already exists
      console.log(
        `Tournament ${tournament.nakka_identifier} already exists with ID ${existingTournament.tournament_id}, status: ${existingTournament.match_import_status}`
      );
      return {
        tournamentId: existingTournament.tournament_id,
        status: existingTournament.match_import_status,
      };
    }

    // Insert new tournament with status NULL
    const { data: insertedTournament, error: tournamentError } = await supabase
      .schema("nakka")
      .from("tournaments")
      .insert({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        href: tournament.href,
        match_import_status: null, // Set status as NULL initially
      })
      .select("tournament_id")
      .single();

    if (tournamentError || !insertedTournament) {
      console.error(`Failed to insert tournament ${tournament.nakka_identifier}:`, tournamentError);
      return null;
    }

    console.log(`Inserted tournament ${tournament.nakka_identifier} with ID ${insertedTournament.tournament_id}`);
    return {
      tournamentId: insertedTournament.tournament_id,
      status: null,
    };
  } catch (error) {
    console.error(`Error saving tournament ${tournament.nakka_identifier}:`, error);
    return null;
  }
}

/**
 * Retrieves top 30 matches for a player from the database by nickname
 * Matches are ordered by tournament_date DESC
 * The matched player is always returned in the "player" position
 *
 * Includes player statistics (average_score, best_leg, etc.) when available
 * from the nakka.tournament_match_player_results table.
 * Statistics will be null if not yet scraped/imported for that match.
 *
 * This function is optimized for Guest view and efficiently retrieves data
 * without requiring web scraping (uses pre-imported database records).
 *
 * @param supabase - Supabase client instance
 * @param nick_name - Player nickname to search for (case-insensitive)
 * @param limit - Maximum number of matches to return (default: 30)
 * @returns Object containing array of player matches with statistics and total count
 */
export async function getPlayerMatchesByNickname(
  supabase: SupabaseClient,
  nick_name: string,
  limit = 30
): Promise<GetPlayerMatchesResponseDTO> {
  try {
    console.log(`[DB] Retrieving matches for nickname: "${nick_name}", limit: ${limit}`);

    // Call the database function
    // Note: Type assertion needed as database types may not include custom functions yet
    const { data, error } = await supabase.schema("nakka").rpc(
      "get_player_matches_by_nickname" as never,
      {
        search_nickname: nick_name,
        match_limit: limit,
      } as never
    );

    if (error) {
      console.error(`[DB] Error retrieving matches for "${nick_name}":`, error);
      throw new Error(`Failed to retrieve player matches: ${error.message}`);
    }

    // Cast the data to our type
    const matches = (data || []) as unknown as NakkaPlayerMatchResult[];

    console.log(`[DB] Retrieved ${matches.length} matches for "${nick_name}"`);

    return {
      matches,
      total_count: matches.length,
    };
  } catch (error) {
    console.error(`[DB] Exception in getPlayerMatchesByNickname:`, error);
    throw error;
  }
}

/**
 * Fetches and imports player results for a specific match
 * This function scrapes the match page, imports player statistics to the database,
 * and returns the updated match data with all statistics included.
 *
 * The match status will be updated to:
 * - "in_progress" while fetching
 * - "completed" if successful
 * - "failed" if an error occurs
 *
 * @param supabase - Supabase client instance
 * @param tournament_match_id - Database ID of the tournament match
 * @param nakka_match_identifier - Nakka match identifier (e.g., "t_Nd6M_9511_rr_2_3Tm2")
 * @param match_href - Full URL to the match page on nakka.pl
 * @param nick_name - Player nickname to retrieve updated match data for
 * @returns Updated match data with player statistics, or null if match not found after update
 * @throws Error if scraping or import fails
 */
export async function fetchMatchResults(
  supabase: SupabaseClient,
  tournament_match_id: number,
  nakka_match_identifier: string,
  match_href: string,
  nick_name: string
): Promise<NakkaPlayerMatchResult | null> {
  try {
    console.log(`[Fetch Results] Starting fetch for match: ${nakka_match_identifier}`);

    // Step 1: Update match status to in_progress
    const { error: statusUpdateError } = await supabase
      .schema("nakka")
      .from("tournament_matches" as unknown as "tournament_matches")
      .update({ match_result_status: "in_progress" })
      .eq("tournament_match_id", tournament_match_id);

    if (statusUpdateError) {
      console.error(`[Fetch Results] Failed to update status to in_progress:`, statusUpdateError);
      throw new Error(`Failed to update match status: ${statusUpdateError.message}`);
    }

    console.log(`[Fetch Results] Match status updated to in_progress`);

    // Step 2: Scrape player results from match page
    console.log(`[Fetch Results] Scraping player results from: ${match_href}`);
    const playerResults = await scrapeMatchPlayerResults(match_href, nakka_match_identifier);
    console.log(`[Fetch Results] Successfully scraped ${playerResults.length} player results`);

    // Step 3: Import player results to database
    console.log(`[Fetch Results] Importing player results to database...`);
    const importResult = await importMatchPlayerResults(supabase, tournament_match_id, playerResults);

    // Step 4: Update match status based on import result
    if (importResult.failed > 0 || importResult.inserted === 0) {
      // Import failed
      const errorMessage = importResult.errors?.length
        ? JSON.stringify(importResult.errors)
        : "Failed to import player results";

      await supabase
        .schema("nakka")
        .from("tournament_matches" as unknown as "tournament_matches")
        .update({
          match_result_status: "failed",
          match_result_error: errorMessage,
        })
        .eq("tournament_match_id", tournament_match_id);

      console.error(`[Fetch Results] Import failed for match ${nakka_match_identifier}:`, errorMessage);
      throw new Error(`Failed to import player results: ${errorMessage}`);
    }

    // Import successful
    await supabase
      .schema("nakka")
      .from("tournament_matches" as unknown as "tournament_matches")
      .update({
        match_result_status: "completed",
        match_result_error: null,
      })
      .eq("tournament_match_id", tournament_match_id);

    console.log(
      `[Fetch Results] Match ${nakka_match_identifier} completed successfully. Inserted: ${importResult.inserted}, Skipped: ${importResult.skipped}`
    );

    // Step 5: Retrieve and return updated match data with statistics
    console.log(`[Fetch Results] Retrieving updated match data for nickname: "${nick_name}"`);
    const updatedMatch = await getMatchByIdAndNickname(supabase, tournament_match_id, nick_name);

    if (!updatedMatch) {
      console.warn(`[Fetch Results] Match ${nakka_match_identifier} not found after update`);
      return null;
    }

    console.log(`[Fetch Results] Successfully retrieved updated match data`);
    return updatedMatch;
  } catch (error) {
    console.error(`[Fetch Results] Error fetching results for match ${nakka_match_identifier}:`, error);

    // Try to update status to failed
    try {
      await supabase
        .schema("nakka")
        .from("tournament_matches" as unknown as "tournament_matches")
        .update({
          match_result_status: "failed",
          match_result_error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("tournament_match_id", tournament_match_id);
    } catch (updateError) {
      console.error(`[Fetch Results] Failed to update status to failed:`, updateError);
    }

    throw error;
  }
}

/**
 * Retrieves a single match by tournament_match_id with player statistics
 * The matched player (by nickname) is returned in the "player" position
 *
 * @param supabase - Supabase client instance
 * @param tournament_match_id - Database ID of the tournament match
 * @param nick_name - Player nickname to search for (case-insensitive)
 * @returns Player match result with statistics, or null if not found
 */
async function getMatchByIdAndNickname(
  supabase: SupabaseClient,
  tournament_match_id: number,
  nick_name: string
): Promise<NakkaPlayerMatchResult | null> {
  try {
    // Call the database function to get the match with statistics
    const { data, error } = await supabase.schema("nakka").rpc(
      "get_player_match_by_id_and_nickname" as never,
      {
        match_id: tournament_match_id,
        search_nickname: nick_name,
      } as never
    );

    if (error) {
      console.error(`[DB] Error retrieving match ${tournament_match_id}:`, error);
      return null;
    }

    // The function returns a single match or null
    const match = data as unknown as NakkaPlayerMatchResult | null;

    return match;
  } catch (error) {
    console.error(`[DB] Exception retrieving match ${tournament_match_id}:`, error);
    return null;
  }
}
