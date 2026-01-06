import type {
  RetrieveTournamentsMatchesResponseDTO,
  NakkaTournamentWithMatchesDTO,
  NakkaTournamentMatchDTO,
  NakkaMatchScrapedDTO,
  NakkaTournamentScrapedDTO,
  GetPlayerMatchesResponseDTO,
  NakkaPlayerMatchResult,
} from "@/types";
import { scrapeTournamentsByKeyword, scrapeTournamentMatches } from "./nakka.service";
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
        `Tournament ${tournament.nakka_identifier}: ${processedMatches.filter(m => m.isChecked).length}/${processedMatches.length} matches checked for "${nick_name}"`
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
 * @param supabase - Supabase client instance for database operations
 * @param tournament_keyword - Search keyword for tournaments (e.g., "agawa")
 * @param nick_name - Player nickname to filter matches (e.g., "Mirek")
 * @returns Object containing tournaments with matches (limited to 30 matches where nickname is found)
 */
export async function retrieveTournamentsMatchesByKeywordAndNickNameForGuest(
  supabase: SupabaseClient,
  tournament_keyword: string,
  nick_name: string
): Promise<RetrieveTournamentsMatchesResponseDTO> {
  console.log(`[Guest] Retrieving tournaments for keyword: "${tournament_keyword}", nickname: "${nick_name}"`);

  // Step 1: Scrape all tournaments matching the keyword
  const scrapedTournaments = await scrapeTournamentsByKeyword(tournament_keyword);
  console.log(`[Guest] Found ${scrapedTournaments.length} tournaments`);

  const tournaments: NakkaTournamentWithMatchesDTO[] = [];
  const normalizedNickname = nick_name.toLowerCase().trim();
  let totalMatchesFound = 0;
  const MAX_MATCHES = 30;

  // Step 2: For each tournament, scrape matches and collect up to 30 matching matches
  for (const tournament of scrapedTournaments) {
    // Break if we already have 30 matches
    if (totalMatchesFound >= MAX_MATCHES) {
      console.log(`[Guest] Reached limit of ${MAX_MATCHES} matches, stopping tournament processing`);
      break;
    }

    try {
      console.log(`[Guest] Processing tournament: ${tournament.tournament_name} (${tournament.nakka_identifier})`);

      // Scrape all matches for this tournament
      const scrapedMatches = await scrapeTournamentMatches(tournament.href);
      console.log(`[Guest] Found ${scrapedMatches.length} matches for tournament ${tournament.nakka_identifier}`);

      // Save tournament and matches to database
      const savedTournamentId = await saveTournamentWithMatches(supabase, tournament, scrapedMatches);
      if (savedTournamentId) {
        console.log(`[Guest] Saved tournament ${tournament.nakka_identifier} to database with ID ${savedTournamentId}`);
      } else {
        console.log(`[Guest] Failed to save tournament ${tournament.nakka_identifier} to database`);
      }

      // Process matches and collect only those that match the nickname
      const processedMatches: NakkaTournamentMatchDTO[] = [];
      
      for (const match of scrapedMatches) {
        // Stop if we've reached the limit
        if (totalMatchesFound >= MAX_MATCHES) {
          break;
        }

        const processedMatch = processMatchForNickname(match, normalizedNickname);
        
        // Only add matches where the nickname was found
        if (processedMatch.isChecked) {
          processedMatches.push(processedMatch);
          totalMatchesFound++;
        }
      }

      // Only add tournament if it has matching matches
      if (processedMatches.length > 0) {
        tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_date: tournament.tournament_date.toISOString(),
          tournament_name: tournament.tournament_name,
          href: tournament.href,
          tournament_matches: processedMatches,
        });

        console.log(
          `[Guest] Tournament ${tournament.nakka_identifier}: Added ${processedMatches.length} matches (Total: ${totalMatchesFound}/${MAX_MATCHES})`
        );
      }
    } catch (error) {
      console.error(`[Guest] Failed to process tournament ${tournament.nakka_identifier}:`, error);
      // Continue with next tournament on error
    }
  }

  console.log(`[Guest] Successfully processed ${tournaments.length} tournaments with ${totalMatchesFound} matching matches`);

  return {
    tournaments,
  };
}

/**
 * Processes a single match to check if it contains the player nickname
 * Reorders players so that the matched player is always player_name
 * @param match - Scraped match data
 * @param normalizedNickname - Normalized (lowercase, trimmed) nickname to search for
 * @returns Processed match DTO with isChecked flag and potentially reordered players
 */
function processMatchForNickname(
  match: NakkaMatchScrapedDTO,
  normalizedNickname: string
): NakkaTournamentMatchDTO {
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
 * Saves a tournament and its matches to the database
 * Tournament status is set to NULL (not started)
 * @param supabase - Supabase client instance
 * @param tournament - Tournament data from scraping
 * @param matches - Match data from scraping
 * @returns The tournament_id from the database, or null if failed
 */
async function saveTournamentWithMatches(
  supabase: SupabaseClient,
  tournament: NakkaTournamentScrapedDTO,
  matches: NakkaMatchScrapedDTO[]
): Promise<number | null> {
  try {
    // Step 1: Check if tournament already exists
    const { data: existingTournament } = await supabase
      .schema("nakka")
      .from("tournaments")
      .select("tournament_id")
      .eq("nakka_identifier", tournament.nakka_identifier)
      .single();

    let tournamentId: number;

    if (existingTournament) {
      // Tournament already exists, use its ID
      tournamentId = existingTournament.tournament_id;
      console.log(`Tournament ${tournament.nakka_identifier} already exists with ID ${tournamentId}`);
    } else {
      // Step 2: Insert tournament with status NULL
      const { data: insertedTournament, error: tournamentError } = await supabase
        .schema("nakka")
        .from("tournaments")
        .insert({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          href: tournament.href,
          match_import_status: null, // Set status as NULL
        })
        .select("tournament_id")
        .single();

      if (tournamentError || !insertedTournament) {
        console.error(`Failed to insert tournament ${tournament.nakka_identifier}:`, tournamentError);
        return null;
      }

      tournamentId = insertedTournament.tournament_id;
      console.log(`Inserted tournament ${tournament.nakka_identifier} with ID ${tournamentId}`);
    }

    // Step 3: Insert matches for this tournament
    let insertedCount = 0;
    let skippedCount = 0;

    for (const match of matches) {
      const { error: matchError } = await supabase
        .schema("nakka")
        .from("tournament_matches" as unknown as "tournament_matches")
        .insert({
          tournament_id: tournamentId,
          nakka_match_identifier: match.nakka_match_identifier,
          match_type: match.match_type,
          first_player_name: match.first_player_name,
          first_player_code: match.first_player_code,
          second_player_name: match.second_player_name,
          second_player_code: match.second_player_code,
          href: match.href,
        });

      if (matchError) {
        if (matchError.code === "23505") {
          // Unique constraint violation - match already exists
          skippedCount++;
        } else {
          console.error(`Failed to insert match ${match.nakka_match_identifier}:`, matchError);
        }
      } else {
        insertedCount++;
      }
    }

    console.log(
      `Saved ${insertedCount} matches for tournament ${tournament.nakka_identifier} (skipped ${skippedCount} duplicates)`
    );

    return tournamentId;
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
  limit: number = 30
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

