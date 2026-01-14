import type { SupabaseClient } from "@/db/supabase.client";
import { TOPDARTER_API_BASE_URL } from "../constants/topdarter.constants";
import type {
  NakkaTournamentScrapedDTO,
  ImportNakkaTournamentsResponseDTO,
  NakkaMatchScrapedDTO,
  ImportMatchesResponseDTO,
  NakkaMatchPlayerResultScrapedDTO,
  ImportPlayerResultsResponseDTO,
} from "@/types";

// Scraper API configuration
const TOPDARTER_API_URL = TOPDARTER_API_BASE_URL || "https://localhost:3001";
// Support both Astro (import.meta.env) and Node.js (process.env) environments
const TOPDARTER_API_KEY =
  typeof import.meta?.env !== "undefined" ? import.meta.env.TOPDARTER_API_KEY : process.env.TOPDARTER_API_KEY;

/**
 * Scrapes tournaments from Nakka by keyword using external Vercel scraper API
 * @param keyword - Search keyword (e.g., "agawa")
 * @returns Array of scraped tournament DTOs
 */
export async function scrapeTournamentsByKeyword(keyword: string): Promise<NakkaTournamentScrapedDTO[]> {
  console.log(`Calling external scraper API for keyword: "${keyword}"`);
  console.log(`Scraper API URL: ${TOPDARTER_API_URL}/api/scrape-tournaments`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (TOPDARTER_API_KEY) {
      headers["topdarter-api-key"] = TOPDARTER_API_KEY;
    }

    const response = await fetch(`${TOPDARTER_API_URL}/api/scrape-tournaments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Scraping failed");
    }

    console.log(`Successfully scraped ${result.count} tournaments from external API`);

    // Convert date strings back to Date objects
    const tournaments = result.data.map((tournament: NakkaTournamentScrapedDTO) => ({
      ...tournament,
      tournament_date: new Date(tournament.tournament_date),
    }));

    return tournaments;
  } catch (error) {
    console.error("Error calling scraper API:", error);
    throw error;
  }
}

/**
 * Persists scraped tournaments to database (insert-only, skip existing)
 * @param supabase - Supabase client instance
 * @param tournaments - Array of scraped tournaments
 * @returns Import statistics
 */
export async function importTournaments(
  supabase: SupabaseClient,
  tournaments: NakkaTournamentScrapedDTO[]
): Promise<ImportNakkaTournamentsResponseDTO> {
  const result: ImportNakkaTournamentsResponseDTO = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    total_processed: tournaments.length,
    tournaments: [],
  };

  for (const tournament of tournaments) {
    // Check if exists
    const { data: existing } = await supabase
      .schema("nakka")
      .from("tournaments")
      .select("tournament_id")
      .eq("nakka_identifier", tournament.nakka_identifier)
      .single();

    if (existing) {
      // Tournament already exists - skip it
      result.skipped++;
      result.tournaments.push({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        action: "skipped",
      });
    } else {
      // Insert new record
      const { error } = await supabase.schema("nakka").from("tournaments").insert({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        href: tournament.href,
        match_import_status: null, // Will be set when match import starts
      });

      if (error) {
        console.error("Failed to insert tournament:", error);
        result.skipped++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: "skipped",
        });
      } else {
        result.inserted++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: "inserted",
        });
      }
    }
  }

  return result;
}

/**
 * Main orchestration function
 * @param supabase - Supabase client instance
 * @param keyword - Search keyword
 * @returns Import statistics
 */
export async function syncTournamentsByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<ImportNakkaTournamentsResponseDTO> {
  // Step 1: Scrape tournaments
  const scraped = await scrapeTournamentsByKeyword(keyword);

  // Step 2: Import to database
  const result = await importTournaments(supabase, scraped);

  // const result: ImportNakkaTournamentsResponseDTO = {
  //   inserted: 1,
  //   updated: 0,
  //   skipped: 0,
  //   total_processed: 1,
  //   tournaments: [{
  //     nakka_identifier: 't_0dfH_3607',
  //     tournament_name: 'Turniej Świąteczny Agawa 20.12.2025',
  //     tournament_date: '2025-12-20T19:00:00.000Z',
  //     action: 'inserted'
  //   }],
  // };

  // Step 3: For each tournament, scrape matches if needed (new or incomplete)
  const matchStats: Record<string, ImportMatchesResponseDTO> = {};

  console.log(`Processing matches for ${result.tournaments.length} tournaments...`);

  for (const tournament of result.tournaments) {
    try {
      console.log(`Checking match status for tournament: ${tournament.nakka_identifier}`);

      // Get tournament_id and match_import_status from database
      const { data: dbTournament, error: fetchError } = await supabase
        .schema("nakka")
        .from("tournaments")
        .select("tournament_id, href, match_import_status")
        .eq("nakka_identifier", tournament.nakka_identifier)
        .single();

      if (fetchError || !dbTournament) {
        console.error(`Failed to fetch tournament ${tournament.nakka_identifier}:`, fetchError);
        continue;
      }

      // Skip if match import is already completed
      if (dbTournament.match_import_status === "completed") {
        console.log(`Skipping ${tournament.nakka_identifier}: matches already imported`);
        continue;
      }

      console.log(
        `Processing tournament: ${tournament.nakka_identifier} (status: ${dbTournament.match_import_status || "null"})`
      );

      // Check if matches already exist for this tournament
      const { data: existingMatches, error: matchCheckError } = await supabase
        .schema("nakka")
        .from("tournament_matches" as unknown as "tournament_matches")
        .select("tournament_match_id, nakka_match_identifier, href, match_result_status")
        .eq("tournament_id", dbTournament.tournament_id);

      if (matchCheckError) {
        console.error(`Failed to check existing matches for ${tournament.nakka_identifier}:`, matchCheckError);
        continue;
      }

      interface TournamentMatchWithStatus {
        tournament_match_id: number;
        nakka_match_identifier: string;
        href: string;
        match_result_status: "in_progress" | "completed" | "failed" | null;
      }

      const matches = (existingMatches || []) as unknown as TournamentMatchWithStatus[];

      // If no matches exist, scrape them from Nakka first
      if (matches.length === 0) {
        console.log(`No matches found in database for ${tournament.nakka_identifier}, scraping from Nakka...`);

        // Update status to in_progress
        await supabase
          .schema("nakka")
          .from("tournaments")
          .update({ match_import_status: "in_progress" })
          .eq("tournament_id", dbTournament.tournament_id);

        // Scrape matches
        const scrapedMatches = await scrapeTournamentMatches(dbTournament.href);
        const matchResult = await importMatches(supabase, dbTournament.tournament_id, scrapedMatches);

        matchStats[tournament.nakka_identifier] = matchResult;

        // Check if match scraping/import failed completely
        if (
          matchResult.failed > 0 ||
          matchResult.total_processed === 0 ||
          (matchResult.inserted === 0 && matchResult.skipped === 0)
        ) {
          const errorMessage = matchResult.errors?.length
            ? JSON.stringify(matchResult.errors)
            : "Failed to scrape or import matches";

          await supabase
            .schema("nakka")
            .from("tournaments")
            .update({
              match_import_status: "failed",
              match_import_error: errorMessage,
            })
            .eq("tournament_id", dbTournament.tournament_id);

          console.log(`Match import failed for ${tournament.nakka_identifier}: ${errorMessage}`);
          continue; // Skip to next tournament
        }

        console.log(
          `Scraped ${matchResult.total_processed} matches for ${tournament.nakka_identifier} (inserted: ${matchResult.inserted}, skipped: ${matchResult.skipped})`
        );

        // Fetch the newly inserted matches
        const { data: newMatches, error: newMatchError } = await supabase
          .schema("nakka")
          .from("tournament_matches" as unknown as "tournament_matches")
          .select("tournament_match_id, nakka_match_identifier, href, match_result_status")
          .eq("tournament_id", dbTournament.tournament_id);

        if (newMatchError || !newMatches) {
          console.error(`Failed to fetch newly inserted matches:`, newMatchError);
          continue;
        }

        matches.length = 0;
        matches.push(...(newMatches as unknown as TournamentMatchWithStatus[]));
      }

      // Step 4: Process player results for uncompleted matches only
      // Filter out completed matches
      const uncompletedMatches = matches.filter((m) => m.match_result_status !== "completed");

      if (uncompletedMatches.length === 0) {
        console.log(`All ${matches.length} matches already completed for ${tournament.nakka_identifier}`);
        // Track that we checked this tournament but everything was already done
        matchStats[tournament.nakka_identifier] = {
          total_processed: 0,
          inserted: 0,
          skipped: matches.length,
          failed: 0,
        };
        continue;
      }

      console.log(
        `Processing player results for ${uncompletedMatches.length} uncompleted matches (${matches.length - uncompletedMatches.length} already completed)...`
      );

      try {
        let anyMatchFailed = false;
        let allMatchesCompleted = true;

        for (const match of uncompletedMatches) {
          try {
            console.log(`Processing player results for match: ${match.nakka_match_identifier}`);

            // Update match status to in_progress
            await supabase
              .schema("nakka")
              .from("tournament_matches" as unknown as "tournament_matches")
              .update({ match_result_status: "in_progress" })
              .eq("tournament_match_id", match.tournament_match_id);

            // Scrape player results
            const playerResults = await scrapeMatchPlayerResults(match.href, match.nakka_match_identifier);

            // Import player results
            const playerResultsImport = await importMatchPlayerResults(
              supabase,
              match.tournament_match_id,
              playerResults
            );

            // Check if import was successful
            if (playerResultsImport.failed > 0 || playerResultsImport.inserted === 0) {
              anyMatchFailed = true;
              allMatchesCompleted = false;

              await supabase
                .schema("nakka")
                .from("tournament_matches" as unknown as "tournament_matches")
                .update({
                  match_result_status: "failed",
                  match_result_error: playerResultsImport.errors?.length
                    ? JSON.stringify(playerResultsImport.errors)
                    : "Failed to import player results",
                })
                .eq("tournament_match_id", match.tournament_match_id);

              console.log(`Player results import failed for match ${match.nakka_match_identifier}`);
            } else {
              // Success
              await supabase
                .schema("nakka")
                .from("tournament_matches" as unknown as "tournament_matches")
                .update({
                  match_result_status: "completed",
                  match_result_error: null,
                })
                .eq("tournament_match_id", match.tournament_match_id);

              console.log(`Player results import completed for match ${match.nakka_match_identifier}`);
            }
          } catch (matchError) {
            anyMatchFailed = true;
            allMatchesCompleted = false;

            console.error(`Failed to process player results for match ${match.nakka_match_identifier}:`, matchError);

            await supabase
              .schema("nakka")
              .from("tournament_matches" as unknown as "tournament_matches")
              .update({
                match_result_status: "failed",
                match_result_error: matchError instanceof Error ? matchError.message : "Unknown error",
              })
              .eq("tournament_match_id", match.tournament_match_id);
          }
        }

        // Tournament status will be auto-updated by trigger based on match statuses
        // No need to manually update tournament status here
        if (anyMatchFailed) {
          console.log(`Some matches failed during player results import for ${tournament.nakka_identifier}`);
        } else if (allMatchesCompleted) {
          console.log(`All player results processed for ${tournament.nakka_identifier}`);
        }
      } catch (playerResultsError) {
        console.error(
          `Failed to process player results for tournament ${tournament.nakka_identifier}:`,
          playerResultsError
        );
        // Individual match failures are already tracked in match_result_status
        // Tournament status will be auto-calculated by trigger based on match statuses
      }
    } catch (error) {
      console.error(`Failed to import matches for ${tournament.nakka_identifier}:`, error);

      // Try to update status to failed
      try {
        const { data: dbTournament } = await supabase
          .schema("nakka")
          .from("tournaments")
          .select("tournament_id")
          .eq("nakka_identifier", tournament.nakka_identifier)
          .single();

        if (dbTournament) {
          await supabase
            .schema("nakka")
            .from("tournaments")
            .update({
              match_import_status: "failed",
              match_import_error: error instanceof Error ? error.message : "Unknown error",
            })
            .eq("tournament_id", dbTournament.tournament_id);
        }
      } catch (updateError) {
        console.error("Failed to update tournament status:", updateError);
      }
    }
  }

  return {
    ...result,
    match_stats: matchStats,
  };
}

/**
 * Scrapes matches from a tournament using external Vercel scraper API
 * @param tournamentHref - Full URL to tournament page
 * @returns Array of scraped match DTOs
 */
export async function scrapeTournamentMatches(tournamentHref: string): Promise<NakkaMatchScrapedDTO[]> {
  console.log(`Calling external scraper API for matches from: ${tournamentHref}`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (TOPDARTER_API_KEY) {
      headers["topdarter-api-key"] = TOPDARTER_API_KEY;
    }

    const response = await fetch(`${TOPDARTER_API_URL}/api/scrape-matches`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tournamentHref }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Match scraping failed");
    }

    console.log(`Successfully scraped ${result.count} matches from external API`);
    return result.data;
  } catch (error) {
    console.error("Error calling scraper API for matches:", error);
    throw error;
  }
}

/**
 * Imports matches to database using batch insert (skip existing based on unique constraint)
 * @param supabase - Supabase client instance
 * @param tournamentId - Tournament ID from database
 * @param matches - Array of scraped match DTOs
 * @returns Import statistics
 */
export async function importMatches(
  supabase: SupabaseClient,
  tournamentId: number,
  matches: NakkaMatchScrapedDTO[]
): Promise<ImportMatchesResponseDTO> {
  const result: ImportMatchesResponseDTO = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    total_processed: matches.length,
    errors: [],
  };

  console.log(`Batch importing ${matches.length} matches for tournament ${tournamentId}...`);

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
    result.failed = matches.length;
    result.errors?.push({
      identifier: "batch_upsert",
      error: upsertError.message,
    });
    console.error(`Batch upsert failed:`, upsertError.message);
  } else {
    // Success - count what was actually inserted
    result.inserted = upsertedMatches?.length || 0;

    // Count total to determine how many were skipped
    const { count: totalCount } = await supabase
      .schema("nakka")
      .from("tournament_matches" as unknown as "tournament_matches")
      .select("tournament_match_id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    const existingCount = totalCount || 0;
    result.skipped = existingCount - result.inserted;

    console.log(
      `Batch upsert completed: ${result.inserted} inserted, ${result.skipped} skipped (${existingCount} total in DB)`
    );
  }

  console.log(`Match import complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

/**
 * Scrapes player-level statistics from a match page using external Vercel scraper API
 * @param matchHref - Full URL to match page
 * @param nakkaMatchIdentifier - Match identifier for constructing player identifiers
 * @returns Array of player results (2 items, one per player)
 */
export async function scrapeMatchPlayerResults(
  matchHref: string,
  nakkaMatchIdentifier: string
): Promise<NakkaMatchPlayerResultScrapedDTO[]> {
  console.log(`Calling external scraper API for player results from: ${matchHref}`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (TOPDARTER_API_KEY) {
      headers["topdarter-api-key"] = TOPDARTER_API_KEY;
    }

    const response = await fetch(`${TOPDARTER_API_URL}/api/scrape-player-results`, {
      method: "POST",
      headers,
      body: JSON.stringify({ matchHref, nakkaMatchIdentifier }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Player results scraping failed");
    }

    console.log(`Successfully scraped ${result.count} player results from external API`);
    return result.data;
  } catch (error) {
    console.error("Error calling scraper API for player results:", error);
    throw error;
  }
}

/**
 * Imports player results to database (upsert: insert if not exists, update if exists)
 * @param supabase - Supabase client instance
 * @param tournamentMatchId - Tournament match ID from database
 * @param playerResults - Array of scraped player results (should be 2 items)
 * @returns Import statistics
 */
export async function importMatchPlayerResults(
  supabase: SupabaseClient,
  tournamentMatchId: number,
  playerResults: NakkaMatchPlayerResultScrapedDTO[]
): Promise<ImportPlayerResultsResponseDTO> {
  const result: ImportPlayerResultsResponseDTO = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    total_processed: playerResults.length,
    errors: [],
  };

  console.log(`Importing ${playerResults.length} player results for match ${tournamentMatchId}...`);

  for (const playerResult of playerResults) {
    try {
      // Use upsert to insert or update based on unique constraint
      const { error } = await supabase
        .schema("nakka")
        .from("tournament_match_player_results" as unknown as "tournament_match_player_results")
        .upsert(
          {
            tournament_match_id: tournamentMatchId,
            nakka_match_player_identifier: playerResult.nakka_match_player_identifier,
            average_score: playerResult.average_score,
            first_nine_avg: playerResult.first_nine_avg,
            checkout_percentage: playerResult.checkout_percentage,
            score_60_count: playerResult.score_60_count,
            score_100_count: playerResult.score_100_count,
            score_140_count: playerResult.score_140_count,
            score_180_count: playerResult.score_180_count,
            high_finish: playerResult.high_finish,
            best_leg: playerResult.best_leg,
            worst_leg: playerResult.worst_leg,
            player_score: playerResult.player_score,
            opponent_score: playerResult.opponent_score,
          },
          {
            onConflict: "tournament_match_id,nakka_match_player_identifier",
          }
        );

      if (error) {
        result.failed++;
        result.errors?.push({
          identifier: playerResult.nakka_match_player_identifier,
          error: error.message,
        });
        console.error(`Failed to upsert player result ${playerResult.nakka_match_player_identifier}:`, error.message);
      } else {
        result.inserted++;
        console.log(`Upserted player result: ${playerResult.nakka_match_player_identifier}`);
      }
    } catch (error) {
      result.failed++;
      result.errors?.push({
        identifier: playerResult.nakka_match_player_identifier,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error(`Exception upserting player result ${playerResult.nakka_match_player_identifier}:`, error);
    }
  }

  console.log(
    `Player results import complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed`
  );
  return result;
}
